import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// GET /api/scans/[scanId] - Get a specific scan with all violations.
// Scoped to the signed-in owner of the scan.
export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 404 }
      )
    }

    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const scan = await prisma.scan.findUnique({
      where: {
        id: params.scanId,
      },
      include: {
        violations: {
          orderBy: {
            priorityScore: 'desc',
          },
        },
        metadata: true,
      },
    })

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    if (scan.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const codeFixes = await prisma.codeFix.findMany({ where: { scanId: scan.id } })

    return NextResponse.json({
      scanId: scan.id,
      url: scan.url,
      timestamp: scan.timestamp,
      complianceScore: scan.complianceScore,
      pagesScanned: scan.pagesScanned,
      violations: scan.violations,
      frameworkDetection: scan.metadata?.frameworkDetection ?? null,
      codeFixes,
      enhanced: scan.metadata
        ? {
            aiPrioritization: scan.metadata.aiAnalysisEnabled,
            codeGeneration: scan.metadata.codeFixesEnabled,
            customRules: scan.metadata.customRulesEnabled,
            performanceAnalysis: scan.metadata.performanceAnalysis,
            frameworkDetection: scan.metadata.frameworkDetectionEnabled,
          }
        : undefined,
    })
  } catch (error) {
    console.error('Error fetching scan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scan' },
      { status: 500 }
    )
  }
}
