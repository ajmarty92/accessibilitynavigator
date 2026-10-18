import type { StatementContent } from './accessibility-statement-generator'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const IMPACT_LABELS: Record<string, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
}

// Renders a standalone HTML document — meant to be copy-pasted onto the
// customer's own site or served directly from our hosted public page. No
// external stylesheet dependency, so it survives being pasted into any CMS.
export function renderStatementHtml(content: StatementContent): string {
  const limitationsHtml =
    content.knownLimitations.length === 0
      ? '<p>No outstanding accessibility issues were identified in the most recent assessment.</p>'
      : `<ul class="a11y-statement-limitations">
${content.knownLimitations
  .map(
    l => `        <li><strong>${escapeHtml(IMPACT_LABELS[l.impact] || l.impact)}:</strong> ${escapeHtml(l.description)} <span class="a11y-statement-wcag">(${escapeHtml(l.wcagReference)})</span></li>`
  )
  .join('\n')}
      </ul>${
        content.additionalLimitationCount > 0
          ? `\n      <p>${content.additionalLimitationCount} additional issue(s) were identified and are being tracked internally.</p>`
          : ''
      }`

  const contactHtml =
    content.contactEmail || content.contactPhone
      ? `<p>
${content.contactEmail ? `        Email: <a href="mailto:${escapeHtml(content.contactEmail)}">${escapeHtml(content.contactEmail)}</a><br/>\n` : ''}${content.contactPhone ? `        Phone: ${escapeHtml(content.contactPhone)}\n` : ''}      </p>`
      : '<p>Contact information for accessibility feedback has not yet been provided.</p>'

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Accessibility Statement for ${escapeHtml(content.organizationName)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  .a11y-statement { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 720px; margin: 0 auto; padding: 32px 20px; line-height: 1.6; color: #1a1a1a; }
  .a11y-statement h1 { font-size: 1.75rem; margin-bottom: 0.25rem; }
  .a11y-statement h2 { font-size: 1.15rem; margin-top: 2rem; }
  .a11y-statement .a11y-statement-status { display: inline-block; font-weight: 600; padding: 4px 10px; border-radius: 6px; background: #fef3c7; color: #92400e; margin-bottom: 1rem; }
  .a11y-statement-limitations { padding-left: 1.25rem; }
  .a11y-statement-limitations li { margin-bottom: 0.5rem; }
  .a11y-statement-wcag { color: #666; font-size: 0.9em; }
  .a11y-statement-meta { color: #666; font-size: 0.9em; margin-top: 2.5rem; border-top: 1px solid #e5e5e5; padding-top: 1rem; }
</style>
</head>
<body>
<div class="a11y-statement">
  <h1>Accessibility Statement</h1>
  <p><strong>${escapeHtml(content.organizationName)}</strong> — ${escapeHtml(content.siteUrl)}</p>
  <span class="a11y-statement-status">${escapeHtml(content.conformanceStatus)}</span>
  <p>${escapeHtml(content.conformanceSummary)}</p>

  <h2>Known limitations</h2>
  ${limitationsHtml}

  <h2>Measures taken</h2>
  <p>${escapeHtml(content.methodology)}</p>
  <p>This site relies on the following technologies: ${content.technicalSpecifications.map(escapeHtml).join(', ')}.</p>

  ${content.customNotes ? `<h2>Additional information</h2>\n  <p>${escapeHtml(content.customNotes)}</p>\n` : ''}
  <h2>Feedback</h2>
  <p>We welcome your feedback on the accessibility of ${escapeHtml(content.siteUrl)}. If you encounter an accessibility barrier, please let us know.</p>
  ${contactHtml}

  <p class="a11y-statement-meta">This statement was last reviewed on ${content.assessmentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} and reflects the results of a self-assessment. It is not a substitute for a full independent accessibility audit.</p>
</div>
</body>
</html>
`
}
