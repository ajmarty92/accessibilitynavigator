import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

const VALID_ROLES = ['admin', 'member']

// POST /api/organization/members — add an existing user to the
// organization by email. There's no email-invitation flow yet (that needs
// an email provider, tracked separately), so this only works for someone
// who already has an account — a reasonable v1 given teams are usually
// people who already signed up individually before consolidating.
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can add members' }, { status: 403 })
    }

    const { email, role = 'member' } = await request.json()
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (!user) {
      return NextResponse.json(
        { error: 'No account found with that email. Ask them to sign up first, then add them.' },
        { status: 404 }
      )
    }

    const existing = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: ctx.organizationId } },
    })
    if (existing) {
      return NextResponse.json({ error: 'That person is already a member' }, { status: 409 })
    }

    const membership = await prisma.membership.create({
      data: { userId: user.id, organizationId: ctx.organizationId, role },
      include: { user: { select: { id: true, email: true, name: true } } },
    })

    return NextResponse.json({
      membershipId: membership.id,
      userId: membership.userId,
      email: membership.user.email,
      name: membership.user.name,
      role: membership.role,
      createdAt: membership.createdAt,
    })
  } catch (error) {
    logger.error('Failed to add organization member:', error)
    return NextResponse.json({ error: 'Failed to add member' }, { status: 500 })
  }
}
