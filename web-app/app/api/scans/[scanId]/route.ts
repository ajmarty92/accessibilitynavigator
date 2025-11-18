import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/scans/[scanId] - Get a specific scan with all violations
export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 404 }
      )
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
      },
    })

    if (!scan) {
      return NextResponse.json(
        { error: 'Scan not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(scan)
  } catch (error) {
    console.error('Error fetching scan:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scan' },
      { status: 500 }
    )
  }
}