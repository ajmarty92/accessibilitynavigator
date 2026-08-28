import crypto from 'node:crypto'

const SECRET_PREFIX = 'whsec_'

export function generateWebhookSecret(): string {
  return `${SECRET_PREFIX}${crypto.randomBytes(24).toString('hex')}`
}

// HMAC-SHA256 over the raw JSON body, hex-encoded — the same scheme
// Stripe/GitHub webhooks use, so it's a pattern integrators already know.
// Signing (not just hashing) matters here: it proves the payload came from
// us and wasn't tampered with in transit, without needing the secret to be
// sent alongside the payload.
export function signWebhookPayload(secret: string, rawBody: string): string {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
}

// Constant-time comparison — a naive `===` leaks timing information an
// attacker could use to guess the signature byte by byte.
export function verifyWebhookSignature(secret: string, rawBody: string, signature: string): boolean {
  const expected = signWebhookPayload(secret, rawBody)
  const expectedBuffer = Buffer.from(expected, 'hex')
  const providedBuffer = Buffer.from(signature, 'hex')

  if (expectedBuffer.length !== providedBuffer.length) return false
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer)
}
