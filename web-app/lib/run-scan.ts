import type { Prisma } from '@prisma/client'
import { scanWebsite, detectFramework, scanMultiplePages, ScanOptions } from './scanner'
import { analyzeViolationsWithAI, SiteContext, AIAnalysis } from './ai-prioritizer'
import { calculateComplianceScore } from './compliance-score'
import { canOrganizationScan, trackScanUsage } from './usage-tracking'
import { checkRateLimit } from './rate-limit'
import { triggerWebhooks } from './webhooks'
import { prisma } from './prisma'
import { validateUrl } from './security'
import { logger } from './logger'

// Hard ceiling on scans per organization per hour, independent of
// subscription tier. Protects against a compromised session/API key or
// runaway client from spinning up unbounded headless-Chrome instances.
const SCAN_RATE_LIMIT = 10
const SCAN_RATE_WINDOW_MS = 60 * 60 * 1000

// Thrown for expected, user-facing failure modes (bad input, rate limit,
// quota) so callers can map status/message straight to an HTTP response
// without re-deriving them from a generic Error's message text.
export class ScanError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = 'ScanError'
  }
}

function derivePriority(impact: string, aiAnalysis?: AIAnalysis | null): string {
  if (aiAnalysis?.complianceLevel) return aiAnalysis.complianceLevel.toLowerCase()
  switch (impact) {
    case 'critical':
      return 'critical'
    case 'serious':
      return 'high'
    case 'moderate':
      return 'medium'
    default:
      return 'low'
  }
}

function parseEffortHours(estimate?: string): number | null {
  if (!estimate) return null
  const match = estimate.match(/(\d+(\.\d+)?)/)
  return match ? parseFloat(match[1]) : null
}

export interface RunScanParams {
  organizationId: string
  createdByUserId?: string
  url: string
  options?: {
    maxPages?: number
    crawlDepth?: number
    includePerformance?: boolean
    customRules?: boolean
    framework?: 'react' | 'vue' | 'angular' | 'vanilla'
  }
  siteContext?: SiteContext
  useAI?: boolean
}

export type ScanWithViolations = Prisma.ScanGetPayload<{ include: { violations: true } }>

export interface RunScanResult {
  savedScan: ScanWithViolations
  formattedUrl: string
  complianceScore: number
  pagesScanned: number
  discoveryMethod: 'sitemap' | 'crawl' | null
  scanOptions: ScanOptions
  scanResult: {
    timestamp: string
    violations: any[]
    passes: any[]
    incomplete: any[]
    metadata: Record<string, any>
    performanceMetrics?: Record<string, any>
  }
  hasAIPrioritization: boolean
  scansRemaining?: number
}

