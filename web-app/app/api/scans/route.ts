import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/scans - Get all scans (with optional userId filter)
export async function GET(request: NextRequest) {
  try {
    // Check if database is configured
    if (!process.env.DATABASE_URL) {
      return NextResponse.json([])
    }

    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '10')

    const scans = await prisma.scan.findMany({
      where: userId ? { userId } : {},
      include: {
        violations: {
          select: {
            id: true,
            priority: true,
            impact: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    })

    return NextResponse.json(scans)
  } catch (error) {
    console.error('Error fetching scans:', error)
    // Return empty array instead of error to allow app to work without database
    return NextResponse.json([])
  }
}

// POST /api/scans - Create a new scan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, complianceScore, pagesScanned, violations, userId } = body

    const scan = await prisma.scan.create({
      data: {
        url,
        complianceScore,
        pagesScanned,
        userId: userId || null,
        violations: {
          create: violations.map((v: any) => ({
            violationId: v.id,
            description: v.description,
            help: v.help,
            helpUrl: v.helpUrl,
            impact: v.impact,
            wcagReference: v.wcagReference,
            elementCount: v.elementCount || 0,
            priority: v.priority,
            priorityScore: v.priorityScore,
            impactScore: v.impactScore,
            legalRiskScore: v.legalRiskScore,
            effortHours: v.effortHours,
            explanation: v.explanation,
            nodes: v.nodes,
            tags: v.tags,
          })),
        },
      },
      include: {
        violations: true,
      },
    })

    return NextResponse.json(scan)
  } catch (error) {
    console.error('Error creating scan:', error)
    return NextResponse.json(
      { error: 'Failed to create scan' },
      { status: 500 }
    )
  }
}