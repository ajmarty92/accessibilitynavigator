import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { isGitHubAppConfigured } from '@/lib/github-app'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// GET /api/github/installation — the organization's connected GitHub App
// installation, if any, for the settings page.
export async function GET() {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const installation = await prisma.gitHubInstallation.findFirst({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ installation, appConfigured: isGitHubAppConfigured() })
  } catch (error) {
    logger.error('Failed to fetch GitHub installation:', error)
    return NextResponse.json({ error: 'Failed to fetch GitHub installation' }, { status: 500 })
  }
}

// DELETE /api/github/installation — stops using this installation for PR
// automation. This only removes our own record; it does not revoke the
// App's access on GitHub's side (the user does that from GitHub's own
// installation settings, linked to from the UI) — deleting our row here is
// what a customer wants for "stop commenting on my PRs" without also
// having to leave GitHub to do it.
export async function DELETE() {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can disconnect GitHub' }, { status: 403 })
    }

    await prisma.gitHubInstallation.deleteMany({ where: { organizationId: ctx.organizationId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('Failed to disconnect GitHub installation:', error)
    return NextResponse.json({ error: 'Failed to disconnect GitHub installation' }, { status: 500 })
  }
}
