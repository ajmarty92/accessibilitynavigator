export interface ScorableViolation {
  impact?: string
  nodes?: unknown[]
  elementCount?: number
}

// WCAG-impact-weighted deduction. Each violation type costs points based on
// how severe axe-core rated it, scaled slightly by how many elements it hit
// (more affected elements = broader failure, but with diminishing returns so
// one violation type can't single-handedly zero out the score).
const IMPACT_WEIGHT: Record<string, number> = {
  critical: 12,
  serious: 7,
  moderate: 3,
  minor: 1,
}

export function calculateComplianceScore(violations: ScorableViolation[]): number {
  if (!violations || violations.length === 0) return 100

  const deduction = violations.reduce((total, violation) => {
    const weight = IMPACT_WEIGHT[violation.impact ?? ''] ?? IMPACT_WEIGHT.moderate
    const affected = violation.elementCount ?? violation.nodes?.length ?? 1
    // sqrt dampens the effect of a single rule matching hundreds of elements
    const multiplier = 1 + Math.min(Math.sqrt(Math.max(affected, 1)) - 1, 2)
    return total + weight * multiplier
  }, 0)

  return Math.max(0, Math.round(100 - deduction))
}
