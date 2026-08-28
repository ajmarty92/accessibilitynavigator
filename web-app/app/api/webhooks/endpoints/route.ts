import { NextRequest, NextResponse } from 'next/server'
import { generateWebhookSecret } from '@/lib/webhook-signing'
import { isFeatureAvailable } from '@/lib/usage-tracking'
import { checkRateLimit } from '@/lib/rate-limit'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { validateUrl } from '@/lib/security'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

// GET /api/webhooks/endpoints — list the organization's webhook endpoints.
// Never returns the signing secret after creation.
export async function GET() {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { organizationId: ctx.organizationId },
      select: {
        id: true,
        url: true,
        enabled: true,
        lastDeliveryAt: true,
        lastDeliveryStatus: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ endpoints })
  } catch (error) {
    logger.error('Failed to list webhook endpoints:', error)
    return NextResponse.json({ error: 'Failed to list webhook endpoints' }, { status: 500 })
  }
}

// POST /api/webhooks/endpoints — register a new endpoint. Gated by
// api_access, same tier as API keys, and restricted to owners/admins since
// it changes what data leaves the organization. Returns the signing secret
// exactly once.
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    const { userId, organizationId } = ctx

    if (!(await isOrganizationAdmin(userId, organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can add webhook endpoints' }, { status: 403 })
    }

    const hasApiAccess = await isFeatureAvailable(organizationId, 'api_access')
    if (!hasApiAccess) {
      return NextResponse.json(
        { error: 'Webhooks are not included in your current plan. Upgrade to Professional or higher.' },
        { status: 403 }
      )
    }

    const rateLimit = await checkRateLimit(`webhook-create:${organizationId}`, 10, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many endpoints created recently. Try again later.' }, { status: 429 })
    }

    const { url } = await request.json()
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A URL is required' }, { status: 400 })
    }

    let parsed: URL
    try {
      parsed = new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }
    if (parsed.protocol !== 'https:') {
      return NextResponse.json({ error: 'Webhook URL must use HTTPS' }, { status: 400 })
    }

    // Same SSRF protection as scan targets — a webhook URL is another
    // server-side fetch to a customer-supplied address, private-network
    // destinations included.
    const validation = await validateUrl(parsed.toString())
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason || 'Invalid webhook URL' }, { status: 400 })
    }

    const activeCount = await prisma.webhookEndpoint.count({ where: { organizationId } })
    if (activeCount >= 10) {
      return NextResponse.json({ error: 'Endpoint limit reached. Remove an existing one first.' }, { status: 403 })
    }

    const secret = generateWebhookSecret()
    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        organizationId,
        createdByUserId: userId,
        url: parsed.toString(),
        secret,
      },
    })

    return NextResponse.json({
      id: endpoint.id,
      url: endpoint.url,
      enabled: endpoint.enabled,
      createdAt: endpoint.createdAt,
      secret, // shown once — the client must save it now
    })
  } catch (error) {
    logger.error('Failed to create webhook endpoint:', error)
    return NextResponse.json({ error: 'Failed to create webhook endpoint' }, { status: 500 })
  }
}
