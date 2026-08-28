import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

const VALID_ROLES = ['owner', 'admin', 'member']

async function loadTargetMembership(membershipId: string, organizationId: string) {
  const membership = await prisma.membership.findUnique({ where: { id: membershipId } })
  if (!membership || membership.organizationId !== organizationId) return null
  return membership
}

async function wouldRemoveLastOwner(organizationId: string, membershipId: string): Promise<boolean> {
  const remainingOwners = await prisma.membership.count({
    where: { organizationId, role: 'owner', id: { not: membershipId } },
  })
  return remainingOwners === 0
}

// PATCH /api/organization/members/[membershipId] — change a member's role.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { membershipId: string } }
) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can change roles' }, { status: 403 })
    }

    const target = await loadTargetMembership(params.membershipId, ctx.organizationId)
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    const { role } = await request.json()
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Role must be one of: ${VALID_ROLES.join(', ')}` }, { status: 400 })
    }

    if (target.role === 'owner' && role !== 'owner' && (await wouldRemoveLastOwner(ctx.organizationId, target.id))) {
      return NextResponse.json({ error: 'An organization must have at least one owner' }, { status: 400 })
    }

    const updated = await prisma.membership.update({
      where: { id: target.id },
      data: { role },
    })

    return NextResponse.json({ membershipId: updated.id, role: updated.role })
  } catch (error) {
    logger.error('Failed to update member role:', error)
    return NextResponse.json({ error: 'Failed to update member role' }, { status: 500 })
  }
}

// DELETE /api/organization/members/[membershipId] — remove a member.
export async function DELETE(
  request: NextRequest,
  { params }: { params: { membershipId: string } }
) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can remove members' }, { status: 403 })
    }

    const target = await loadTargetMembership(params.membershipId, ctx.organizationId)
    if (!target) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 })
    }

    if (target.role === 'owner' && (await wouldRemoveLastOwner(ctx.organizationId, target.id))) {
      return NextResponse.json({ error: 'An organization must have at least one owner' }, { status: 400 })
    }

    await prisma.membership.delete({ where: { id: target.id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to remove member:', error)
    return NextResponse.json({ error: 'Failed to remove member' }, { status: 500 })
  }
}
