import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { VALID_FREQUENCIES, computeNextRunAt } from '@/lib/monitor-scheduling'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

async function loadOwnedMonitor(monitorId: string, organizationId: string) {
  const monitor = await prisma.scheduledMonitor.findUnique({ where: { id: monitorId } })
  if (!monitor || monitor.organizationId !== organizationId) return null
  return monitor
}

// PATCH /api/monitors/[monitorId] — toggle enabled, or change frequency
// (which reschedules nextRunAt from now).
export async function PATCH(
  request: NextRequest,
  { params }: { params: { monitorId: string } }
) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can manage monitors' }, { status: 403 })
    }

    const monitor = await loadOwnedMonitor(params.monitorId, ctx.organizationId)
    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    const { enabled, frequency } = await request.json()

    if (frequency !== undefined && !VALID_FREQUENCIES.includes(frequency)) {
      return NextResponse.json({ error: `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}` }, { status: 400 })
    }

    const updated = await prisma.scheduledMonitor.update({
      where: { id: monitor.id },
      data: {
        ...(enabled !== undefined ? { enabled: !!enabled } : {}),
        ...(frequency !== undefined ? { frequency, nextRunAt: computeNextRunAt(frequency) } : {}),
      },
    })

    return NextResponse.json({ monitor: updated })
  } catch (error) {
    logger.error('Failed to update monitor:', error)
    return NextResponse.json({ error: 'Failed to update monitor' }, { status: 500 })
  }
}

// DELETE /api/monitors/[monitorId] — remove a monitor.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { monitorId: string } }
) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can manage monitors' }, { status: 403 })
    }

    const monitor = await loadOwnedMonitor(params.monitorId, ctx.organizationId)
    if (!monitor) {
      return NextResponse.json({ error: 'Monitor not found' }, { status: 404 })
    }

    await prisma.scheduledMonitor.delete({ where: { id: monitor.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to remove monitor:', error)
    return NextResponse.json({ error: 'Failed to remove monitor' }, { status: 500 })
  }
}
