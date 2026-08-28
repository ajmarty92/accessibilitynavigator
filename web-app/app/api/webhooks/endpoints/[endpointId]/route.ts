import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

async function loadOwnedEndpoint(endpointId: string, organizationId: string) {
  const endpoint = await prisma.webhookEndpoint.findUnique({ where: { id: endpointId } })
  if (!endpoint || endpoint.organizationId !== organizationId) return null
  return endpoint
}

// PATCH /api/webhooks/endpoints/[endpointId] — enable/disable delivery
// without losing delivery history, unlike deleting and recreating.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { endpointId: string } }
) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can manage webhook endpoints' }, { status: 403 })
    }

    const endpoint = await loadOwnedEndpoint(params.endpointId, ctx.organizationId)
    if (!endpoint) {
      return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 })
    }

    const { enabled } = await request.json()
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled must be a boolean' }, { status: 400 })
    }

    const updated = await prisma.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: { enabled },
    })

    return NextResponse.json({ id: updated.id, enabled: updated.enabled })
  } catch (error) {
    logger.error('Failed to update webhook endpoint:', error)
    return NextResponse.json({ error: 'Failed to update webhook endpoint' }, { status: 500 })
  }
}

// DELETE /api/webhooks/endpoints/[endpointId] — remove an endpoint.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { endpointId: string } }
) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can manage webhook endpoints' }, { status: 403 })
    }

    const endpoint = await loadOwnedEndpoint(params.endpointId, ctx.organizationId)
    if (!endpoint) {
      return NextResponse.json({ error: 'Webhook endpoint not found' }, { status: 404 })
    }

    await prisma.webhookEndpoint.delete({ where: { id: endpoint.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to remove webhook endpoint:', error)
    return NextResponse.json({ error: 'Failed to remove webhook endpoint' }, { status: 500 })
  }
}
