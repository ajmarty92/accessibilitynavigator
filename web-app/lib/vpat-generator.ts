import { WCAG_CRITERIA, extractCriterionId } from './wcag-criteria.ts'
import type { WcagCriterion } from './wcag-criteria.ts'

export type ConformanceLevel = 'Supports' | 'Does Not Support' | 'Not Applicable' | 'Not Evaluated'

export interface VpatRow {
  criterion: WcagCriterion
  conformance: ConformanceLevel
  remarks: string
}

export interface VpatViolationInput {
  wcagReference?: string | null
  help?: string
  description?: string
}

export interface VpatManualItemInput {
  wcagReference?: string | null
  status: string
  title?: string
}

// Derives a best-effort VPAT 2.4 (WCAG Edition) conformance table from scan
// violations and manual audit results. This is intentionally conservative:
// a criterion is only marked "Supports" when both no automated violation
// was found AND a human explicitly verified it in the manual audit —
// everything else that wasn't specifically exercised is "Not Evaluated"
// rather than assumed to pass. Automated-only scanning cannot honestly
// claim conformance for criteria it never tested.
export function generateVpatRows(
  violations: VpatViolationInput[],
  manualAuditItems: VpatManualItemInput[] = []
): VpatRow[] {
  return WCAG_CRITERIA.map(criterion => {
    const relatedViolations = violations.filter(
      v => extractCriterionId(v.wcagReference) === criterion.id
    )
    const relatedManualItems = manualAuditItems.filter(
      i => extractCriterionId(i.wcagReference) === criterion.id
    )

    if (relatedViolations.length > 0) {
      const examples = relatedViolations
        .slice(0, 3)
        .map(v => v.help || v.description)
        .filter(Boolean)
        .join('; ')
      return {
        criterion,
        conformance: 'Does Not Support',
        remarks: `${relatedViolations.length} automated violation(s) found${examples ? `: ${examples}` : ''}${
          relatedViolations.length > 3 ? '…' : ''
        }`,
      }
    }

    const failedManual = relatedManualItems.find(i => i.status === 'fail')
    if (failedManual) {
      return {
        criterion,
        conformance: 'Does Not Support',
        remarks: `Manual review failed: ${failedManual.title || 'see manual audit checklist'}`,
      }
    }

    if (relatedManualItems.length > 0 && relatedManualItems.every(i => i.status === 'not_applicable')) {
      return { criterion, conformance: 'Not Applicable', remarks: 'Marked not applicable in manual review' }
    }

    if (
      relatedManualItems.length > 0 &&
      relatedManualItems.every(i => i.status === 'pass' || i.status === 'not_applicable')
    ) {
      return {
        criterion,
        conformance: 'Supports',
        remarks: 'No automated violations found; verified in manual review',
      }
    }

    if (relatedManualItems.length > 0) {
      return {
        criterion,
        conformance: 'Not Evaluated',
        remarks: 'Manual review not yet completed for this criterion',
      }
    }

    return {
      criterion,
      conformance: 'Not Evaluated',
      remarks: 'No automated violations found, but this criterion requires manual verification this scan did not cover',
    }
  })
}

export function summarizeVpatRows(rows: VpatRow[]): Record<ConformanceLevel, number> {
  return rows.reduce(
    (summary, row) => {
      summary[row.conformance] += 1
      return summary
    },
    { Supports: 0, 'Does Not Support': 0, 'Not Applicable': 0, 'Not Evaluated': 0 } as Record<
      ConformanceLevel,
      number
    >
  )
}
