import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { prisma } from './prisma'

export type OrgRole = 'owner' | 'admin' | 'member'

// Every account belongs to at least one Organization. There's no
// org-switcher UI yet, so "primary" is the user's first membership by
// creation order — for the common case (a fresh signup with their own
// personal org) this is unambiguous; for a user added to someone else's
// org later it's a reasonable default until multi-org switching ships.
export async function getPrimaryOrganizationId(userId: string): Promise<string | null> {
  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: 'asc' },
    select: { organizationId: true },
  })
  return membership?.organizationId ?? null
}

export async function requireMembership(userId: string, organizationId: string) {
  return prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  })
}

export async function isOrganizationAdmin(userId: string, organizationId: string): Promise<boolean> {
  const membership = await requireMembership(userId, organizationId)
  return membership?.role === 'owner' || membership?.role === 'admin'
}

export type OrganizationContext =
  | { ok: true; userId: string; organizationId: string }
  | { ok: false; status: 401 | 403; error: string }

// Shared by every route that scopes data to "the caller's organization":
// resolves the session, then the user's primary org, in one call so routes
// don't each re-derive the same 401/403 branches.
export async function requireOrganizationContext(): Promise<OrganizationContext> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return { ok: false, status: 401, error: 'Sign in required' }
  }

  const organizationId = await getPrimaryOrganizationId(session.user.id)
  if (!organizationId) {
    return { ok: false, status: 403, error: 'No organization found for this account' }
  }

  return { ok: true, userId: session.user.id, organizationId }
}

// Called once at registration. Every new user gets a personal org they own
// outright — this is what lets every existing single-user code path (scan,
// bill, issue API keys) work unchanged against "the user's organization"
// instead of needing a separate solo-account code path.
export async function createPersonalOrganization(userId: string, name: string) {
  return prisma.organization.create({
    data: {
      name: `${name}'s Organization`,
      memberships: {
        create: { userId, role: 'owner' },
      },
    },
  })
}
