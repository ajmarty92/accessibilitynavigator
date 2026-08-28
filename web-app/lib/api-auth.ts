import { NextRequest } from 'next/server'
import { resolveOrganizationFromApiKey } from './api-keys'
import { requireOrganizationContext } from './organizations'
import { isFeatureAvailable } from './usage-tracking'

export interface ApiIdentity {
  organizationId: string
  userId?: string
  authMethod: 'session' | 'api-key'
}

// Lets the existing session-authenticated read routes (GET /api/scans,
// /api/scans/[scanId], /api/sites, /api/scans/stats) double as the public
// API — a browser tab and a `curl -H "Authorization: Bearer ..."` both
// resolve to "which organization is this for", so there's no separate,
// duplicated `/api/v1/...` surface to keep in sync with the routes the
// frontend already uses.
export async function resolveApiIdentity(request: NextRequest): Promise<ApiIdentity | null> {
  const authHeader = request.headers.get('authorization') || ''
  if (authHeader.startsWith('Bearer ')) {
    const resolved = await resolveOrganizationFromApiKey(authHeader.slice('Bearer '.length).trim())
    if (!resolved) return null
    return { organizationId: resolved.organizationId, authMethod: 'api-key' }
  }

  const ctx = await requireOrganizationContext()
  if (!ctx.ok) return null
  return { organizationId: ctx.organizationId, userId: ctx.userId, authMethod: 'session' }
}

// API-key access additionally requires the plan to include api_access — a
// browser session doesn't need this check, since that's just someone using
// the product's own UI, not programmatic access. Returns an error message
// to return as a 403 if the gate fails, or null if the caller may proceed.
export async function checkApiAccessGate(identity: ApiIdentity): Promise<string | null> {
  if (identity.authMethod !== 'api-key') return null

  const hasApiAccess = await isFeatureAvailable(identity.organizationId, 'api_access')
  if (!hasApiAccess) {
    return 'API access is not included in your current plan. Upgrade to Professional or higher.'
  }

  return null
}
