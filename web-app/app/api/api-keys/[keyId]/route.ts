import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// DELETE /api/api-keys/[keyId] — revoke a key. Restricted to owners/admins
// of the organization the key belongs to. Revocation is permanent and
// immediate; the row is kept (not deleted) so lastUsedAt/createdAt remain
// visible in the list for audit purposes.
export async function DELETE(request: Request, { params }: { params: { keyId: string } }) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can revoke API keys' }, { status: 403 })
    }

    const key = await prisma.apiKey.findUnique({ where: { id: params.keyId } })
    if (!key || key.organizationId !== ctx.organizationId) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    await prisma.apiKey.update({
      where: { id: params.keyId },
      data: { revokedAt: new Date() },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to revoke API key:', error)
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 })
  }
}
