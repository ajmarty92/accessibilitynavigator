import { SignJWT, importPKCS8 } from 'jose'
import { logger } from './logger.ts'

const GITHUB_API_BASE = 'https://api.github.com'
const REQUEST_TIMEOUT_MS = 10_000

export function isGitHubAppConfigured(): boolean {
  return !!(process.env.GITHUB_APP_ID && process.env.GITHUB_APP_PRIVATE_KEY)
}

// The private key is stored as a single-line env var with literal `\n`
// escapes standing in for real newlines (the only practical way to fit a
// PEM block into most .env / secret-manager UIs) — this undoes that.
function normalizePrivateKey(pem: string): string {
  return pem.includes('\\n') ? pem.replace(/\\n/g, '\n') : pem
}

// A GitHub App authenticates as itself with a short-lived JWT signed by its
// private key (RS256), then exchanges that for a per-installation access
// token below. See https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app
async function createAppJwt(): Promise<string> {
  const appId = process.env.GITHUB_APP_ID
  const privateKeyPem = process.env.GITHUB_APP_PRIVATE_KEY
  if (!appId || !privateKeyPem) {
    throw new Error('GitHub App is not configured (GITHUB_APP_ID / GITHUB_APP_PRIVATE_KEY)')
  }

  const privateKey = await importPKCS8(normalizePrivateKey(privateKeyPem), 'RS256')
  const now = Math.floor(Date.now() / 1000)

  return new SignJWT({})
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuedAt(now - 60) // backdated a minute to tolerate clock drift, per GitHub's own guidance
    .setExpirationTime(now + 9 * 60) // GitHub caps this at 10 minutes
    .setIssuer(appId)
    .sign(privateKey)
}

// Installation access tokens are scoped to one installation (one customer's
// repos) and expire after an hour. Not cached — PR-automation calls happen
// at most once per CI scan, far below anything worth caching for.
export async function getInstallationToken(installationId: number): Promise<string> {
  const appJwt = await createAppJwt()

  const response = await fetch(`${GITHUB_API_BASE}/app/installations/${installationId}/access_tokens`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Failed to mint GitHub installation token (${response.status})`)
  }

  const data = await response.json()
  return data.token as string
}

export interface GitHubInstallationDetails {
  accountLogin: string
  accountType: string
  repositorySelection: string
}

// Fetched right after the install callback (see app/api/github/callback)
// rather than waiting on the `installation` webhook, so the settings page
// shows something immediately instead of a brief "connected but unknown".
export async function fetchInstallationDetails(installationId: number): Promise<GitHubInstallationDetails> {
  const appJwt = await createAppJwt()

  const response = await fetch(`${GITHUB_API_BASE}/app/installations/${installationId}`, {
    headers: {
      Authorization: `Bearer ${appJwt}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub installation ${installationId} (${response.status})`)
  }

  const data = await response.json()
  return {
    accountLogin: data.account?.login ?? 'unknown',
    accountType: data.account?.type ?? 'unknown',
    repositorySelection: data.repository_selection ?? 'unknown',
  }
}

interface GitHubRequestOptions {
  method?: string
  body?: unknown
}

// Thin authenticated-fetch wrapper for the handful of repo-scoped calls
// PR automation needs (listing/creating/updating an issue comment). Logs
// and rethrows rather than swallowing — callers (lib/github-pr-automation.ts)
// are the layer responsible for deciding this must never fail a scan.
export async function githubApiRequest<T>(
  installationToken: string,
  path: string,
  options: GitHubRequestOptions = {}
): Promise<T> {
  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${installationToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    logger.error(`GitHub API request failed: ${options.method ?? 'GET'} ${path} (${response.status}) ${text}`)
    throw new Error(`GitHub API request failed (${response.status})`)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
