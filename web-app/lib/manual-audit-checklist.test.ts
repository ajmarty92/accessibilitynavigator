import { describe, it } from 'node:test'
import assert from 'node:assert'
import { MANUAL_AUDIT_CHECKLIST } from './manual-audit-checklist.ts'

describe('MANUAL_AUDIT_CHECKLIST', () => {
  it('has no duplicate codes', () => {
    // The Prisma seed step uses skipDuplicates on the [scanId, code] unique
    // constraint — a duplicate code here would silently vanish instead of
    // erroring, so this needs to be caught in a test.
    const codes = MANUAL_AUDIT_CHECKLIST.map(item => item.code)
    assert.strictEqual(codes.length, new Set(codes).size)
  })

  it('every item has non-empty title and guidance', () => {
    for (const item of MANUAL_AUDIT_CHECKLIST) {
      assert.ok(item.title.trim().length > 0, `${item.code} is missing a title`)
      assert.ok(item.guidance.trim().length > 0, `${item.code} is missing guidance`)
    }
  })

  it('covers each expected category at least once', () => {
    const categories = new Set(MANUAL_AUDIT_CHECKLIST.map(item => item.category))
    for (const expected of [
      'keyboard-navigation',
      'screen-reader',
      'reading-order',
      'color-and-contrast',
      'zoom-and-reflow',
      'forms',
    ]) {
      assert.ok(categories.has(expected), `missing category: ${expected}`)
    }
  })
})
