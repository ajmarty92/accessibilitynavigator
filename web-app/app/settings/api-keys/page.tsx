'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Lock, Copy, Trash2, Plus, Loader2, Key, Lock as LockIcon } from 'lucide-react'

interface ApiKeySummary {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  revokedAt: string | null
  createdAt: string
}

const CI_SNIPPET = `- name: Accessibility scan
  uses: ajmarty92/accessibilitynavigator/.github/actions/accessibility-scan@main
  with:
    url: https://staging.example.com
    api-key: \${{ secrets.ACCESSIBILITY_NAVIGATOR_API_KEY }}
    fail-on: critical`

export default function ApiKeysPage() {
  const { status } = useSession()
  const router = useRouter()

  const [available, setAvailable] = useState<boolean | null>(null)
  const [keys, setKeys] = useState<ApiKeySummary[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [revealedKey, setRevealedKey] = useState<string | null>(null)

  const loadKeys = async () => {
    const response = await fetch('/api/api-keys')
    if (response.ok) {
      const data = await response.json()
      setKeys(data.keys || [])
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status !== 'loading') setLoading(false)
      return
    }

    const load = async () => {
      try {
        const featureRes = await fetch('/api/usage?type=feature&feature=api_access')
        const featureData = featureRes.ok ? await featureRes.json() : { available: false }
        setAvailable(!!featureData.available)
        if (featureData.available) await loadKeys()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [status])

  const handleCreate = async () => {
    if (!newKeyName.trim()) {
      toast.error('Give the key a name so you can recognize it later')
      return
    }
    setCreating(true)
    try {
      const response = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to create key')
        return
      }
      setRevealedKey(data.key)
      setNewKeyName('')
      await loadKeys()
    } catch {
      toast.error('Failed to create key')
    } finally {
      setCreating(false)
    }
  }

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this API key? Anything using it (like a CI pipeline) will stop working immediately.')) {
      return
    }
    const response = await fetch(`/api/api-keys/${id}`, { method: 'DELETE' })
    if (response.ok) {
      toast.success('Key revoked')
      await loadKeys()
    } else {
      toast.error('Failed to revoke key')
    }
  }

  const handleCopy = async (value: string) => {
    await navigator.clipboard.writeText(value)
    toast.success('Copied to clipboard')
  }

  if (status !== 'loading' && status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
        <div className="text-center bg-white border border-secondary-200 rounded-2xl shadow-xl p-10 max-w-md">
          <div className="w-14 h-14 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-secondary-400" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">Sign in to manage API keys</h1>
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
          <h1 className="text-2xl font-bold text-secondary-900">API Keys</h1>
          <p className="text-secondary-600 text-sm mt-1">
            Run scans programmatically — most commonly as a CI check that fails a pull request when it introduces
            new accessibility violations.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="card animate-pulse h-32" />
        ) : available === false ? (
          <div className="card text-center py-12">
            <div className="w-14 h-14 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LockIcon className="w-7 h-7 text-secondary-400" />
            </div>
            <h2 className="text-lg font-semibold text-secondary-900 mb-2">API access requires Professional or higher</h2>
            <p className="text-secondary-600 mb-4">
              Upgrade your plan to generate API keys and wire accessibility scanning into your CI pipeline.
            </p>
          </div>
        ) : (
          <>
            {revealedKey && (
              <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-5">
                <h3 className="font-semibold text-amber-900 mb-1">Save this key now</h3>
                <p className="text-sm text-amber-800 mb-3">
                  This is the only time the full key is shown. Store it as a CI secret — you won&apos;t be able to
                  view it again.
                </p>
                <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-2">
                  <code className="flex-1 text-sm font-mono break-all">{revealedKey}</code>
                  <button
                    onClick={() => handleCopy(revealedKey)}
                    className="p-2 text-amber-700 hover:text-amber-900 flex-shrink-0"
                    aria-label="Copy key"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setRevealedKey(null)}
                  className="mt-3 text-sm text-amber-800 hover:text-amber-900 font-medium"
                >
                  I&apos;ve saved it — dismiss
                </button>
              </div>
            )}

            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Create a new key
              </h2>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={e => setNewKeyName(e.target.value)}
                  placeholder="e.g. GitHub Actions"
                  className="form-input flex-1"
                  disabled={creating}
                />
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2 px-5">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Generate
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                <Key className="w-4 h-4" /> Your keys
              </h2>
              {keys.length === 0 ? (
                <p className="text-sm text-secondary-500">No keys yet.</p>
              ) : (
                <div className="divide-y divide-secondary-100">
                  {keys.map(key => (
                    <div key={key.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <div className="font-medium text-secondary-900">
                          {key.name}
                          {key.revokedAt && (
                            <span className="ml-2 text-xs text-red-600 font-normal">Revoked</span>
                          )}
                        </div>
                        <div className="text-xs text-secondary-500 font-mono">{key.keyPrefix}…</div>
                        <div className="text-xs text-secondary-400 mt-0.5">
                          Created {new Date(key.createdAt).toLocaleDateString()}
                          {key.lastUsedAt && ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}`}
                        </div>
                      </div>
                      {!key.revokedAt && (
                        <button
                          onClick={() => handleRevoke(key.id)}
                          className="p-2 text-secondary-400 hover:text-red-600 flex-shrink-0"
                          aria-label={`Revoke ${key.name}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-2">Using this in GitHub Actions</h2>
              <p className="text-sm text-secondary-600 mb-3">
                Add the key as a repository secret named <code className="text-xs bg-secondary-100 px-1 py-0.5 rounded">ACCESSIBILITY_NAVIGATOR_API_KEY</code>,
                then reference it in a workflow:
              </p>
              <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-lg overflow-x-auto">{CI_SNIPPET}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
