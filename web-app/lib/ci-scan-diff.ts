export const IMPACT_RANK: Record<string, number> = { critical: 4, serious: 3, moderate: 2, minor: 1 }
export const FAIL_ON_THRESHOLD: Record<string, number> = { critical: 4, serious: 3, moderate: 2, any: 1 }
export const VALID_FAIL_ON_VALUES = Object.keys(FAIL_ON_THRESHOLD)

export interface DiffableViolation {
  impact: string
  violationId: string
  wcagReference?: string | null
}

function fingerprint(v: DiffableViolation): string {
  return `${v.violationId}::${v.wcagReference || ''}`
}

// A violation only counts against a baseline diff if it's both severe
// enough to matter (>= the failOn threshold) and wasn't already present in
// the prior scan of the same URL — this is what lets a CI gate catch
// regressions without blocking every PR on pre-existing debt.
export function computeNewViolations<T extends DiffableViolation>(
  current: T[],
  baseline: DiffableViolation[],
  failOn: string
): T[] {
  const threshold = FAIL_ON_THRESHOLD[failOn] ?? FAIL_ON_THRESHOLD.critical
  const baselineFingerprints = new Set(baseline.map(fingerprint))

  return current
    .filter(v => (IMPACT_RANK[v.impact] ?? 0) >= threshold)
    .filter(v => !baselineFingerprints.has(fingerprint(v)))
}
