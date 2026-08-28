import { describe, it } from 'node:test'
import assert from 'node:assert'
import { computeNextRunAt } from './monitor-scheduling.ts'

describe('computeNextRunAt', () => {
  it('adds 24 hours for a daily monitor', () => {
    const from = new Date('2026-08-28T12:00:00Z')
    const next = computeNextRunAt('daily', from)
    assert.strictEqual(next.toISOString(), '2026-08-29T12:00:00.000Z')
  })

  it('adds 7 days for a weekly monitor', () => {
    const from = new Date('2026-08-28T12:00:00Z')
    const next = computeNextRunAt('weekly', from)
    assert.strictEqual(next.toISOString(), '2026-09-04T12:00:00.000Z')
  })

  it('defaults to daily for an unrecognized frequency rather than throwing', () => {
    const from = new Date('2026-08-28T12:00:00Z')
    const next = computeNextRunAt('fortnightly', from)
    assert.strictEqual(next.toISOString(), '2026-08-29T12:00:00.000Z')
  })
})
