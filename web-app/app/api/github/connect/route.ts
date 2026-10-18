import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { createInstallState } from '@/lib/github-install-state'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// GET /api/github/connect — starts the GitHub App install flow. Redirects
// to GitHub's own "install this app" page with a signed state token so the
// callback (app/api/github/callback) can recover which organization is
// installing without trusting an unsigned query param.
export async function GET(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (!(await isOrganizationAdmin(ctx.userId, ctx.organizationId))) {
      return NextResponse.redirect(new URL('/settings/github?error=admin_required', request.url))
    }

    const appSlug = process.env.GITHUB_APP_SLUG
    if (!appSlug) {
      return NextResponse.redirect(new URL('/settings/github?error=not_configured', request.url))
    }

    const state = createInstallState(ctx.organizationId)
    const installUrl = new URL(`https://github.com/apps/${appSlug}/installations/new`)
    installUrl.searchParams.set('state', state)

    return NextResponse.redirect(installUrl)
  } catch (error) {
    logger.error('Failed to start GitHub App install flow:', error)
    return NextResponse.redirect(new URL('/settings/github?error=unknown', request.url))
  }
}
