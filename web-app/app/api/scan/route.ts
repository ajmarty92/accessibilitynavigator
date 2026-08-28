import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { scanWebsite, detectFramework, scanMultiplePages, ScanOptions } from '@/lib/scanner'
import { analyzeViolationsWithAI, SiteContext, AIAnalysis } from '@/lib/ai-prioritizer'
import { calculateComplianceScore } from '@/lib/compliance-score'
import { canUserScan, trackScanUsage } from '@/lib/usage-tracking'
import { checkRateLimit } from '@/lib/rate-limit'
import { prisma } from '@/lib/prisma'
import { validateUrl } from '@/lib/security'
import { logger } from '@/lib/logger'

// Hard ceiling on scans per user per hour, independent of subscription tier.
// Protects against a compromised session or runaway client from spinning up
// unbounded headless-Chrome instances.
const SCAN_RATE_LIMIT = 10
const SCAN_RATE_WINDOW_MS = 60 * 60 * 1000

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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Sign in to run a scan' },
        { status: 401 }
      )
    }
    const userId = session.user.id

    const {
      url,
      options = {},
      siteContext = {},
      useAI = true
    } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'Valid URL is required' },
        { status: 400 }
      )
    }

    const formattedUrl = url.startsWith('http') ? url : `https://${url}`

    const validationResult = await validateUrl(formattedUrl)
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.reason || 'Invalid URL' },
        { status: 403 }
      )
    }

    // Hard per-user rate limit, checked before the (more expensive) tier check.
    const rateLimit = await checkRateLimit(`scan:${userId}`, SCAN_RATE_LIMIT, SCAN_RATE_WINDOW_MS)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: `Too many scans. Please try again after ${rateLimit.resetAt.toLocaleTimeString()}.` },
        { status: 429 }
      )
    }

    // Subscription-tier / trial quota check.
    const usage = await canUserScan(userId)
    if (!usage.canScan) {
      return NextResponse.json(
        { error: usage.reason || 'Scan limit reached for your plan', resetDate: usage.resetDate },
        { status: 403 }
      )
    }

    const scanOptions: ScanOptions = {
      maxPages: options.maxPages || 1,
      crawlDepth: options.crawlDepth || 1,
      includePerformance: options.includePerformance !== false,
      customRules: options.customRules !== false,
      framework: options.framework || 'vanilla'
    }

    if (!options.framework) {
      try {
        scanOptions.framework = await detectFramework(formattedUrl)
      } catch (error) {
        logger.error('Framework detection failed, using vanilla:', error)
        scanOptions.framework = 'vanilla'
      }
    }

    let scanResult
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
        performanceMetrics: results[0]?.performanceMetrics
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
          aiAnalysis: aiAnalysis?.[index] || null
        }))
      } catch (error) {
        logger.error('AI analysis failed:', error)
      }
    }

    const complianceScore = calculateComplianceScore(scanResult.violations)

    const savedScan = await prisma.scan.create({
      data: {
        url: formattedUrl,
        userId,
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
          }
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
          })
        }
      },
      include: { violations: true }
    })

    await trackScanUsage(userId, savedScan.id)

    return NextResponse.json({
      success: true,
      scan: {
        id: savedScan.id,
        url: formattedUrl,
        timestamp: scanResult.timestamp,
        complianceScore,
        pagesScanned,
        discoveryMethod,
        violations: scanResult.violations,
        passes: scanResult.passes,
        incomplete: scanResult.incomplete,
        metadata: scanResult.metadata,
        performanceMetrics: scanResult.performanceMetrics,
        hasAIPrioritization: !!aiAnalysis,
        framework: scanOptions.framework,
        siteContext,
        scansRemaining: usage.scansRemaining !== undefined ? usage.scansRemaining - 1 : undefined,
      }
    })
  } catch (error) {
    logger.error('Scan API error:', error)

    let errorMessage = 'Internal server error'
    let statusCode = 500

    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = 'Website scan timed out. Please try again or contact support.'
        statusCode = 408
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        errorMessage = 'Unable to reach the website. Please check the URL and try again.'
        statusCode = 400
      } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
        errorMessage = 'Website has SSL certificate issues. Please contact the website administrator.'
        statusCode = 400
      } else {
        errorMessage = error.message
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: statusCode }
    )
  }
}
