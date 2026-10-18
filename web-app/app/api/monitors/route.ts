import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireOrganizationContext, isOrganizationAdmin } from '@/lib/organizations'
import { validateUrl } from '@/lib/security'
import { computeNextRunAt, VALID_FREQUENCIES } from '@/lib/monitor-scheduling'
import { checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

// Reads the caller's session on every request — never statically
// pre-rendered/cached, or every user would see the same response.
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_FAIL_ON = ['critical', 'serious', 'moderate', 'any']

// GET /api/monitors — the organization's scheduled monitors.
export async function GET() {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }

    const monitors = await prisma.scheduledMonitor.findMany({
      where: { organizationId: ctx.organizationId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ monitors })
  } catch (error) {
    logger.error('Failed to list monitors:', error)
    return NextResponse.json({ error: 'Failed to list monitors' }, { status: 500 })
  }
}

// POST /api/monitors — create a recurring monitor for a URL. Restricted to
// owners/admins since it commits the org to recurring scan quota usage
// without a human triggering each run.
export async function POST(request: NextRequest) {
  try {
    const ctx = await requireOrganizationContext()
    if (!ctx.ok) {
      return NextResponse.json({ error: ctx.error }, { status: ctx.status })
    }
    const { userId, organizationId } = ctx

    if (!(await isOrganizationAdmin(userId, organizationId))) {
      return NextResponse.json({ error: 'Only organization owners/admins can create monitors' }, { status: 403 })
    }

    const rateLimit = await checkRateLimit(`monitor-create:${organizationId}`, 20, 60 * 60 * 1000)
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: 'Too many monitors created recently. Try again later.' }, { status: 429 })
    }

    const { url, frequency = 'daily', failOn = 'serious', alertEmails } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'A URL is required' }, { status: 400 })
    }
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`
    const validation = await validateUrl(formattedUrl)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.reason || 'Invalid URL' }, { status: 400 })
    }

    if (!VALID_FREQUENCIES.includes(frequency)) {
      return NextResponse.json({ error: `frequency must be one of: ${VALID_FREQUENCIES.join(', ')}` }, { status: 400 })
    }
    if (!VALID_FAIL_ON.includes(failOn)) {
      return NextResponse.json({ error: `failOn must be one of: ${VALID_FAIL_ON.join(', ')}` }, { status: 400 })
    }

    if (!Array.isArray(alertEmails) || alertEmails.length === 0) {
      return NextResponse.json({ error: 'At least one alert email is required' }, { status: 400 })
    }
    if (alertEmails.some((e: unknown) => typeof e !== 'string' || !EMAIL_RE.test(e))) {
      return NextResponse.json({ error: 'One or more alert emails are invalid' }, { status: 400 })
    }

    const activeCount = await prisma.scheduledMonitor.count({ where: { organizationId } })
    if (activeCount >= 25) {
      return NextResponse.json({ error: 'Monitor limit reached. Remove an existing one first.' }, { status: 403 })
    }

    const monitor = await prisma.scheduledMonitor.create({
      data: {
        organizationId,
        createdByUserId: userId,
        url: formattedUrl,
        frequency,
        failOn,
        alertEmails,
        nextRunAt: computeNextRunAt(frequency),
      },
    })

    return NextResponse.json({ monitor })
  } catch (error) {
    logger.error('Failed to create monitor:', error)
    return NextResponse.json({ error: 'Failed to create monitor' }, { status: 500 })
  }
}
