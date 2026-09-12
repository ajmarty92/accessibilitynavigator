import crypto from 'node:crypto'

// Short-lived signed token carrying the organizationId through GitHub's
// install flow: we redirect to github.com/apps/<slug>/installations/new
// with this as `state`, GitHub round-trips it back unchanged to our
// callback, and we recover which of our organizations the install
// belongs to. Signed (not just base64) so a tampered organizationId can't
// attach someone else's org to an installation; short-lived so an old
// link found lying around can't be replayed.
const STATE_TTL_MS = 10 * 60 * 1000

function getSigningSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('NEXTAUTH_SECRET is not configured')
  }
  return secret
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSigningSecret()).update(payload).digest('base64url')
}

export function createInstallState(organizationId: string): string {
  const payload = JSON.stringify({ organizationId, exp: Date.now() + STATE_TTL_MS })
  const encodedPayload = Buffer.from(payload).toString('base64url')
  return `${encodedPayload}.${sign(encodedPayload)}`
}

export function verifyInstallState(state: string): string | null {
  const [encodedPayload, signature] = state.split('.')
  if (!encodedPayload || !signature) return null

  const expectedSignature = sign(encodedPayload)
  const expectedBuffer = Buffer.from(expectedSignature)
  const providedBuffer = Buffer.from(signature)
  if (expectedBuffer.length !== providedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    return null
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'))
    if (typeof payload.organizationId !== 'string' || typeof payload.exp !== 'number') return null
    if (Date.now() > payload.exp) return null
    return payload.organizationId
  } catch {
    return null
  }
}
