import { describe, it } from 'node:test'
import assert from 'node:assert'
import { calculateComplianceScore } from './compliance-score.ts'

describe('calculateComplianceScore', () => {
  it('returns 100 for no violations', () => {
    assert.strictEqual(calculateComplianceScore([]), 100)
  })

  it('deducts more for critical impact than minor', () => {
    const critical = calculateComplianceScore([{ impact: 'critical', elementCount: 1 }])
    const minor = calculateComplianceScore([{ impact: 'minor', elementCount: 1 }])
    assert.ok(critical < minor, 'critical violation should deduct more than minor')
  })

  it('is deterministic — same input always produces the same score', () => {
    const violations = [
      { impact: 'serious', elementCount: 3 },
      { impact: 'moderate', elementCount: 1 },
    ]
    assert.strictEqual(
      calculateComplianceScore(violations),
      calculateComplianceScore(violations)
    )
  })

  it('never returns a score below 0', () => {
    const manyCritical = Array.from({ length: 50 }, () => ({
      impact: 'critical',
      elementCount: 100,
    }))
    const score = calculateComplianceScore(manyCritical)
    assert.ok(score >= 0)
  })

  it('dampens the effect of one rule matching many elements vs many separate rules', () => {
    const oneRuleManyElements = calculateComplianceScore([
      { impact: 'moderate', elementCount: 100 },
    ])
    const manyRulesFewElements = calculateComplianceScore(
      Array.from({ length: 10 }, () => ({ impact: 'moderate', elementCount: 1 }))
    )
    assert.ok(
      oneRuleManyElements > manyRulesFewElements,
      'ten distinct violation types should cost more than one type matching many elements'
    )
  })

  it('falls back to a moderate weight for an unrecognized impact value', () => {
    const known = calculateComplianceScore([{ impact: 'moderate', elementCount: 1 }])
    const unknown = calculateComplianceScore([{ impact: 'not-a-real-impact', elementCount: 1 }])
    assert.strictEqual(known, unknown)
  })
})
