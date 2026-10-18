import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildDocumentViolations } from './document-accessibility-checker.ts'
import type { DocumentFacts } from './document-accessibility-checker.ts'

function cleanFacts(overrides: Partial<DocumentFacts> = {}): DocumentFacts {
  return {
    pageCount: 5,
    isTagged: true,
    documentTitle: 'Annual Report 2026',
    documentLanguage: 'en-US',
    accessibilityExtractionBlocked: false,
    imagesWithoutAlt: [],
    headings: [{ level: 1, page: 1 }, { level: 2, page: 2 }],
    tablesWithoutHeaderCount: 0,
    formFieldsWithoutDescriptionCount: 0,
    hasNoTextLayer: false,
    hasOutline: false,
    ...overrides,
  }
}

function ids(violations: ReturnType<typeof buildDocumentViolations>): string[] {
  return violations.map(v => v.checkId)
}

test('buildDocumentViolations - a fully clean document has no violations', () => {
  assert.deepEqual(buildDocumentViolations(cleanFacts()), [])
})

test('buildDocumentViolations - flags an untagged document as critical', () => {
  const violations = buildDocumentViolations(cleanFacts({ isTagged: false }))
  assert.ok(ids(violations).includes('untagged-document'))
  assert.equal(violations.find(v => v.checkId === 'untagged-document')?.impact, 'critical')
})

test('buildDocumentViolations - flags missing title and language independently', () => {
  const violations = buildDocumentViolations(cleanFacts({ documentTitle: null, documentLanguage: null }))
  assert.ok(ids(violations).includes('missing-document-title'))
  assert.ok(ids(violations).includes('missing-document-language'))
})

test('buildDocumentViolations - flags blocked accessibility-extraction permission', () => {
  const violations = buildDocumentViolations(cleanFacts({ accessibilityExtractionBlocked: true }))
  assert.ok(ids(violations).includes('accessibility-extraction-blocked'))
})

test('buildDocumentViolations - counts images missing alt text', () => {
  const violations = buildDocumentViolations(
    cleanFacts({ imagesWithoutAlt: [{ page: 1 }, { page: 3 }] })
  )
  const violation = violations.find(v => v.checkId === 'images-missing-alt-text')
  assert.equal(violation?.elementCount, 2)
})

test('buildDocumentViolations - flags a document with headings but no H1', () => {
  const violations = buildDocumentViolations(
    cleanFacts({ headings: [{ level: 2, page: 1 }, { level: 3, page: 2 }] })
  )
  assert.ok(ids(violations).includes('no-top-level-heading'))
})

test('buildDocumentViolations - flags a skipped heading level (H1 straight to H3)', () => {
  const violations = buildDocumentViolations(
    cleanFacts({ headings: [{ level: 1, page: 1 }, { level: 3, page: 2 }] })
  )
  const violation = violations.find(v => v.checkId === 'skipped-heading-levels')
  assert.equal(violation?.elementCount, 1)
})

test('buildDocumentViolations - does not flag a document with no headings at all', () => {
  const violations = buildDocumentViolations(cleanFacts({ headings: [] }))
  assert.equal(ids(violations).includes('no-top-level-heading'), false)
  assert.equal(ids(violations).includes('skipped-heading-levels'), false)
})

test('buildDocumentViolations - flags tables missing header cells', () => {
  const violations = buildDocumentViolations(cleanFacts({ tablesWithoutHeaderCount: 2 }))
  const violation = violations.find(v => v.checkId === 'tables-missing-headers')
  assert.equal(violation?.elementCount, 2)
})

test('buildDocumentViolations - flags form fields with no accessible description', () => {
  const violations = buildDocumentViolations(cleanFacts({ formFieldsWithoutDescriptionCount: 3 }))
  const violation = violations.find(v => v.checkId === 'form-fields-missing-description')
  assert.equal(violation?.elementCount, 3)
})

test('buildDocumentViolations - flags a scanned document with no text layer', () => {
  const violations = buildDocumentViolations(cleanFacts({ hasNoTextLayer: true }))
  assert.ok(ids(violations).includes('scanned-no-text-layer'))
})

test('buildDocumentViolations - flags a long document with no bookmarks', () => {
  const violations = buildDocumentViolations(cleanFacts({ pageCount: 25, hasOutline: false }))
  assert.ok(ids(violations).includes('long-document-no-bookmarks'))
})

test('buildDocumentViolations - does not flag a long document that has bookmarks', () => {
  const violations = buildDocumentViolations(cleanFacts({ pageCount: 25, hasOutline: true }))
  assert.equal(ids(violations).includes('long-document-no-bookmarks'), false)
})

test('buildDocumentViolations - does not flag a short document for missing bookmarks', () => {
  const violations = buildDocumentViolations(cleanFacts({ pageCount: 5, hasOutline: false }))
  assert.equal(ids(violations).includes('long-document-no-bookmarks'), false)
})
