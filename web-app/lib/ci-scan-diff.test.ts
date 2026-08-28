import { describe, it } from 'node:test'
import assert from 'node:assert'
import { computeNewViolations } from './ci-scan-diff.ts'

describe('computeNewViolations', () => {
  it('returns nothing when current matches baseline exactly', () => {
    const violation = { impact: 'critical', violationId: 'color-contrast', wcagReference: 'WCAG 1.4.3' }
    const result = computeNewViolations([violation], [violation], 'critical')
    assert.deepStrictEqual(result, [])
  })

  it('flags a violation present in current but not in baseline', () => {
    const baseline = [{ impact: 'critical', violationId: 'color-contrast', wcagReference: 'WCAG 1.4.3' }]
    const current = [
      ...baseline,
      { impact: 'critical', violationId: 'label', wcagReference: 'WCAG 4.1.2' },
    ]
    const result = computeNewViolations(current, baseline, 'critical')
    assert.strictEqual(result.length, 1)
    assert.strictEqual(result[0].violationId, 'label')
  })

  it('ignores new violations below the failOn threshold', () => {
    const current = [{ impact: 'minor', violationId: 'landmark-unique', wcagReference: null }]
    const result = computeNewViolations(current, [], 'critical')
    assert.deepStrictEqual(result, [])
  })

  it('"any" threshold catches even minor new violations', () => {
    const current = [{ impact: 'minor', violationId: 'landmark-unique', wcagReference: null }]
    const result = computeNewViolations(current, [], 'any')
    assert.strictEqual(result.length, 1)
  })

  it('does not flag pre-existing debt just because it is severe', () => {
    // 40 known critical violations already on the site — none of them are new.
    const preexisting = Array.from({ length: 40 }, (_, i) => ({
      impact: 'critical',
      violationId: `rule-${i}`,
      wcagReference: `WCAG 1.${i}.1`,
    }))
    const result = computeNewViolations(preexisting, preexisting, 'critical')
    assert.deepStrictEqual(result, [])
  })

  it('same violationId on a different WCAG reference counts as a distinct finding', () => {
    const baseline = [{ impact: 'critical', violationId: 'aria-required-attr', wcagReference: 'WCAG 4.1.2' }]
    const current = [{ impact: 'critical', violationId: 'aria-required-attr', wcagReference: 'WCAG 1.3.1' }]
    const result = computeNewViolations(current, baseline, 'critical')
    assert.strictEqual(result.length, 1)
  })
})
