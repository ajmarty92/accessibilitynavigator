import { describe, it } from 'node:test'
import assert from 'node:assert'
import { buildMonitorAlertEmail } from './monitor-alert-email.ts'

const baseInput = {
  url: 'https://example.com',
  complianceScore: 78,
  previousComplianceScore: 90,
  reportUrl: 'https://accessibility-navigator.com/results/abc123',
}

describe('buildMonitorAlertEmail', () => {
  it('flags critical issues distinctly in the subject line', () => {
    const email = buildMonitorAlertEmail({
      ...baseInput,
      newViolations: [{ impact: 'critical', help: 'Missing form label', wcagReference: 'WCAG 3.3.2' }],
    })
    assert.match(email.subject, /1 new critical accessibility issue/)
  })

  it('uses a milder subject line when nothing new is critical', () => {
    const email = buildMonitorAlertEmail({
      ...baseInput,
      newViolations: [{ impact: 'serious', help: 'Low contrast text' }],
    })
    assert.doesNotMatch(email.subject, /critical/i)
    assert.match(email.subject, /New accessibility issues found/)
  })

  it('includes the score delta when a previous score is known', () => {
    const email = buildMonitorAlertEmail({
      ...baseInput,
      newViolations: [{ impact: 'serious', help: 'Low contrast text' }],
    })
    assert.match(email.html, /-12 since last scan/)
    assert.match(email.text, /-12 since last scan/)
  })

  it('omits the delta phrase when there is no previous scan to compare against', () => {
    const email = buildMonitorAlertEmail({
      ...baseInput,
      previousComplianceScore: null,
      newViolations: [{ impact: 'moderate', help: 'Heading order skipped' }],
    })
    assert.doesNotMatch(email.html, /since last scan/)
  })

  it('links to the report and lists each violation', () => {
    const email = buildMonitorAlertEmail({
      ...baseInput,
      newViolations: [
        { impact: 'critical', help: 'Missing alt text', wcagReference: 'WCAG 1.1.1' },
        { impact: 'serious', help: 'Low contrast text', wcagReference: 'WCAG 1.4.3' },
      ],
    })
    assert.match(email.html, /Missing alt text/)
    assert.match(email.html, /Low contrast text/)
    assert.match(email.html, /https:\/\/accessibility-navigator\.com\/results\/abc123/)
    assert.match(email.text, /Missing alt text/)
  })
})
