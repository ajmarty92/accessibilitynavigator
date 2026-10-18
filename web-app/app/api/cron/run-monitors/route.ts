import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runScan, ScanError } from '@/lib/run-scan'
import { computeNewViolations } from '@/lib/ci-scan-diff'
import { computeNextRunAt } from '@/lib/monitor-scheduling'
import { buildMonitorAlertEmail } from '@/lib/monitor-alert-email'
import { sendEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Caps how many monitors one invocation processes — each run is a full
// Puppeteer scan, so this bounds a single request's execution time.
// Trigger the cron frequently enough (e.g. hourly) and it catches up over
// several invocations rather than needing to finish everything at once.
const MAX_MONITORS_PER_RUN = 5

// POST /api/cron/run-monitors — meant to be called on a schedule (a
// GitHub Actions cron workflow, Netlify Scheduled Function, or any
// external scheduler) rather than by a user. Authenticated with a shared
// secret, not a session or API key, since nobody is signed in when a cron
// job fires. See .github/workflows/run-monitors.yml for the reference
// trigger.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const providedSecret = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
  }
  if (!providedSecret || providedSecret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const due = await prisma.scheduledMonitor.findMany({
    where: { enabled: true, nextRunAt: { lte: new Date() } },
    orderBy: { nextRunAt: 'asc' },
    take: MAX_MONITORS_PER_RUN,
  })

  const results: { monitorId: string; url: string; alertSent: boolean; error?: string }[] = []

  for (const monitor of due) {
    try {
      const baseline = await prisma.scan.findFirst({
        where: { organizationId: monitor.organizationId, url: monitor.url },
        orderBy: { timestamp: 'desc' },
        include: { violations: true },
      })

      const result = await runScan({
        organizationId: monitor.organizationId,
        url: monitor.url,
        useAI: false,
      })

      const newViolations = computeNewViolations(
        result.savedScan.violations,
        baseline?.violations ?? [],
        monitor.failOn
      )

      let alertSent = false
      if (newViolations.length > 0) {
        const reportBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        const email = buildMonitorAlertEmail({
          url: monitor.url,
          newViolations,
          complianceScore: result.complianceScore,
          previousComplianceScore: baseline?.complianceScore ?? null,
          reportUrl: `${reportBaseUrl}/results/${result.savedScan.id}`,
        })

        const alertEmails = Array.isArray(monitor.alertEmails) ? (monitor.alertEmails as string[]) : []
        const sendResult = await sendEmail({
          to: alertEmails.map(address => ({ email: address })),
          subject: email.subject,
          html: email.html,
          text: email.text,
        })
        alertSent = sendResult.sent
      }

      await prisma.scheduledMonitor.update({
        where: { id: monitor.id },
        data: { lastRunAt: new Date(), nextRunAt: computeNextRunAt(monitor.frequency) },
      })

      results.push({ monitorId: monitor.id, url: monitor.url, alertSent })
    } catch (error) {
      logger.error(`Monitor run failed for ${monitor.url}:`, error)

      // Push the next attempt out even on failure (e.g. quota exceeded,
      // site unreachable) so a permanently broken monitor doesn't get
      // retried every single cron tick forever.
      await prisma.scheduledMonitor
        .update({
          where: { id: monitor.id },
          data: { lastRunAt: new Date(), nextRunAt: computeNextRunAt(monitor.frequency) },
        })
        .catch(() => undefined)

      results.push({
        monitorId: monitor.id,
        url: monitor.url,
        alertSent: false,
        error: error instanceof ScanError ? error.message : 'Scan failed',
      })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
