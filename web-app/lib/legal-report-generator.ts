export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low'

export interface LegalRiskViolationInput {
  impact: string
  help?: string
  description?: string
  wcagReference?: string | null
  legalRiskScore?: number | null
}

export interface LegalManualItemInput {
  status: string
}

export interface LegalRiskSummary {
  riskLevel: RiskLevel
  avgLegalRiskScore: number | null
  criticalCount: number
  seriousCount: number
  totalViolations: number
  topRiskViolations: LegalRiskViolationInput[]
  manualAuditCompletionPct: number
  manualAuditFailCount: number
}

const RISK_LEVEL_SUMMARY: Record<RiskLevel, string> = {
  Critical:
    'This site has critical accessibility barriers with a demonstrated pattern in recent ADA/Section 508 litigation. Immediate remediation is recommended to reduce legal exposure.',
  High: 'This site has significant accessibility gaps that plaintiffs’ counsel and regulators commonly cite. Remediation within the next compliance cycle is recommended.',
  Medium:
    'This site has accessibility issues of moderate legal risk. A remediation plan is recommended as part of ongoing compliance maintenance.',
  Low: 'No significant automated violations were found in this scan. Manual verification (see the Manual Audit checklist) is still required before conformance can be claimed.',
}

export function legalRiskSummaryText(riskLevel: RiskLevel): string {
  return RISK_LEVEL_SUMMARY[riskLevel]
}

function deriveRiskLevel(criticalCount: number, seriousCount: number, avgLegalRiskScore: number | null): RiskLevel {
  if (criticalCount > 0 || (avgLegalRiskScore ?? 0) >= 7) return 'Critical'
  if (seriousCount > 0 || (avgLegalRiskScore ?? 0) >= 5) return 'High'
  if (criticalCount + seriousCount > 0 || (avgLegalRiskScore ?? 0) > 0) return 'Medium'
  return 'Low'
}

// Aggregates scan + manual audit results into the numbers a legal/risk
// report actually needs: overall exposure level, the small number of
// findings worth putting in front of counsel, and how complete the human
// verification is (a half-finished manual audit is itself a risk signal —
// it means "Supports" claims in the VPAT can't yet be trusted).
export function summarizeLegalRisk(
  violations: LegalRiskViolationInput[],
  manualAuditItems: LegalManualItemInput[] = []
): LegalRiskSummary {
  const criticalCount = violations.filter(v => v.impact === 'critical').length
  const seriousCount = violations.filter(v => v.impact === 'serious').length

  const scored = violations.filter(v => typeof v.legalRiskScore === 'number')
  const avgLegalRiskScore =
    scored.length > 0
      ? Math.round((scored.reduce((sum, v) => sum + (v.legalRiskScore ?? 0), 0) / scored.length) * 10) / 10
      : null

  const topRiskViolations = [...violations]
    .sort((a, b) => (b.legalRiskScore ?? 0) - (a.legalRiskScore ?? 0))
    .slice(0, 10)

  const manualAuditCompletionPct =
    manualAuditItems.length > 0
      ? Math.round(
          (manualAuditItems.filter(i => i.status !== 'not_started').length / manualAuditItems.length) * 100
        )
      : 0
  const manualAuditFailCount = manualAuditItems.filter(i => i.status === 'fail').length

  return {
    riskLevel: deriveRiskLevel(criticalCount, seriousCount, avgLegalRiskScore),
    avgLegalRiskScore,
    criticalCount,
    seriousCount,
    totalViolations: violations.length,
    topRiskViolations,
    manualAuditCompletionPct,
    manualAuditFailCount,
  }
}
