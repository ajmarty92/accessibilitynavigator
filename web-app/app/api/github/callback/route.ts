import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationContext } from '@/lib/organizations'
import { verifyInstallState } from '@/lib/github-install-state'
import { fetchInstallationDetails } from '@/lib/github-app'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// GET /api/github/callback — GitHub redirects here after the user installs
// (or manages) the App, with `installation_id` and the `state` we handed it
// in app/api/github/connect. Verifying both the signed state AND that the
// signed-in session still belongs to that same organization means neither
// a tampered state nor a stale link left open in another tab can attach an
// installation to the wrong org.
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const installationIdRaw = params.get('installation_id')
  const state = params.get('state')
  const setupAction = params.get('setup_action')

  if (setupAction === 'request') {
    // A repo/org admin requested the install; someone else has to approve
    // it. Nothing to link yet.
    return NextResponse.redirect(new URL('/settings/github?status=requested', request.url))
  }

  if (!installationIdRaw || !state) {
    return NextResponse.redirect(new URL('/settings/github?error=invalid_callback', request.url))
  }

  const installationId = parseInt(installationIdRaw, 10)
  if (!Number.isInteger(installationId)) {
    return NextResponse.redirect(new URL('/settings/github?error=invalid_callback', request.url))
  }

  const stateOrganizationId = verifyInstallState(state)
  if (!stateOrganizationId) {
    return NextResponse.redirect(new URL('/settings/github?error=expired_state', request.url))
  }

  const ctx = await requireOrganizationContext()
  if (!ctx.ok || ctx.organizationId !== stateOrganizationId) {
    return NextResponse.redirect(new URL('/settings/github?error=session_mismatch', request.url))
  }

  try {
    const details = await fetchInstallationDetails(installationId)

    await prisma.gitHubInstallation.upsert({
      where: { installationId },
      create: {
        organizationId: ctx.organizationId,
        installationId,
        accountLogin: details.accountLogin,
        accountType: details.accountType,
        repositorySelection: details.repositorySelection,
      },
      update: {
        organizationId: ctx.organizationId,
        accountLogin: details.accountLogin,
        accountType: details.accountType,
        repositorySelection: details.repositorySelection,
        suspendedAt: null,
      },
    })

    return NextResponse.redirect(new URL('/settings/github?connected=1', request.url))
  } catch (error) {
    logger.error('Failed to complete GitHub App install:', error)
    return NextResponse.redirect(new URL('/settings/github?error=unknown', request.url))
  }
}
