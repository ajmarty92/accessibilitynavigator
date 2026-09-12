import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPrCommentBody, isAccessibilityNavigatorComment } from './github-pr-comment.ts'
import type { PrCommentInput } from './github-pr-comment.ts'

function baseInput(overrides: Partial<PrCommentInput> = {}): PrCommentInput {
  return {
    passed: true,
    complianceScore: 92,
    previousComplianceScore: 92,
    failOn: 'critical',
    newViolations: [],
    reportUrl: 'https://example.com/results/abc123',
    ...overrides,
  }
}

test('buildPrCommentBody - includes the hidden marker for later lookup', () => {
  const body = buildPrCommentBody(baseInput())
  assert.ok(isAccessibilityNavigatorComment(body))
})

test('buildPrCommentBody - a passing scan reads as a clean pass', () => {
  const body = buildPrCommentBody(baseInput({ passed: true }))
  assert.match(body, /No new violations/)
  assert.doesNotMatch(body, /❌/)
})

test('buildPrCommentBody - a failing scan lists each new violation', () => {
  const body = buildPrCommentBody(
    baseInput({
      passed: false,
      newViolations: [
        { impact: 'critical', wcagReference: 'WCAG 1.1.1', help: 'Images must have alt text', helpUrl: 'https://example.com/rule' },
        { impact: 'serious', wcagReference: null, help: 'Form inputs must have labels', helpUrl: null },
      ],
    })
  )
  assert.match(body, /2 new violations/)
  assert.match(body, /Images must have alt text/)
  assert.match(body, /WCAG 1\.1\.1/)
  assert.match(body, /\[details\]\(https:\/\/example\.com\/rule\)/)
  assert.match(body, /Form inputs must have labels/)
})

test('buildPrCommentBody - singular wording for exactly one new violation', () => {
  const body = buildPrCommentBody(
    baseInput({ passed: false, newViolations: [{ impact: 'critical', help: 'Missing alt text' }] })
  )
  assert.match(body, /1 new violation at or above/)
})

test('buildPrCommentBody - shows the score delta only when it changed', () => {
  const unchanged = buildPrCommentBody(baseInput({ complianceScore: 90, previousComplianceScore: 90 }))
  assert.doesNotMatch(unchanged, /was 90/)

  const changed = buildPrCommentBody(baseInput({ complianceScore: 85, previousComplianceScore: 92 }))
  assert.match(changed, /85\/100 \(was 92\)/)
})

test('isAccessibilityNavigatorComment - false for an unrelated comment', () => {
  assert.equal(isAccessibilityNavigatorComment('just a regular PR comment'), false)
  assert.equal(isAccessibilityNavigatorComment(null), false)
  assert.equal(isAccessibilityNavigatorComment(undefined), false)
})
