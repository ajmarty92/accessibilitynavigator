import { githubApiRequest } from './github-app.ts'

// Hidden in the rendered comment but present in the raw body — lets
// postOrUpdatePrComment find its own prior comment on a later push and
// edit it in place instead of piling up a new comment per commit.
const COMMENT_MARKER = '<!-- accessibility-navigator:pr-comment -->'

export interface PrCommentViolation {
  impact: string
  wcagReference?: string | null
  help: string
  helpUrl?: string | null
}

export interface PrCommentInput {
  passed: boolean
  complianceScore: number
  previousComplianceScore: number | null
  failOn: string
  newViolations: PrCommentViolation[]
  reportUrl: string
}

// Pure — takes the same shape of data the CI endpoint already returns
// (see app/api/ci/scan/route.ts) and renders the sticky PR comment body.
// Kept separate from the GitHub API calls below so it's unit-testable
// without a real installation token.
export function buildPrCommentBody(input: PrCommentInput): string {
  const { passed, complianceScore, previousComplianceScore, failOn, newViolations, reportUrl } = input

  const scoreLine =
    previousComplianceScore !== null && previousComplianceScore !== complianceScore
      ? `**Compliance score:** ${complianceScore}/100 (was ${previousComplianceScore})`
      : `**Compliance score:** ${complianceScore}/100`

  const lines = [COMMENT_MARKER, '## ♿ Accessibility scan', '', scoreLine, `**Report:** ${reportUrl}`, '']

  if (passed) {
    lines.push(`✅ No new violations at or above **${failOn}** severity.`)
  } else {
    lines.push(`❌ ${newViolations.length} new violation${newViolations.length === 1 ? '' : 's'} at or above **${failOn}** severity:`, '')
    for (const violation of newViolations) {
      const reference = violation.wcagReference ? ` (${violation.wcagReference})` : ''
      const link = violation.helpUrl ? ` — [details](${violation.helpUrl})` : ''
      lines.push(`- **${violation.impact}**${reference}: ${violation.help}${link}`)
    }
  }

  return lines.join('\n')
}

export function isAccessibilityNavigatorComment(body: string | null | undefined): boolean {
  return !!body && body.includes(COMMENT_MARKER)
}

// Finds this bot's prior comment on the PR (if any) and edits it in place;
// otherwise posts a new one. Keeps a PR's timeline from accumulating one
// comment per push the way an unconditional POST would.
export async function postOrUpdatePrComment(
  installationToken: string,
  owner: string,
  repo: string,
  prNumber: number,
  body: string
): Promise<void> {
  const comments = await githubApiRequest<{ id: number; body: string }[]>(
    installationToken,
    `/repos/${owner}/${repo}/issues/${prNumber}/comments?per_page=100`
  )

  const existing = comments.find(comment => isAccessibilityNavigatorComment(comment.body))

  if (existing) {
    await githubApiRequest(installationToken, `/repos/${owner}/${repo}/issues/comments/${existing.id}`, {
      method: 'PATCH',
      body: { body },
    })
  } else {
    await githubApiRequest(installationToken, `/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      body: { body },
    })
  }
}
