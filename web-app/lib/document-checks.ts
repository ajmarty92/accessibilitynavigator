// Fixed catalog of automated PDF accessibility checks, in the same spirit
// as MANUAL_AUDIT_CHECKLIST — a single source of truth for what each check
// means and why it matters, referenced by both the analyzer that decides
// which checks fail (document-accessibility-checker.ts) and anywhere the
// UI needs to display a check's title/help text.

export type DocumentCheckId =
  | 'untagged-document'
  | 'missing-document-title'
  | 'missing-document-language'
  | 'accessibility-extraction-blocked'
  | 'images-missing-alt-text'
  | 'no-top-level-heading'
  | 'skipped-heading-levels'
  | 'tables-missing-headers'
  | 'form-fields-missing-description'
  | 'scanned-no-text-layer'
  | 'long-document-no-bookmarks'

export interface DocumentCheckDefinition {
  title: string
  help: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  wcagReference: string
}

export const DOCUMENT_CHECK_DEFINITIONS: Record<DocumentCheckId, DocumentCheckDefinition> = {
  'untagged-document': {
    title: 'PDF is not tagged for accessibility',
    help: "Without a tag structure, screen readers cannot determine reading order, headings, lists, tables, or alternative text — the document is effectively unusable with assistive technology. Add tags via the authoring tool's accessibility export (e.g. Word's \"Check Accessibility\", or Acrobat Pro's Prepare for Accessibility wizard).",
    impact: 'critical',
    wcagReference: 'WCAG 1.3.1',
  },
  'missing-document-title': {
    title: 'Document is missing a title in its metadata',
    help: 'Screen readers announce the document title when it opens. Set the Title field in the document properties — not just the filename.',
    impact: 'serious',
    wcagReference: 'WCAG 2.4.2',
  },
  'missing-document-language': {
    title: 'Document language is not set',
    help: 'Screen readers use the declared language to choose the correct pronunciation and voice. Set the primary language in the document properties.',
    impact: 'serious',
    wcagReference: 'WCAG 3.1.1',
  },
  'accessibility-extraction-blocked': {
    title: 'Security settings block content extraction for assistive technology',
    help: 'The document\'s permissions deny the "content extraction for accessibility" flag, which prevents screen readers from reading it even if it is otherwise well-tagged. Re-export or re-secure the file with this permission allowed.',
    impact: 'critical',
    wcagReference: 'WCAG 4.1.2',
  },
  'images-missing-alt-text': {
    title: 'Images are missing alternative text',
    help: 'Figures tagged in the document have no Alt (or ActualText) entry, so screen reader users get no description of their content. Add alt text to every meaningful image before exporting to PDF.',
    impact: 'serious',
    wcagReference: 'WCAG 1.1.1',
  },
  'no-top-level-heading': {
    title: 'Document has no top-level heading (H1)',
    help: 'A document with headings but no H1 leaves screen reader users without a clear starting point when navigating by heading level.',
    impact: 'moderate',
    wcagReference: 'WCAG 1.3.1',
  },
  'skipped-heading-levels': {
    title: 'Heading levels are skipped',
    help: 'Jumping from one heading level to a lower one (e.g. H1 to H3) without the levels in between breaks the document outline screen reader users rely on to navigate.',
    impact: 'moderate',
    wcagReference: 'WCAG 1.3.1',
  },
  'tables-missing-headers': {
    title: 'Tables are missing header cells',
    help: 'A tagged Table has no TH (header) cells, so screen readers cannot announce which row or column a cell belongs to. Mark header rows/columns as TH when authoring.',
    impact: 'moderate',
    wcagReference: 'WCAG 1.3.1',
  },
  'form-fields-missing-description': {
    title: 'Form fields are missing an accessible description',
    help: 'Interactive form fields have no tooltip/description (the PDF "TU" entry), so screen readers fall back to an unhelpful technical field name. Set a clear tooltip on every field.',
    impact: 'moderate',
    wcagReference: 'WCAG 3.3.2',
  },
  'scanned-no-text-layer': {
    title: 'Document appears to be scanned images with no text layer',
    help: 'No extractable text was found on the sampled pages, meaning this is likely a scanned image with no OCR text layer — completely inaccessible to screen readers and unusable for copy or search. Run OCR (e.g. Acrobat\'s "Recognize Text") and add tags.',
    impact: 'critical',
    wcagReference: 'WCAG 1.1.1',
  },
  'long-document-no-bookmarks': {
    title: 'Long document has no bookmarks for navigation',
    help: 'Documents over 20 pages should include bookmarks (an outline) so users of assistive technology can jump between sections instead of reading linearly.',
    impact: 'minor',
    wcagReference: 'WCAG 2.4.5',
  },
}