// The full scan pipeline shared by the human-facing POST /api/scan route and
// the API-key-authenticated POST /api/ci/scan route: validate, rate-limit,
// check quota, crawl/scan, run AI prioritization, score, and persist.
export async function runScan(params: RunScanParams): Promise<RunScanResult> {
  const { organizationId, createdByUserId, url, options = {}, siteContext = {}, useAI = true } = params

  if (!url || typeof url !== 'string') {
    throw new ScanError('Valid URL is required', 400)
  }

  const formattedUrl = url.startsWith('http') ? url : `https://${url}`

  const validationResult = await validateUrl(formattedUrl)
  if (!validationResult.valid) {
    throw new ScanError(validationResult.reason || 'Invalid URL', 403)
  }

  const rateLimit = await checkRateLimit(`scan:${organizationId}`, SCAN_RATE_LIMIT, SCAN_RATE_WINDOW_MS)
  if (!rateLimit.allowed) {
    throw new ScanError(
      `Too many scans. Please try again after ${rateLimit.resetAt.toLocaleTimeString()}.`,
      429
    )
  }

  const usage = await canOrganizationScan(organizationId)
  if (!usage.canScan) {
    throw new ScanError(usage.reason || 'Scan limit reached for your plan', 403)
  }

  const scanOptions: ScanOptions = {
    maxPages: options.maxPages || 1,
    crawlDepth: options.crawlDepth || 1,
    includePerformance: options.includePerformance !== false,
    customRules: options.customRules !== false,
    framework: options.framework || 'vanilla',
  }

  if (!options.framework) {
    try {
      scanOptions.framework = await detectFramework(formattedUrl)
    } catch (error) {
      logger.error('Framework detection failed, using vanilla:', error)
      scanOptions.framework = 'vanilla'
    }
  }

  let scanResult: any
  let pagesScanned = 1
  let discoveryMethod: 'sitemap' | 'crawl' | null = null

  if (scanOptions.maxPages && scanOptions.maxPages > 1) {
    const { results, discoveryMethod: method } = await scanMultiplePages(formattedUrl, scanOptions)
    pagesScanned = results.length
    discoveryMethod = method

    scanResult = {
      violations: results.flatMap(r => r.violations),
      passes: results.flatMap(r => r.passes),
      incomplete: results.flatMap(r => r.incomplete),
      url: formattedUrl,
      timestamp: new Date().toISOString(),
      scanDuration: results.reduce((total, r) => total + r.scanDuration, 0),
      metadata: {
        title: results[0]?.metadata?.title,
        viewport: results[0]?.metadata?.viewport || { width: 1280, height: 720 },
        userAgent: results[0]?.metadata?.userAgent,
      },
      performanceMetrics: results[0]?.performanceMetrics,
    }
  } else {
    scanResult = await scanWebsite(formattedUrl, scanOptions)
  }

  let aiAnalysis: AIAnalysis[] | null = null
  if (useAI && scanResult.violations.length > 0) {
    try {
      aiAnalysis = await analyzeViolationsWithAI(scanResult.violations, siteContext as SiteContext)
      scanResult.violations = scanResult.violations.map((violation: any, index: number) => ({
        ...violation,
        aiAnalysis: aiAnalysis?.[index] || null,
      }))
    } catch (error) {
      logger.error('AI analysis failed:', error)
    }
  }

  const complianceScore = calculateComplianceScore(scanResult.violations)

  const savedScan = await prisma.scan.create({
    data: {
      url: formattedUrl,
      organizationId,
      createdByUserId,
      complianceScore,
      pagesScanned,
      metadata: {
        create: {
          frameworkDetection: { primary: scanOptions.framework },
          performanceMetrics: scanResult.performanceMetrics ?? undefined,
          scanOptions: { ...scanOptions, discoveryMethod } as any,
          aiAnalysisEnabled: !!aiAnalysis,
          codeFixesEnabled: false,
          customRulesEnabled: !!scanOptions.customRules,
          performanceAnalysis: !!scanOptions.includePerformance,
          frameworkDetectionEnabled: true,
        },
      },
      violations: {
        create: scanResult.violations.map((violation: any) => {
          const analysis: AIAnalysis | null = violation.aiAnalysis || null
          return {
            violationId: violation.id,
            description: violation.description || '',
            help: violation.help || violation.description || '',
            helpUrl: violation.helpUrl || null,
            impact: violation.impact || 'moderate',
            wcagReference: violation.wcagReference || null,
            elementCount: violation.elementCount ?? violation.nodes?.length ?? 0,
            priority: derivePriority(violation.impact, analysis),
            priorityScore: analysis?.priorityScore ?? null,
            legalRiskScore: analysis?.legalRiskScore ?? null,
            userImpactScore: analysis?.userImpactScore ?? null,
            businessRiskScore: analysis?.businessRiskScore ?? null,
            technicalComplexity: analysis?.technicalComplexity ?? null,
            effortHours: parseEffortHours(analysis?.estimatedEffort),
            explanation: analysis?.businessJustification ?? null,
            fixRecommendations: analysis?.fixRecommendations ?? [],
            complianceDeadline: analysis?.deadlineRecommendation ?? null,
            businessJustification: analysis?.businessJustification ?? null,
            nodes: violation.nodes ?? [],
            tags: violation.tags ?? [],
            framework: scanOptions.framework,
          }
        }),
      },
    },
    include: { violations: true },
  })

  await trackScanUsage(organizationId, savedScan.id)

  triggerWebhooks(organizationId, 'scan.completed', {
    scanId: savedScan.id,
    url: formattedUrl,
    complianceScore,
    pagesScanned,
    violationCount: scanResult.violations.length,
    criticalCount: scanResult.violations.filter((v: any) => v.impact === 'critical').length,
    reportUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/results/${savedScan.id}`,
  })

  return {
    savedScan,
    formattedUrl,
    complianceScore,
    pagesScanned,
    discoveryMethod,
    scanOptions,
    scanResult: {
      timestamp: scanResult.timestamp,
      violations: scanResult.violations,
      passes: scanResult.passes,
      incomplete: scanResult.incomplete,
      metadata: scanResult.metadata,
      performanceMetrics: scanResult.performanceMetrics,
    },
    hasAIPrioritization: !!aiAnalysis,
    scansRemaining: usage.scansRemaining !== undefined ? usage.scansRemaining - 1 : undefined,
  }
}

// Maps an unexpected (non-ScanError) failure to an HTTP status/message the
// same way both scan routes did before this was extracted — timeouts and
// network errors are the caller's problem, not a 500.
export function mapScanErrorToResponse(error: unknown): { message: string; status: number } {
  if (error instanceof ScanError) {
    return { message: error.message, status: error.status }
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return { message: 'Website scan timed out. Please try again or contact support.', status: 408 }
    }
    if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
      return { message: 'Unable to reach the website. Please check the URL and try again.', status: 400 }
    }
    if (error.message.includes('SSL') || error.message.includes('certificate')) {
      return {
        message: 'Website has SSL certificate issues. Please contact the website administrator.',
        status: 400,
      }
    }
    return { message: error.message, status: 500 }
  }

  return { message: 'Internal server error', status: 500 }
}
