import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext } from '@/lib/organizations'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// GET /api/documents/[documentScanId] — a single document scan with its
// violations, scoped to the caller's organization.
export async function GET(
  request: NextRequest,
  { params }: { params: { documentScanId: string } }
) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const documentScan = await prisma.documentScan.findUnique({
      where: { id: params.documentScanId },
      include: {
        violations: { orderBy: { createdAt: 'asc' } },
      },
    })

    if (!documentScan || documentScan.organizationId !== ctx.organizationId) {
      return NextResponse.json({ error: 'Document scan not found' }, { status: 404 })
    }

    return NextResponse.json({ documentScan })
  } catch (error) {
    logger.error('Failed to fetch document scan:', error)
    return NextResponse.json({ error: 'Failed to fetch document scan' }, { status: 500 })
  }
}
