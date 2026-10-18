import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Reads a fresh request body every time — never statically pre-rendered.
export const dynamic = 'force-dynamic'

function verifySignature(rawBody: string, signatureHeader: string | null, secret: string): boolean {
  if (!signatureHeader?.startsWith('sha256=')) return false

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  const providedBuffer = Buffer.from(signatureHeader.slice('sha256='.length), 'hex')

  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}

// POST /api/github/webhook — receives GitHub App events. The only ones
// this needs to act on are installation lifecycle changes; PR comments
// themselves are posted synchronously from app/api/ci/scan, not from here.
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.GITHUB_APP_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'GitHub App webhook is not configured' }, { status: 500 })
  }

  const rawBody = await request.text()
  const signature = request.headers.get('x-hub-signature-256')
  if (!verifySignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = request.headers.get('x-github-event')
  let payload: { action?: string; installation?: { id?: number } }
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  try {
    if (event === 'installation') {
      const installationId = payload.installation?.id
      if (typeof installationId === 'number') {
        if (payload.action === 'deleted') {
          await prisma.gitHubInstallation.deleteMany({ where: { installationId } })
        } else if (payload.action === 'suspend') {
          await prisma.gitHubInstallation.updateMany({
            where: { installationId },
            data: { suspendedAt: new Date() },
          })
        } else if (payload.action === 'unsuspend') {
          await prisma.gitHubInstallation.updateMany({
            where: { installationId },
            data: { suspendedAt: null },
          })
        }
      }
    }
    // installation_repositories, ping, and everything else: nothing to do
    // yet — repository selection doesn't affect which org an installation
    // belongs to, and PR automation looks up the installation by org, not
    // by repo list.
  } catch (error) {
    logger.error('Failed to process GitHub webhook event:', error)
    // Still 200 — GitHub retries on non-2xx, and a DB hiccup here isn't
    // something retrying the same event will fix.
  }

  return NextResponse.json({ received: true })
}
