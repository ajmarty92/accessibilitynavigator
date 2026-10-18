import { test } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createInstallState, verifyInstallState } from './github-install-state.ts'

process.env.NEXTAUTH_SECRET = 'test-secret'

test('createInstallState / verifyInstallState - round-trips the organizationId', () => {
  const state = createInstallState('org_123')
  assert.equal(verifyInstallState(state), 'org_123')
})

test('verifyInstallState - rejects a tampered payload', () => {
  const state = createInstallState('org_123')
  const [, signature] = state.split('.')
  const tamperedPayload = Buffer.from(
    JSON.stringify({ organizationId: 'org_456', exp: Date.now() + 60_000 })
  ).toString('base64url')
  assert.equal(verifyInstallState(`${tamperedPayload}.${signature}`), null)
})

test('verifyInstallState - rejects an expired state', () => {
  const encodedPayload = Buffer.from(
    JSON.stringify({ organizationId: 'org_123', exp: Date.now() - 1000 })
  ).toString('base64url')
  const signature = crypto.createHmac('sha256', 'test-secret').update(encodedPayload).digest('base64url')
  assert.equal(verifyInstallState(`${encodedPayload}.${signature}`), null)
})

test('verifyInstallState - rejects a malformed state', () => {
  assert.equal(verifyInstallState('not-a-valid-state'), null)
  assert.equal(verifyInstallState(''), null)
})
