import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// GET /api/organization — the caller's organization, their role in it, and
// its member list.
export async function GET() {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const [organization, memberships] = await Promise.all([
      prisma.organization.findUnique({ where: { id: ctx.organizationId } }),
      prisma.membership.findMany({
        where: { organizationId: ctx.organizationId },
        include: { user: { select: { id: true, email: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const callerMembership = memberships.find(m => m.userId === ctx.userId)

    return NextResponse.json({
      organization: { id: organization.id, name: organization.name },
      role: callerMembership?.role ?? 'member',
      members: memberships.map(m => ({
        membershipId: m.id,
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        role: m.role,
        createdAt: m.createdAt,
      })),
    })
  } catch (error) {
    logger.error('Failed to fetch organization:', error)
    return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 })
  }
}

// PATCH /api/organization — rename the organization. Owners/admins only.
export async function PATCH(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can rename it' }, { status: 403 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'A name is required' }, { status: 400 })
    }

    const organization = await prisma.organization.update({
      where: { id: ctx.organizationId },
      data: { name: name.trim() },
    })

    return NextResponse.json({ organization: { id: organization.id, name: organization.name } })
  } catch (error) {
    logger.error('Failed to update organization:', error)
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 })
  }
}
