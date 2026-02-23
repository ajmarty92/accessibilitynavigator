import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/scans/stats
 * Returns aggregated statistics for recent scans.
 *
 * Query parameters:
 * - userId: Filter by user ID
 * - limit: Number of recent scans to aggregate (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        avgCompliance: 0,
        totalViolations: 0,
        criticalIssues: 0,
        scansCount: 0,
      })
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')

    // 1. Fetch the last N scans to aggregate
    // We only need the ID and complianceScore, which is much faster than fetching full scan data
    const scans = await prisma.scan.findMany({
      where: userId ? { userId } : {},
      take: limit,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        complianceScore: true,
      }
    })

    if (scans.length === 0) {
      return NextResponse.json({
        avgCompliance: 0,
        totalViolations: 0,
        criticalIssues: 0,
        scansCount: 0,
      })
    }

    const scanIds = scans.map(s => s.id)

    // 2. Efficiently count violations across all selected scans
    // This is much faster than fetching all violation records and counting them in JS
    const [totalViolations, criticalIssues] = await Promise.all([
      prisma.violation.count({
        where: {
          scanId: { in: scanIds }
        }
      }),
      prisma.violation.count({
        where: {
          scanId: { in: scanIds },
          priority: 'critical'
        }
      })
    ])

    const totalCompliance = scans.reduce((sum, scan) => sum + scan.complianceScore, 0)

    return NextResponse.json({
      avgCompliance: Math.round(totalCompliance / scans.length),
      totalViolations,
      criticalIssues,
      scansCount: scans.length,
    })
  } catch (error) {
    console.error('Error fetching scan stats:', error)
    // Return zeros instead of error to allow app to work without database
    return NextResponse.json({
      avgCompliance: 0,
      totalViolations: 0,
      criticalIssues: 0,
      scansCount: 0,
    })
  }
}
