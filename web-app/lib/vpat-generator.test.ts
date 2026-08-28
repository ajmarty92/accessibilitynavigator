import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateVpatRows, summarizeVpatRows } from './vpat-generator.ts'

describe('generateVpatRows', () => {
  it('marks a criterion "Does Not Support" when a violation references it', () => {
    const rows = generateVpatRows([{ wcagReference: 'WCAG 1.4.3', help: 'Low contrast text' }])
    const row = rows.find(r => r.criterion.id === '1.4.3')
    assert.ok(row)
    assert.strictEqual(row!.conformance, 'Does Not Support')
    assert.match(row!.remarks, /Low contrast text/)
  })

  it('never claims "Supports" for a criterion with no evidence either way', () => {
    const rows = generateVpatRows([], [])
    const row = rows.find(r => r.criterion.id === '2.4.7')
    assert.strictEqual(row!.conformance, 'Not Evaluated')
  })

  it('marks "Supports" only when manual review passed AND no automated violation exists', () => {
    const rows = generateVpatRows(
      [],
      [{ wcagReference: 'WCAG 2.4.7', status: 'pass', title: 'Visible focus indicator' }]
    )
    const row = rows.find(r => r.criterion.id === '2.4.7')
    assert.strictEqual(row!.conformance, 'Supports')
  })

  it('a violation overrides a passed manual check for the same criterion', () => {
    const rows = generateVpatRows(
      [{ wcagReference: 'WCAG 2.4.7', help: 'Missing focus outline' }],
      [{ wcagReference: 'WCAG 2.4.7', status: 'pass', title: 'Visible focus indicator' }]
    )
    const row = rows.find(r => r.criterion.id === '2.4.7')
    assert.strictEqual(row!.conformance, 'Does Not Support')
  })

  it('marks "Not Applicable" when every related manual item is marked not_applicable', () => {
    const rows = generateVpatRows(
      [],
      [{ wcagReference: 'WCAG 1.2.2', status: 'not_applicable', title: 'Captions (Prerecorded)' }]
    )
    const row = rows.find(r => r.criterion.id === '1.2.2')
    assert.strictEqual(row!.conformance, 'Not Applicable')
  })

  it('covers every WCAG 2.1 A/AA criterion exactly once', () => {
    const rows = generateVpatRows([], [])
    const ids = rows.map(r => r.criterion.id)
    assert.strictEqual(ids.length, new Set(ids).size, 'no duplicate criteria')
    assert.ok(ids.length >= 49, 'covers the full WCAG 2.1 A/AA set')
  })
})

describe('summarizeVpatRows', () => {
  it('counts rows by conformance level and totals back to the row count', () => {
    const rows = generateVpatRows([{ wcagReference: 'WCAG 1.4.3' }])
    const summary = summarizeVpatRows(rows)
    const total = Object.values(summary).reduce((a, b) => a + b, 0)
    assert.strictEqual(total, rows.length)
    assert.strictEqual(summary['Does Not Support'], 1)
  })
})
