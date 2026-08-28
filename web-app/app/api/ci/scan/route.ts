import { NextRequest, NextResponse } from 'next/server'
import { resolveOrganizationFromApiKey } from '@/lib/api-keys'
import { runScan, mapScanErrorToResponse } from '@/lib/run-scan'
import { isFeatureAvailable } from '@/lib/usage-tracking'
import { computeNewViolations, VALID_FAIL_ON_VALUES } from '@/lib/ci-scan-diff'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

// Authenticated with an API key read from the request, not a session —
// always dynamic regardless.
export const dynamic = 'force-dynamic'

// POST /api/ci/scan — machine-to-machine equivalent of POST /api/scan, for
// the GitHub Action (.github/actions/accessibility-scan) and any future CLI
// or webhook integration. Authenticated with an API key (Authorization:
// Bearer <key>), not a browser session. Diffs against the most recent prior
// scan of the same URL so CI fails only on regressions, not pre-existing
// debt — a codebase with 40 known violations shouldn't block every PR
// forever, but a PR that adds a 41st critical one should.
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization') || ''
    const apiKey = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing Authorization: Bearer <api-key> header' },
        { status: 401 }
      )
    }

    const resolved = await resolveOrganizationFromApiKey(apiKey)
    if (!resolved) {
      return NextResponse.json({ error: 'Invalid or revoked API key' }, { status: 401 })
    }
    const { organizationId } = resolved

    const hasApiAccess = await isFeatureAvailable(organizationId, 'api_access')
    if (!hasApiAccess) {
      return NextResponse.json(
        { error: 'API access is not included in your current plan. Upgrade to Professional or higher.' },
        { status: 403 }
      )
    }

    const { url, options = {}, useAI = false, failOn = 'critical' } = await request.json()

    if (!VALID_FAIL_ON_VALUES.includes(failOn)) {
      return NextResponse.json(
        { error: `Invalid failOn value. Use one of: ${VALID_FAIL_ON_VALUES.join(', ')}` },
        { status: 400 }
      )
    }

    const formattedUrl = typeof url === 'string' && url.startsWith('http') ? url : `https://${url}`

    // Baseline: the most recent scan of this exact URL before this run.
    const baseline = await prisma.scan.findFirst({
      where: { organizationId, url: formattedUrl },
      orderBy: { timestamp: 'desc' },
      include: { violations: true },
    })

    // CI runs default to no AI prioritization — it's a pass/fail gate, not
    // a report a human is about to read, and it saves the Claude call.
    const result = await runScan({ organizationId, url, options, useAI })

    const newViolations = computeNewViolations(result.savedScan.violations, baseline?.violations ?? [], failOn)
    const passed = newViolations.length === 0
    const reportBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    return NextResponse.json({
      passed,
      url: result.formattedUrl,
      scanId: result.savedScan.id,
      reportUrl: `${reportBaseUrl}/results/${result.savedScan.id}`,
      complianceScore: result.complianceScore,
      previousComplianceScore: baseline?.complianceScore ?? null,
      failOn,
      totalViolations: result.savedScan.violations.length,
      newViolations: newViolations.map(v => ({
        impact: v.impact,
        wcagReference: v.wcagReference,
        help: v.help,
        helpUrl: v.helpUrl,
      })),
    })
  } catch (error) {
    logger.error('CI scan API error:', error)
    const { message, status } = mapScanErrorToResponse(error)
    return NextResponse.json({ error: message }, { status })
  }
}
