import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext } from '@/lib/organizations'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

export interface SiteTrendPoint {
  scanId: string
  timestamp: string
  complianceScore: number
}

export interface SiteSummary {
  url: string
  latestScore: number
  previousScore: number | null
  scanCount: number
  lastScanAt: string
  history: SiteTrendPoint[]
}

// GET /api/sites — every distinct URL the signed-in user's organization has
// scanned, with its compliance score history. Powers the trend dashboard: a
// site scanned once shows a single point, a site scanned repeatedly shows
// real movement over time instead of a one-off snapshot.
export async function GET() {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const scans = await prisma.scan.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { timestamp: 'asc' },
      select: { id: true, url: true, complianceScore: true, timestamp: true },
    })

    const byUrl = new Map<string, SiteTrendPoint[]>()
    for (const scan of scans) {
      const points = byUrl.get(scan.url) ?? []
      points.push({ scanId: scan.id, timestamp: scan.timestamp.toISOString(), complianceScore: scan.complianceScore })
      byUrl.set(scan.url, points)
    }

    const sites: SiteSummary[] = Array.from(byUrl.entries())
      .map(([url, history]) => {
        const latest = history[history.length - 1]
        const previous = history.length > 1 ? history[history.length - 2] : null
        return {
          url,
          latestScore: latest.complianceScore,
          previousScore: previous?.complianceScore ?? null,
          scanCount: history.length,
          lastScanAt: latest.timestamp,
          history,
        }
      })
      .sort((a, b) => new Date(b.lastScanAt).getTime() - new Date(a.lastScanAt).getTime())

    return NextResponse.json({ sites })
  } catch (error) {
    logger.error('Failed to fetch site trends:', error)
    return NextResponse.json({ error: 'Failed to fetch site trends' }, { status: 500 })
  }
}
