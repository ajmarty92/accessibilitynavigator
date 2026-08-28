import { NextRequest, NextResponse } from 'next/server'
import { generateApiKey } from '@/lib/api-keys'
import { isFeatureAvailable } from '@/lib/usage-tracking'
import { checkRateLimit } from '@/lib/rate-limit'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// GET /api/api-keys — list the signed-in user's organization's keys. Never
// returns the hash or plaintext key, only enough to identify each one.
export async function GET() {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const keys = await prisma.apiKey.findMany({
      where: { organizationId: ctx.organizationId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        lastUsedAt: true,
        revokedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ keys })
  } catch (error) {
    logger.error('Failed to list API keys:', error)
    return NextResponse.json({ error: 'Failed to list API keys' }, { status: 500 })
  }
}

// POST /api/api-keys — create a new key for the organization. Gated by the
// api_access feature (Professional/Enterprise tiers) and restricted to
// owners/admins, since a key acts on behalf of the whole org. Returns the
// plaintext key exactly once.
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    const { userId, organizationId } = ctx

    if (!(await isOrganizationAdmin(userId, organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can create API keys' }, { status: 403 })
    }

    const hasApiAccess = await isFeatureAvailable(organizationId, 'api_access')
    if (!hasApiAccess) {
      return NextResponse.json(
        { error: 'API access is not included in your current plan. Upgrade to Professional or higher.' },
        { status: 403 }
      )
    }

    const rateLimit = await checkRateLimit(`api-key-create:${organizationId}`, 10, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many keys created recently. Try again later.' }, { status: 429 })
    }

    const { name } = await request.json()
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'A name is required, e.g. "GitHub Actions"' }, { status: 400 })
    }

    const activeKeyCount = await prisma.apiKey.count({ where: { organizationId, revokedAt: null } })
    if (activeKeyCount >= 20) {
      return NextResponse.json({ error: 'Key limit reached. Revoke an existing key first.' }, { status: 403 })
    }

    const generated = generateApiKey()
    const record = await prisma.apiKey.create({
      data: {
        organizationId,
        createdByUserId: userId,
        name: name.trim(),
        keyPrefix: generated.prefix,
        keyHash: generated.hash,
      },
    })

    return NextResponse.json({
      id: record.id,
      name: record.name,
      keyPrefix: record.keyPrefix,
      createdAt: record.createdAt,
      key: generated.key, // shown once — the client must save it now
    })
  } catch (error) {
    logger.error('Failed to create API key:', error)
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 })
  }
}
