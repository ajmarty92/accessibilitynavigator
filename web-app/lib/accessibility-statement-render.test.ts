import { describe, it } from 'node:test'
import assert from 'node:assert'
import { generateStatementContent } from './accessibility-statement-generator.ts'
import { renderStatementHtml } from './accessibility-statement-render.ts'

describe('renderStatementHtml', () => {
  it('produces a standalone HTML document containing the org name and conformance status', () => {
    const content = generateStatementContent({
      organizationName: 'Acme Schools',
      siteUrl: 'https://acmeschools.example.com',
      assessmentDate: new Date('2026-08-28'),
      complianceScore: 80,
      violations: [{ impact: 'serious', help: 'Low contrast text', wcagReference: 'WCAG 1.4.3' }],
    })
    const html = renderStatementHtml(content)

    assert.match(html, /<!doctype html>/i)
    assert.match(html, /Acme Schools/)
    assert.match(html, /Partially conformant/)
    assert.match(html, /Low contrast text/)
    assert.match(html, /WCAG 1\.4\.3/)
  })

  it('escapes HTML in user-supplied fields to prevent injection into the published page', () => {
    const content = generateStatementContent({
      organizationName: '<script>alert(1)</script>',
      siteUrl: 'https://example.com',
      assessmentDate: new Date('2026-08-28'),
      complianceScore: 90,
      violations: [],
      customNotes: '<img src=x onerror=alert(2)>',
    })
    const html = renderStatementHtml(content)

    assert.ok(!html.includes('<script>alert(1)</script>'))
    assert.ok(!html.includes('<img src=x onerror=alert(2)>'))
    assert.match(html, /&lt;script&gt;/)
  })

  it('handles zero violations without crashing', () => {
    const content = generateStatementContent({
      organizationName: 'Clean Co',
      siteUrl: 'https://clean.example.com',
      assessmentDate: new Date('2026-08-28'),
      complianceScore: 100,
      violations: [],
    })
    const html = renderStatementHtml(content)
    assert.match(html, /No outstanding accessibility issues/)
  })
})
