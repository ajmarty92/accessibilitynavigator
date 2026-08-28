import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateWebhookSecret, signWebhookPayload, verifyWebhookSignature } from './webhook-signing.ts'

describe('generateWebhookSecret', () => {
  it('produces a secret with the expected prefix and no two alike', () => {
    const a = generateWebhookSecret()
    const b = generateWebhookSecret()
    assert.ok(a.startsWith('whsec_'))
    assert.notStrictEqual(a, b)
  })
})

describe('signWebhookPayload / verifyWebhookSignature', () => {
  it('a signature verifies against the exact payload it was made from', () => {
    const secret = generateWebhookSecret()
    const body = JSON.stringify({ event: 'scan.completed', scanId: 'abc123' })
    const signature = signWebhookPayload(secret, body)
    assert.strictEqual(verifyWebhookSignature(secret, body, signature), true)
  })

  it('rejects a signature if the payload was tampered with after signing', () => {
    const secret = generateWebhookSecret()
    const body = JSON.stringify({ event: 'scan.completed', complianceScore: 90 })
    const signature = signWebhookPayload(secret, body)
    const tamperedBody = JSON.stringify({ event: 'scan.completed', complianceScore: 40 })
    assert.strictEqual(verifyWebhookSignature(secret, tamperedBody, signature), false)
  })

  it('rejects a signature made with the wrong secret', () => {
    const body = JSON.stringify({ event: 'scan.completed' })
    const signature = signWebhookPayload(generateWebhookSecret(), body)
    assert.strictEqual(verifyWebhookSignature(generateWebhookSecret(), body, signature), false)
  })

  it('rejects a malformed/short signature without throwing', () => {
    const secret = generateWebhookSecret()
    assert.strictEqual(verifyWebhookSignature(secret, '{}', 'not-a-real-signature'), false)
  })
})
