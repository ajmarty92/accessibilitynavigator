export type ConformanceStatus = 'Partially conformant' | 'Not conformant'

export interface StatementViolationInput {
  impact: string
  help?: string
  description?: string
  wcagReference?: string | null
}

export interface StatementManualItemInput {
  status: string
}

export interface StatementInput {
  organizationName: string
  siteUrl: string
  complianceScore: number
  violations: StatementViolationInput[]
  manualAuditItems?: StatementManualItemInput[]
  contactEmail?: string | null
  contactPhone?: string | null
  customNotes?: string | null
  assessmentDate: Date
}

export interface KnownLimitation {
  description: string
  wcagReference: string
  impact: string
}

export interface StatementContent {
  organizationName: string
  siteUrl: string
  conformanceStatus: ConformanceStatus
  conformanceSummary: string
  knownLimitations: KnownLimitation[]
  additionalLimitationCount: number
  methodology: string
  technicalSpecifications: string[]
  manualAuditCompletionPct: number | null
  assessmentDate: Date
  contactEmail?: string | null
  contactPhone?: string | null
  customNotes?: string | null
}

// This deliberately never emits "Fully conformant" — the third status
// WCAG/W3C's own statement model allows for. An automated scan plus a
// possibly-incomplete manual checklist is not a rigorous enough basis to
// tell a court or a disabled user "we have no accessibility barriers."
// "Partially conformant" (most content meets WCAG, known gaps disclosed
// below) is the strongest honest claim this tool can support; anything
// worse than a token number of violations is "Not conformant."
function deriveConformanceStatus(criticalCount: number, seriousCount: number, complianceScore: number): ConformanceStatus {
  if (complianceScore < 50 || criticalCount > 5) {
    return 'Not conformant'
  }
  return 'Partially conformant'
}

const MAX_LISTED_LIMITATIONS = 10

export function generateStatementContent(input: StatementInput): StatementContent {
  const criticalCount = input.violations.filter(v => v.impact === 'critical').length
  const seriousCount = input.violations.filter(v => v.impact === 'serious').length
  const conformanceStatus = deriveConformanceStatus(criticalCount, seriousCount, input.complianceScore)

  const conformanceSummary =
    conformanceStatus === 'Not conformant'
      ? `${input.organizationName} is committed to making ${input.siteUrl} accessible, in accordance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. This website does not yet conform to those guidelines in a number of areas that we are actively working to remediate.`
      : `${input.organizationName} is committed to making ${input.siteUrl} accessible, in accordance with the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA. This website is partially conformant with WCAG 2.1 Level AA — most content meets these standards, with the known exceptions listed below.`

  const impactRank: Record<string, number> = { critical: 4, serious: 3, moderate: 2, minor: 1 }
  const sortedViolations = [...input.violations].sort(
    (a, b) => (impactRank[b.impact] ?? 0) - (impactRank[a.impact] ?? 0)
  )

  const knownLimitations: KnownLimitation[] = sortedViolations.slice(0, MAX_LISTED_LIMITATIONS).map(v => ({
    description: v.help || v.description || 'Accessibility issue identified during automated scanning',
    wcagReference: v.wcagReference || 'Not mapped to a specific criterion',
    impact: v.impact,
  }))

  const manualAuditItems = input.manualAuditItems ?? []
  const manualAuditCompletionPct =
    manualAuditItems.length > 0
      ? Math.round((manualAuditItems.filter(i => i.status !== 'not_started').length / manualAuditItems.length) * 100)
      : null

  const methodology =
    manualAuditCompletionPct !== null
      ? `This statement was prepared based on a self-assessment conducted on ${input.assessmentDate.toLocaleDateString()}, combining automated testing (axe-core, covering WCAG 2.0/2.1/2.2 rules) with a manual verification checklist covering keyboard navigation, screen reader behavior, reading order, color contrast, and form accessibility (${manualAuditCompletionPct}% complete at the time of this assessment).`
      : `This statement was prepared based on a self-assessment conducted on ${input.assessmentDate.toLocaleDateString()}, using automated testing (axe-core, covering WCAG 2.0/2.1/2.2 rules). A manual verification pass had not yet been completed at the time of this assessment; automated testing alone cannot confirm full conformance.`

  return {
    organizationName: input.organizationName,
    siteUrl: input.siteUrl,
    conformanceStatus,
    conformanceSummary,
    knownLimitations,
    additionalLimitationCount: Math.max(0, input.violations.length - knownLimitations.length),
    methodology,
    technicalSpecifications: ['HTML', 'WAI-ARIA', 'CSS', 'JavaScript'],
    manualAuditCompletionPct,
    assessmentDate: input.assessmentDate,
    contactEmail: input.contactEmail,
    contactPhone: input.contactPhone,
    customNotes: input.customNotes,
  }
}
