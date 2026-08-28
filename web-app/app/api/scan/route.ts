import { NextRequest, NextResponse } from 'next/server'
import { runScan, mapScanErrorToResponse } from '@/lib/run-scan'
import { requireOrganizationContext } from '@/lib/organizations'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const { url, options = {}, siteContext = {}, useAI = true } = await request.json()

    const result = await runScan({
      organizationId: ctx.organizationId,
      createdByUserId: ctx.userId,
      url,
      options,
      siteContext,
      useAI,
    })

    return NextResponse.json({
      success: true,
      scan: {
        id: result.savedScan.id,
        url: result.formattedUrl,
        timestamp: result.scanResult.timestamp,
        complianceScore: result.complianceScore,
        pagesScanned: result.pagesScanned,
        discoveryMethod: result.discoveryMethod,
        violations: result.scanResult.violations,
        passes: result.scanResult.passes,
        incomplete: result.scanResult.incomplete,
        metadata: result.scanResult.metadata,
        performanceMetrics: result.scanResult.performanceMetrics,
        hasAIPrioritization: result.hasAIPrioritization,
        framework: result.scanOptions.framework,
        siteContext,
        scansRemaining: result.scansRemaining,
      }
    })
  } catch (error) {
    logger.error('Scan API error:', error)
    const { message, status } = mapScanErrorToResponse(error)
    return NextResponse.json(
      { error: message, details: process.env.NODE_ENV === 'development' ? String(error) : undefined },
      { status }
    )
  }
}
