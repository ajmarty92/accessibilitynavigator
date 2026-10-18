import { calculateComplianceScore } from './compliance-score.ts'
import { DOCUMENT_CHECK_DEFINITIONS } from './document-checks.ts'
import type { DocumentCheckId } from './document-checks.ts'

export interface DocumentCheckViolation {
  checkId: DocumentCheckId
  description: string
  help: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  wcagReference: string
  elementCount: number
  nodes: unknown[]
}

export interface DocumentFacts {
  pageCount: number
  isTagged: boolean
  documentTitle: string | null
  documentLanguage: string | null
  accessibilityExtractionBlocked: boolean
  imagesWithoutAlt: { page: number }[]
  headings: { level: number; page: number }[]
  tablesWithoutHeaderCount: number
  formFieldsWithoutDescriptionCount: number
  hasNoTextLayer: boolean
  hasOutline: boolean
}

const LONG_DOCUMENT_PAGE_THRESHOLD = 20

// Pure decision logic: given the facts gathered from a PDF (see
// analyzePdfAccessibility below), decide which checks fail. Kept separate
// from the pdfjs I/O so it's unit-testable with synthetic facts instead of
// real PDF fixtures — the same split run-scan.ts/scanner.ts use for the
// website scanner.
export function buildDocumentViolations(facts: DocumentFacts): DocumentCheckViolation[] {
  const violations: DocumentCheckViolation[] = []

  const add = (checkId: DocumentCheckId, elementCount: number, nodes: unknown[] = []) => {
    const def = DOCUMENT_CHECK_DEFINITIONS[checkId]
    violations.push({
      checkId,
      description: def.title,
      help: def.help,
      impact: def.impact,
      wcagReference: def.wcagReference,
      elementCount,
      nodes,
    })
  }

  if (!facts.isTagged) {
    add('untagged-document', 1)
  }
  if (!facts.documentTitle) {
    add('missing-document-title', 1)
  }
  if (!facts.documentLanguage) {
    add('missing-document-language', 1)
  }
  if (facts.accessibilityExtractionBlocked) {
    add('accessibility-extraction-blocked', 1)
  }
  if (facts.imagesWithoutAlt.length > 0) {
    add('images-missing-alt-text', facts.imagesWithoutAlt.length, facts.imagesWithoutAlt)
  }

  if (facts.headings.length > 0) {
    if (!facts.headings.some(h => h.level === 1)) {
      add('no-top-level-heading', 1)
    }

    const ordered = [...facts.headings].sort((a, b) => a.page - b.page)
    const skips: { page: number; from: number; to: number }[] = []
    let previousLevel = 0
    for (const heading of ordered) {
      if (previousLevel > 0 && heading.level > previousLevel + 1) {
        skips.push({ page: heading.page, from: previousLevel, to: heading.level })
      }
      previousLevel = heading.level
    }
    if (skips.length > 0) {
      add('skipped-heading-levels', skips.length, skips)
    }
  }

  if (facts.tablesWithoutHeaderCount > 0) {
    add('tables-missing-headers', facts.tablesWithoutHeaderCount)
  }
  if (facts.formFieldsWithoutDescriptionCount > 0) {
    add('form-fields-missing-description', facts.formFieldsWithoutDescriptionCount)
  }
  if (facts.hasNoTextLayer) {
    add('scanned-no-text-layer', 1)
  }
  if (facts.pageCount > LONG_DOCUMENT_PAGE_THRESHOLD && !facts.hasOutline) {
    add('long-document-no-bookmarks', 1)
  }

  return violations
}

export interface DocumentAccessibilityReport {
  pageCount: number
  pagesAnalyzed: number
  isTagged: boolean
  documentTitle: string | null
  documentLanguage: string | null
  violations: DocumentCheckViolation[]
  complianceScore: number
}

// Caps how many pages a single upload walks the structure tree/text/
// annotations for — mirrors MAX_MONITORS_PER_RUN's reasoning: bounds one
// request's execution time rather than needing to handle every page of an
// arbitrarily large document synchronously.
const MAX_PAGES_ANALYZED = 30

// Minimal shape of the pdfjs-dist objects this module reads. pdfjs-dist's
// own published types omit several fields the underlying parser does set
// at runtime (struct tree `alt`/`children`, permission flag names) — see
// the struct tree walker in pdf.worker.mjs — so these are hand-written
// against the actual runtime shape rather than cast through `any`.
interface PdfStructTreeNode {
  role?: string
  alt?: string
  children?: PdfStructTreeNode[]
}

interface PdfTextItem {
  str?: string
}

interface PdfAnnotation {
  subtype?: string
  alternativeText?: string
}

interface PdfjsPageProxy {
  getStructTree(): Promise<PdfStructTreeNode | null>
  getTextContent(): Promise<{ items: PdfTextItem[] }>
  getAnnotations(): Promise<PdfAnnotation[]>
}

interface PdfjsDocumentProxy {
  numPages: number
  getMarkInfo(): Promise<{ Marked: boolean } | null>
  getMetadata(): Promise<{ info: Record<string, unknown> }>
  getPermissions(): Promise<number[] | null>
  getOutline(): Promise<unknown[] | null>
  getPage(pageNumber: number): Promise<PdfjsPageProxy>
  destroy(): Promise<void>
}

interface PdfjsModule {
  getDocument(params: {
    data: Uint8Array
    isEvalSupported?: boolean
    verbosity?: number
  }): { promise: Promise<PdfjsDocumentProxy> }
  VerbosityLevel?: { ERRORS: number }
  PermissionFlag: { COPY_FOR_ACCESSIBILITY: number }
}

