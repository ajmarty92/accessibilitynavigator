import type { Prisma } from '@prisma/client'
import { analyzePdfAccessibility } from './document-accessibility-checker.ts'
import { checkRateLimit } from './rate-limit.ts'
import { triggerWebhooks } from './webhooks.ts'
import { prisma } from './prisma.ts'
import { logger } from './logger.ts'

// Thrown for expected, user-facing failure modes so the route can map
// status/message straight to an HTTP response, same pattern as ScanError
// in run-scan.ts.
export class DocumentScanError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'DocumentScanError'
  }
}

// Document parsing is CPU/memory-bound but far lighter than a full
// Puppeteer page load, so this is deliberately more generous than the
// website scanner's per-hour limit rather than reusing it outright.
const DOCUMENT_SCAN_RATE_LIMIT = 20
const DOCUMENT_SCAN_RATE_WINDOW_MS = 60 * 60 * 1000

// Bounds how large an upload gets parsed — a very large PDF (hundreds of
// MB, e.g. a scanned book) could otherwise tie up a request for minutes.
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

export interface RunDocumentScanParams {
  organizationId: string
  createdByUserId?: string
  fileName: string
  fileBuffer: Uint8Array
}

export type DocumentScanWithViolations = Prisma.DocumentScanGetPayload<{ include: { violations: true } }>

export interface RunDocumentScanResult {
  savedScan: DocumentScanWithViolations
  complianceScore: number
}

// Not gated by the organization's monthly website-scan quota — document
// scanning is a separate product surface with its own (currently
// unlimited, rate-limited) usage, not a substitute for a site scan.
export async function runDocumentScan(params: RunDocumentScanParams): Promise<RunDocumentScanResult> {
  const { organizationId, createdByUserId, fileName, fileBuffer } = params

  if (!fileBuffer || fileBuffer.byteLength === 0) {
    throw new DocumentScanError('A PDF file is required', 400)
  }
  if (fileBuffer.byteLength > MAX_FILE_SIZE_BYTES) {
    throw new DocumentScanError('File is too large. The limit is 25MB.', 413)
  }

  const header = Buffer.from(fileBuffer.slice(0, 5)).toString('ascii')
  if (header !== '%PDF-') {
    throw new DocumentScanError('File does not look like a valid PDF', 400)
  }

  const rateLimit = await checkRateLimit(
    `document-scan:${organizationId}`,
    DOCUMENT_SCAN_RATE_LIMIT,
    DOCUMENT_SCAN_RATE_WINDOW_MS
  )
  if (!rateLimit.allowed) {
    throw new DocumentScanError(
      `Too many document scans. Please try again after ${rateLimit.resetAt.toLocaleTimeString()}.`,
      429
    )
  }

  let report
  try {
    report = await analyzePdfAccessibility(fileBuffer)
  } catch (error) {
    logger.error('PDF analysis failed:', error)
    throw new DocumentScanError('Unable to parse this PDF. It may be corrupted or password-protected.', 400)
  }

  const savedScan = await prisma.documentScan.create({
    data: {
      organizationId,
      createdByUserId,
      fileName,
      fileSizeBytes: fileBuffer.byteLength,
      pageCount: report.pageCount,
      pagesAnalyzed: report.pagesAnalyzed,
      complianceScore: report.complianceScore,
      isTagged: report.isTagged,
      documentTitle: report.documentTitle,
      documentLanguage: report.documentLanguage,
      violations: {
        create: report.violations.map(violation => ({
          checkId: violation.checkId,
          description: violation.description,
          help: violation.help,
          impact: violation.impact,
          wcagReference: violation.wcagReference,
          elementCount: violation.elementCount,
          nodes: violation.nodes as Prisma.InputJsonValue,
        })),
      },
    },
    include: { violations: true },
  })

  triggerWebhooks(organizationId, 'document_scan.completed', {
    documentScanId: savedScan.id,
    fileName,
    complianceScore: report.complianceScore,
    pageCount: report.pageCount,
    violationCount: report.violations.length,
    criticalCount: report.violations.filter(v => v.impact === 'critical').length,
    reportUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/documents/${savedScan.id}`,
  })

  return { savedScan, complianceScore: report.complianceScore }
}

export function mapDocumentScanErrorToResponse(error: unknown): { message: string; status: number } {
  if (error instanceof DocumentScanError) {
    return { message: error.message, status: error.status }
  }
  if (error instanceof Error) {
    return { message: error.message, status: 500 }
  }
  return { message: 'Internal server error', status: 500 }
}
