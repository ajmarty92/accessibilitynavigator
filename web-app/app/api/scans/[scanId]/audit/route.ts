import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { MANUAL_AUDIT_CHECKLIST } from '@/lib/manual-audit-checklist'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['not_started', 'pass', 'fail', 'not_applicable']

async function assertOwnership(scanId: string, userId: string) {
  const scan = await prisma.scan.findUnique({ where: { id: scanId }, select: { userId: true } })
  if (!scan) return { ok: false as const, status: 404, error: 'Scan not found' }
  if (scan.userId !== userId) return { ok: false as const, status: 403, error: 'Access denied' }
  return { ok: true as const }
}

// GET /api/scans/[scanId]/audit — fetch (and lazily seed) the manual audit
// checklist for a scan.
export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const ownership = await assertOwnership(params.scanId, session.user.id)
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status })
    }

    const existingCount = await prisma.manualAuditItem.count({ where: { scanId: params.scanId } })
    if (existingCount === 0) {
      await prisma.manualAuditItem.createMany({
        data: MANUAL_AUDIT_CHECKLIST.map(item => ({
          scanId: params.scanId,
          category: item.category,
          code: item.code,
          title: item.title,
          guidance: item.guidance,
          wcagReference: item.wcagReference ?? null,
        })),
        skipDuplicates: true,
      })
    }

    const items = await prisma.manualAuditItem.findMany({
      where: { scanId: params.scanId },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
    })

    return NextResponse.json({ items })
  } catch (error) {
    logger.error('Failed to fetch manual audit checklist:', error)
    return NextResponse.json({ error: 'Failed to fetch manual audit checklist' }, { status: 500 })
  }
}

// PATCH /api/scans/[scanId]/audit — update one checklist item's status/notes.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 })
    }

    const ownership = await assertOwnership(params.scanId, session.user.id)
    if (!ownership.ok) {
      return NextResponse.json({ error: ownership.error }, { status: ownership.status })
    }

    const { itemId, status, notes } = await request.json()

    if (!itemId || typeof itemId !== 'string') {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 })
    }
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const item = await prisma.manualAuditItem.findUnique({ where: { id: itemId } })
    if (!item || item.scanId !== params.scanId) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const updated = await prisma.manualAuditItem.update({
      where: { id: itemId },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        checkedByUserId: session.user.id,
        checkedAt: new Date(),
      },
    })

    return NextResponse.json({ item: updated })
  } catch (error) {
    logger.error('Failed to update manual audit item:', error)
    return NextResponse.json({ error: 'Failed to update manual audit item' }, { status: 500 })
  }
}
