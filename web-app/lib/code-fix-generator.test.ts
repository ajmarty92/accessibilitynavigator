import { test } from 'node:test'
import assert from 'node:assert'

// Set dummy API key before imports to avoid SDK initialization issues
process.env.ANTHROPIC_API_KEY = 'dummy'

import { validateCodeFix, type CodeFix } from './code-fix-generator.ts'

test('validateCodeFix - Happy Path', async () => {
  const validFix: CodeFix = {
    id: 'fix-1',
    violationId: 'v-1',
    framework: 'html',
    originalCode: '<div></div>',
    fixedCode: '<div role="main"></div>',
    explanation: 'Valid explanation',
    steps: ['Step 1'],
    testingRecommendations: [],
    browserCompatibility: [],
    additionalImprovements: []
  }

  const result = await validateCodeFix(validFix)
  assert.strictEqual(result.isValid, true)
  assert.strictEqual(result.issues.length, 0)
})

test('validateCodeFix - Validation Logic', async (t) => {
  await t.test('Empty Fixed Code', async () => {
    const invalidFix: CodeFix = {
      id: 'fix-1',
      violationId: 'v-1',
      framework: 'html',
      originalCode: '<div></div>',
      fixedCode: '',
      explanation: 'Valid explanation',
      steps: ['Step 1'],
      testingRecommendations: [],
      browserCompatibility: [],
      additionalImprovements: []
    }

    const result = await validateCodeFix(invalidFix)
    assert.strictEqual(result.isValid, false)
    assert.ok(result.issues.includes('Fixed code is empty'))
  })

  await t.test('Whitespace Fixed Code', async () => {
    const invalidFix: CodeFix = {
      id: 'fix-1',
      violationId: 'v-1',
      framework: 'html',
      originalCode: '<div></div>',
      fixedCode: '   ',
      explanation: 'Valid explanation',
      steps: ['Step 1'],
      testingRecommendations: [],
      browserCompatibility: [],
      additionalImprovements: []
    }

    const result = await validateCodeFix(invalidFix)
    assert.strictEqual(result.isValid, false)
    assert.ok(result.issues.includes('Fixed code is empty'))
  })

  await t.test('Empty Explanation', async () => {
    const invalidFix: CodeFix = {
      id: 'fix-1',
      violationId: 'v-1',
      framework: 'html',
      originalCode: '<div></div>',
      fixedCode: '<div></div>',
      explanation: '',
      steps: ['Step 1'],
      testingRecommendations: [],
      browserCompatibility: [],
      additionalImprovements: []
    }

    const result = await validateCodeFix(invalidFix)
    assert.strictEqual(result.isValid, false)
    assert.ok(result.issues.includes('Explanation is missing'))
  })

  await t.test('Empty Steps', async () => {
    const invalidFix: CodeFix = {
      id: 'fix-1',
      violationId: 'v-1',
      framework: 'html',
      originalCode: '<div></div>',
      fixedCode: '<div></div>',
      explanation: 'Valid explanation',
      steps: [],
      testingRecommendations: [],
      browserCompatibility: [],
      additionalImprovements: []
    }

    const result = await validateCodeFix(invalidFix)
    assert.strictEqual(result.isValid, false)
    assert.ok(result.issues.includes('No implementation steps provided'))
  })

  await t.test('Multiple Failures', async () => {
    const invalidFix: CodeFix = {
      id: 'fix-1',
      violationId: 'v-1',
      framework: 'html',
      originalCode: '<div></div>',
      fixedCode: '',
      explanation: '',
      steps: [],
      testingRecommendations: [],
      browserCompatibility: [],
      additionalImprovements: []
    }

    const result = await validateCodeFix(invalidFix)
    assert.strictEqual(result.isValid, false)
    assert.ok(result.issues.includes('Fixed code is empty'))
    assert.ok(result.issues.includes('Explanation is missing'))
    assert.ok(result.issues.includes('No implementation steps provided'))
  })
})

test('validateCodeFix - Framework Specific Logic', async (t) => {
  await t.test('React Suggestion (Missing ARIA)', async () => {
    const fix: CodeFix = {
      id: 'fix-1',
      violationId: 'v-1',
      framework: 'react',
      originalCode: '<div></div>',
      fixedCode: '<div>Fixed</div>',
      explanation: 'Valid explanation',
      steps: ['Step 1'],
      testingRecommendations: [],
      browserCompatibility: [],
      additionalImprovements: []
    }

    const result = await validateCodeFix(fix)
    assert.strictEqual(result.isValid, true)
    assert.ok(result.suggestions.includes('Consider adding ARIA attributes for better accessibility'))
  })

  await t.test('React No Suggestion (With ARIA)', async () => {
    const fix: CodeFix = {
      id: 'fix-1',
      violationId: 'v-1',
      framework: 'react',
      originalCode: '<div></div>',
      fixedCode: '<div aria-label="Label">Fixed</div>',
      explanation: 'Valid explanation',
      steps: ['Step 1'],
      testingRecommendations: [],
      browserCompatibility: [],
      additionalImprovements: []
    }

    const result = await validateCodeFix(fix)
    assert.strictEqual(result.isValid, true)
    assert.strictEqual(result.suggestions.length, 0)
  })

  await t.test('React No Suggestion (With Role)', async () => {
    const fix: CodeFix = {
      id: 'fix-1',
      violationId: 'v-1',
      framework: 'react',
      originalCode: '<div></div>',
      fixedCode: '<div role="button">Fixed</div>',
      explanation: 'Valid explanation',
      steps: ['Step 1'],
      testingRecommendations: [],
      browserCompatibility: [],
      additionalImprovements: []
    }

    const result = await validateCodeFix(fix)
    assert.strictEqual(result.isValid, true)
    assert.strictEqual(result.suggestions.length, 0)
  })

  await t.test('Non-React Framework (No Suggestion)', async () => {
    const fix: CodeFix = {
      id: 'fix-1',
      violationId: 'v-1',
      framework: 'vue',
      originalCode: '<div></div>',
      fixedCode: '<div>Fixed</div>',
      explanation: 'Valid explanation',
      steps: ['Step 1'],
      testingRecommendations: [],
      browserCompatibility: [],
      additionalImprovements: []
    }

    const result = await validateCodeFix(fix)
    assert.strictEqual(result.isValid, true)
    assert.strictEqual(result.suggestions.length, 0)
  })
})
