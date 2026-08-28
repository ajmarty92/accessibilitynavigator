export interface MonitorAlertViolation {
  impact: string
  help: string
  wcagReference?: string | null
}

export interface MonitorAlertInput {
  url: string
  newViolations: MonitorAlertViolation[]
  complianceScore: number
  previousComplianceScore: number | null
  reportUrl: string
}

export interface MonitorAlertEmail {
  subject: string
  html: string
  text: string
}

const IMPACT_LABELS: Record<string, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
}

// Only called when there's something new to report (the cron job checks
// newViolations.length > 0 before calling this) — this function doesn't
// itself decide whether an email is warranted, just how to write one.
export function buildMonitorAlertEmail(input: MonitorAlertInput): MonitorAlertEmail {
  const criticalCount = input.newViolations.filter(v => v.impact === 'critical').length
  const scoreChange =
    input.previousComplianceScore !== null ? input.complianceScore - input.previousComplianceScore : null

  const subject =
    criticalCount > 0
      ? `⚠ ${criticalCount} new critical accessibility issue${criticalCount === 1 ? '' : 's'} on ${input.url}`
      : `New accessibility issues found on ${input.url}`

  const listItemsHtml = input.newViolations
    .map(
      v =>
        `<li><strong>${IMPACT_LABELS[v.impact] || v.impact}:</strong> ${v.help}${
          v.wcagReference ? ` <span style="color:#666">(${v.wcagReference})</span>` : ''
        }</li>`
    )
    .join('\n')

  const listItemsText = input.newViolations
    .map(v => `- [${IMPACT_LABELS[v.impact] || v.impact}] ${v.help}${v.wcagReference ? ` (${v.wcagReference})` : ''}`)
    .join('\n')

  const scoreLine =
    scoreChange !== null
      ? `Compliance score: ${input.complianceScore}/100 (${scoreChange >= 0 ? '+' : ''}${scoreChange} since last scan)`
      : `Compliance score: ${input.complianceScore}/100`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <h2 style="margin-bottom: 4px;">Scheduled scan found ${input.newViolations.length} new issue${input.newViolations.length === 1 ? '' : 's'}</h2>
      <p style="color: #666; margin-top: 0;">${input.url}</p>
      <p>${scoreLine}</p>
      <ul>
        ${listItemsHtml}
      </ul>
      <p><a href="${input.reportUrl}" style="color: #4f46e5;">View full report →</a></p>
      <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px;">
        You're receiving this because a scheduled monitor is watching this site. Manage monitors in Accessibility Navigator.
      </p>
    </div>
  `.trim()

  const text = `Scheduled scan found ${input.newViolations.length} new issue(s) on ${input.url}

${scoreLine}

${listItemsText}

Full report: ${input.reportUrl}

You're receiving this because a scheduled monitor is watching this site.`

  return { subject, html, text }
}
