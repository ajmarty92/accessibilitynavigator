import { describe, it } from 'node:test'
import assert from 'node:assert'
import { summarizeLegalRisk } from './legal-report-generator.ts'

describe('summarizeLegalRisk', () => {
  it('rates a site with any critical violation as Critical risk', () => {
    const summary = summarizeLegalRisk([{ impact: 'critical', legalRiskScore: 9 }])
    assert.strictEqual(summary.riskLevel, 'Critical')
  })

  it('rates a clean scan as Low risk', () => {
    const summary = summarizeLegalRisk([])
    assert.strictEqual(summary.riskLevel, 'Low')
    assert.strictEqual(summary.avgLegalRiskScore, null)
  })

  it('averages legal risk score only over violations that have one', () => {
    const summary = summarizeLegalRisk([
      { impact: 'moderate', legalRiskScore: 4 },
      { impact: 'moderate', legalRiskScore: 6 },
      { impact: 'moderate' }, // no AI score — should not pull the average toward 0
    ])
    assert.strictEqual(summary.avgLegalRiskScore, 5)
  })

  it('orders topRiskViolations by legal risk score, highest first', () => {
    const summary = summarizeLegalRisk([
      { impact: 'moderate', legalRiskScore: 2, help: 'low' },
      { impact: 'critical', legalRiskScore: 9, help: 'high' },
      { impact: 'serious', legalRiskScore: 5, help: 'mid' },
    ])
    assert.deepStrictEqual(
      summary.topRiskViolations.map(v => v.help),
      ['high', 'mid', 'low']
    )
  })

  it('computes manual audit completion percentage', () => {
    const summary = summarizeLegalRisk(
      [],
      [{ status: 'pass' }, { status: 'fail' }, { status: 'not_started' }, { status: 'not_started' }]
    )
    assert.strictEqual(summary.manualAuditCompletionPct, 50)
    assert.strictEqual(summary.manualAuditFailCount, 1)
  })
})
