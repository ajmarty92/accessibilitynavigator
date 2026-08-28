import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runScan, mapScanErrorToResponse } from '@/lib/run-scan'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Sign in to run a scan' },
        { status: 401 }
      )
    }

    const { url, options = {}, siteContext = {}, useAI = true } = await request.json()

    const result = await runScan({ userId: session.user.id, url, options, siteContext, useAI })

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
