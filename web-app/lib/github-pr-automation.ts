import { prisma } from './prisma.ts'
import { getInstallationToken, isGitHubAppConfigured } from './github-app.ts'
import { buildPrCommentBody, postOrUpdatePrComment, PrCommentInput } from './github-pr-comment.ts'
import { logger } from './logger.ts'

export interface PostAccessibilityPrCommentParams extends PrCommentInput {
  organizationId: string
  repository: string // "owner/repo"
  prNumber: number
}

// Called from the CI scan endpoint when the caller identifies a repo/PR.
// Entirely best-effort: no GitHub App configured, no installation for this
// org, or a GitHub API hiccup should never fail the underlying scan — the
// pass/fail result and report link are what CI actually depends on, this
// is an added convenience on top.
export async function postAccessibilityPrComment(params: PostAccessibilityPrCommentParams): Promise<void> {
  if (!isGitHubAppConfigured()) return

  const [owner, repo] = params.repository.split('/')
  if (!owner || !repo) {
    logger.warn(`Skipping PR comment: "${params.repository}" is not a valid "owner/repo" repository`)
    return
  }

  try {
    const installation = await prisma.gitHubInstallation.findFirst({
      where: { organizationId: params.organizationId, suspendedAt: null },
      orderBy: { createdAt: 'desc' },
    })
    if (!installation) return

    const token = await getInstallationToken(installation.installationId)
    const body = buildPrCommentBody(params)
    await postOrUpdatePrComment(token, owner, repo, params.prNumber, body)
  } catch (error) {
    logger.error('Failed to post accessibility PR comment:', error)
  }
}
