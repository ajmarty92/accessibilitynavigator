import { test } from 'node:test'
import assert from 'node:assert'
import { mergeViolations } from '../lib/violation-utils'

test('mergeViolations - Basic Merge', () => {
  const axeViolations = [{
    description: 'Images must have alternate text',
    wcagReference: 'WCAG 1.1.1',
    impact: 'critical'
  }]

  const customViolations = [{
    description: 'Custom contrast issue',
    wcagReference: 'WCAG 1.4.3',
    impact: 'moderate'
  }]

  const result = mergeViolations(axeViolations, customViolations)

  assert.strictEqual(result.length, 2)
  // Sorted by impact: critical (0) then moderate (2)
  assert.strictEqual(result[0].description, 'Images must have alternate text')
  assert.strictEqual(result[1].description, 'Custom contrast issue')
})

test('mergeViolations - Deduplication', () => {
  const axeViolations = [{
    description: 'Images must have alternate text',
    wcagReference: 'WCAG 1.1.1',
    impact: 'critical'
  }]

  const customViolations = [{
    description: 'Images must have alternate text',
    wcagReference: 'WCAG 1.1.1',
    impact: 'critical'
  }]

  const result = mergeViolations(axeViolations, customViolations)

  assert.strictEqual(result.length, 1)
  assert.strictEqual(result[0].description, 'Images must have alternate text')
})

test('mergeViolations - Sorting by Impact', () => {
  const violations1 = [
    { description: 'Minor Issue', wcagReference: '1', impact: 'minor' },
    { description: 'Critical Issue', wcagReference: '2', impact: 'critical' }
  ]

  const violations2 = [
    { description: 'Moderate Issue', wcagReference: '3', impact: 'moderate' },
    { description: 'Serious Issue', wcagReference: '4', impact: 'serious' }
  ]

  const result = mergeViolations(violations1, violations2)

  assert.strictEqual(result.length, 4)
  assert.strictEqual(result[0].impact, 'critical')
  assert.strictEqual(result[1].impact, 'serious')
  assert.strictEqual(result[2].impact, 'moderate')
  assert.strictEqual(result[3].impact, 'minor')
})

test('mergeViolations - Empty Inputs', () => {
  const result = mergeViolations([], [])
  assert.strictEqual(result.length, 0)
})

test('mergeViolations - Unknown Impact', () => {
    const v1 = [{ description: 'Unknown', wcagReference: '1', impact: 'unknown' }]
    const v2 = [{ description: 'Critical', wcagReference: '2', impact: 'critical' }]

    const result = mergeViolations(v1, v2)

    assert.strictEqual(result.length, 2)
    assert.strictEqual(result[0].impact, 'critical') // critical (0) < unknown (99)
    assert.strictEqual(result[1].impact, 'unknown')
})
