'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Lock, Github, CheckCircle2, Loader2, ExternalLink } from 'lucide-react'

interface GitHubInstallation {
  id: string
  accountLogin: string
  accountType: string
  repositorySelection: string
  suspendedAt: string | null
  createdAt: string
}

const ERROR_MESSAGES: Record<string, string> = {
  admin_required: 'Only organization owners/admins can connect GitHub.',
  not_configured: 'GitHub integration is not configured for this deployment yet.',
  invalid_callback: 'GitHub sent back an unexpected response. Please try connecting again.',
  expired_state: 'That connection link expired. Please try connecting again.',
  session_mismatch: 'Please connect GitHub from the organization you intended to install it for.',
  unknown: 'Something went wrong connecting to GitHub. Please try again.',
}

function GitHubSettingsView() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [installation, setInstallation] = useState<GitHubInstallation | null>(null)
  const [appConfigured, setAppConfigured] = useState(true)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)

  const load = async () => {
    const response = await fetch('/api/github/installation')
    if (response.ok) {
      const data = await response.json()
      setInstallation(data.installation)
      setAppConfigured(data.appConfigured)
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status !== 'loading') setLoading(false)
      return
    }
    load().finally(() => setLoading(false))
  }, [status])

  useEffect(() => {
    if (searchParams.get('connected')) toast.success('GitHub connected')
    const error = searchParams.get('error')
    if (error) toast.error(ERROR_MESSAGES[error] || ERROR_MESSAGES.unknown)
    const requested = searchParams.get('status') === 'requested'
    if (requested) toast('Install requested — waiting on an org owner to approve it on GitHub.')
  }, [searchParams])

  const handleDisconnect = async () => {
    if (!confirm('Disconnect GitHub? PR comments will stop until you reconnect.')) return
    setDisconnecting(true)
    try {
      const response = await fetch('/api/github/installation', { method: 'DELETE' })
      if (response.ok) {
        toast.success('GitHub disconnected')
        setInstallation(null)
      } else {
        toast.error('Failed to disconnect GitHub')
      }
    } finally {
      setDisconnecting(false)
    }
  }

  if (status !== 'loading' && status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
        <div className="text-center bg-white border border-secondary-200 rounded-2xl shadow-xl p-10 max-w-md">
          <div className="w-14 h-14 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-secondary-400" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">Sign in to connect GitHub</h1>
          <Link href="/login" className="btn-primary inline-flex">Sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="bg-white border-b border-secondary-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={() => router.push('/')} className="text-primary-600 hover:text-primary-700 text-sm mb-1">
            ← Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-secondary-900">GitHub Integration</h1>
          <p className="text-secondary-600 text-sm mt-1">
            Connect the GitHub App so the CI scan automatically posts (and updates) a comment on the pull
            request with any new violations — no extra setup in your workflow beyond installing it.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="card animate-pulse h-32" />
        ) : !appConfigured ? (
          <div className="card text-center py-10">
            <Github className="w-8 h-8 text-secondary-400 mx-auto mb-2" />
            <p className="text-secondary-700">GitHub integration is not configured for this deployment yet.</p>
          </div>
        ) : installation ? (
          <div className="card">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0" />
              <div>
                <div className="font-semibold text-secondary-900">
                  Connected to {installation.accountLogin}
                  {installation.suspendedAt && (
                    <span className="ml-2 text-xs font-medium text-red-600 uppercase tracking-wide">Suspended</span>
                  )}
                </div>
                <div className="text-sm text-secondary-500">
                  {installation.accountType} · {installation.repositorySelection === 'all' ? 'all repositories' : 'selected repositories'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href={`https://github.com/settings/installations`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary inline-flex items-center gap-1.5 text-sm"
              >
                Manage on GitHub <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button onClick={handleDisconnect} disabled={disconnecting} className="btn-danger inline-flex items-center gap-1.5 text-sm">
                {disconnecting && <Loader2 className="w-4 h-4 animate-spin" />}
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <div className="card text-center py-10">
            <Github className="w-10 h-10 text-secondary-400 mx-auto mb-3" />
            <h2 className="font-semibold text-secondary-900 mb-2">Connect your GitHub account or organization</h2>
            <p className="text-sm text-secondary-600 mb-4 max-w-md mx-auto">
              Once connected, the accessibility-scan GitHub Action automatically posts a comment on each pull
              request summarizing new violations — updated in place on every push, not one comment per commit.
            </p>
            <a href="/api/github/connect" className="btn-primary inline-flex items-center gap-2">
              <Github className="w-4 h-4" /> Connect GitHub
            </a>
          </div>
        )}

        <div className="card">
          <h2 className="font-semibold text-secondary-900 mb-2">How it works</h2>
          <ol className="text-sm text-secondary-600 space-y-2 list-decimal list-inside">
            <li>Connect GitHub above (an organization owner/admin installs the App on the repos you want).</li>
            <li>
              Use the{' '}
              <a
                href="https://github.com/ajmarty92/accessibilitynavigator/tree/main/.github/actions/accessibility-scan"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                accessibility-scan GitHub Action
              </a>{' '}
              in a workflow that runs on <code className="bg-secondary-100 px-1 rounded">pull_request</code>.
            </li>
            <li>Every scan automatically comments on the PR with a compliance score and any new violations.</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default function GitHubSettingsPage() {
  return (
    <Suspense>
      <GitHubSettingsView />
    </Suspense>
  )
}