// A Table with no TH descendant anywhere in its subtree can't announce
// row/column headers to a screen reader.
function nodeHasDescendantRole(node: PdfStructTreeNode | null | undefined, role: string): boolean {
  if (!node) return false
  for (const child of node.children ?? []) {
    if (child?.role === role) return true
    if (nodeHasDescendantRole(child, role)) return true
  }
  return false
}

interface StructAccumulator {
  imagesWithoutAlt: { page: number }[]
  headings: { level: number; page: number }[]
  tablesWithoutHeaderCount: number
}

function walkStructTree(node: PdfStructTreeNode | null | undefined, page: number, acc: StructAccumulator): void {
  if (!node) return

  const role = node.role
  if (role === 'Figure' && !node.alt) {
    acc.imagesWithoutAlt.push({ page })
  }
  const headingMatch = role?.match(/^H([1-6])$/)
  if (headingMatch) {
    acc.headings.push({ level: parseInt(headingMatch[1], 10), page })
  }
  if (role === 'Table' && !nodeHasDescendantRole(node, 'TH')) {
    acc.tablesWithoutHeaderCount += 1
  }

  for (const child of node.children ?? []) {
    walkStructTree(child, page, acc)
  }
}

// Parses a PDF with pdfjs-dist and derives the facts buildDocumentViolations
// needs. Runs entirely against the structure tree, text content, and
// annotation data pdfjs already parses — no rendering/canvas involved, so
// this works in a plain Node server without a browser or GPU.
export async function analyzePdfAccessibility(data: Uint8Array): Promise<DocumentAccessibilityReport> {
  const pdfjsLib = (await import('pdfjs-dist/legacy/build/pdf.mjs')) as unknown as PdfjsModule

  const loadingTask = pdfjsLib.getDocument({
    data,
    isEvalSupported: false,
    verbosity: pdfjsLib.VerbosityLevel?.ERRORS ?? 0,
  })
  const doc = await loadingTask.promise

  try {
    const pageCount: number = doc.numPages
    const pagesToAnalyze = Math.min(pageCount, MAX_PAGES_ANALYZED)

    const [markInfo, metadataResult, permissions, outline] = await Promise.all([
      doc.getMarkInfo().catch(() => null),
      doc.getMetadata().catch(() => ({ info: {} as Record<string, unknown> })),
      doc.getPermissions().catch(() => null),
      doc.getOutline().catch(() => null),
    ])

    const info = (metadataResult.info || {}) as Record<string, unknown>
    const documentTitle =
      typeof info.Title === 'string' && info.Title.trim() ? info.Title.trim() : null
    const documentLanguage =
      typeof info.Language === 'string' && info.Language.trim() ? info.Language.trim() : null

    // getPermissions() returns null for an unencrypted document (no
    // restrictions at all), so only an encrypted file that explicitly
    // omits the accessibility-extraction bit counts as blocked.
    const accessibilityExtractionBlocked =
      Array.isArray(permissions) && !permissions.includes(pdfjsLib.PermissionFlag.COPY_FOR_ACCESSIBILITY)

    let structTreeFound = markInfo?.Marked === true
    const acc: StructAccumulator = { imagesWithoutAlt: [], headings: [], tablesWithoutHeaderCount: 0 }
    let formFieldsWithoutDescriptionCount = 0
    let totalChars = 0

    for (let pageNum = 1; pageNum <= pagesToAnalyze; pageNum++) {
      const page = await doc.getPage(pageNum)

      const [structTree, textContent, annotations] = await Promise.all([
        page.getStructTree().catch(() => null),
        page.getTextContent().catch((): { items: PdfTextItem[] } => ({ items: [] })),
        page.getAnnotations().catch((): PdfAnnotation[] => []),
      ])

      if (structTree?.children?.length) {
        structTreeFound = true
        walkStructTree(structTree, pageNum, acc)
      }

      for (const item of textContent.items) {
        if (typeof item.str === 'string') totalChars += item.str.trim().length
      }

      for (const annotation of annotations) {
        if (annotation.subtype === 'Widget' && !annotation.alternativeText?.trim()) {
          formFieldsWithoutDescriptionCount += 1
        }
      }
    }

    // Heuristic for "this is a scanned image with no OCR layer": almost no
    // extractable text across the sampled pages. A handful of stray
    // characters (e.g. a scanned watermark) shouldn't count as a real text
    // layer, so the bar is deliberately low rather than zero.
    const hasNoTextLayer = pagesToAnalyze > 0 && totalChars / pagesToAnalyze < 5

    const facts: DocumentFacts = {
      pageCount,
      isTagged: structTreeFound,
      documentTitle,
      documentLanguage,
      accessibilityExtractionBlocked,
      imagesWithoutAlt: acc.imagesWithoutAlt,
      headings: acc.headings,
      tablesWithoutHeaderCount: acc.tablesWithoutHeaderCount,
      formFieldsWithoutDescriptionCount,
      hasNoTextLayer,
      hasOutline: Array.isArray(outline) && outline.length > 0,
    }

    const violations = buildDocumentViolations(facts)

    return {
      pageCount,
      pagesAnalyzed: pagesToAnalyze,
      isTagged: facts.isTagged,
      documentTitle,
      documentLanguage,
      violations,
      complianceScore: calculateComplianceScore(violations),
    }
  } finally {
    await doc.destroy().catch(() => undefined)
  }
}
