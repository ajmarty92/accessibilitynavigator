import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateStatementContent } from './accessibility-statement-generator.ts'

const baseInput = {
  organizationName: 'Acme Schools',
  siteUrl: 'https://acmeschools.example.com',
  assessmentDate: new Date('2026-08-28'),
}

describe('generateStatementContent', () => {
  it('never claims full conformance, even with zero violations', () => {
    const content = generateStatementContent({ ...baseInput, complianceScore: 100, violations: [] })
    assert.strictEqual(content.conformanceStatus, 'Partially conformant')
    assert.ok(!content.conformanceSummary.toLowerCase().includes('fully conformant'))
  })

  it('marks "Not conformant" when the score is very low', () => {
    const content = generateStatementContent({ ...baseInput, complianceScore: 30, violations: [] })
    assert.strictEqual(content.conformanceStatus, 'Not conformant')
  })

  it('marks "Not conformant" when there are many critical violations even with a middling score', () => {
    const critical = Array.from({ length: 6 }, () => ({ impact: 'critical' }))
    const content = generateStatementContent({ ...baseInput, complianceScore: 70, violations: critical })
    assert.strictEqual(content.conformanceStatus, 'Not conformant')
  })

  it('lists known limitations sorted by severity, most severe first', () => {
    const content = generateStatementContent({
      ...baseInput,
      complianceScore: 80,
      violations: [
        { impact: 'minor', help: 'low' },
        { impact: 'critical', help: 'high' },
        { impact: 'serious', help: 'mid' },
      ],
    })
    assert.deepStrictEqual(
      content.knownLimitations.map(l => l.description),
      ['high', 'mid', 'low']
    )
  })

  it('caps the listed limitations and reports the remainder as a count', () => {
    const violations = Array.from({ length: 15 }, (_, i) => ({ impact: 'moderate', help: `issue-${i}` }))
    const content = generateStatementContent({ ...baseInput, complianceScore: 60, violations })
    assert.strictEqual(content.knownLimitations.length, 10)
    assert.strictEqual(content.additionalLimitationCount, 5)
  })

  it('reports manual audit completion percentage when checklist items are provided', () => {
    const content = generateStatementContent({
      ...baseInput,
      complianceScore: 85,
      violations: [],
      manualAuditItems: [{ status: 'pass' }, { status: 'fail' }, { status: 'not_started' }, { status: 'not_started' }],
    })
    assert.strictEqual(content.manualAuditCompletionPct, 50)
  })

  it('flags that automated-only assessment cannot confirm conformance when no manual audit was provided', () => {
    const content = generateStatementContent({ ...baseInput, complianceScore: 85, violations: [] })
    assert.strictEqual(content.manualAuditCompletionPct, null)
    assert.match(content.methodology, /cannot confirm full conformance/)
  })
})
