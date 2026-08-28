'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Lock, Copy, Trash2, Plus, Loader2, Webhook, Lock as LockIcon } from 'lucide-react'

interface WebhookEndpointSummary {
  id: string
  url: string
  enabled: boolean
  lastDeliveryAt: string | null
  lastDeliveryStatus: number | null
  createdAt: string
}

const PAYLOAD_EXAMPLE = `{
  "event": "scan.completed",
  "timestamp": "2026-08-28T16:00:00.000Z",
  "data": {
    "scanId": "cln...",
    "url": "https://example.com",
    "complianceScore": 82,
    "violationCount": 14,
    "criticalCount": 1,
    "reportUrl": "https://accessibility-navigator.com/results/cln..."
  }
}`

export default function WebhooksPage() {
  const { status } = useSession()
  const router = useRouter()

  const [available, setAvailable] = useState<boolean | null>(null)
  const [endpoints, setEndpoints] = useState<WebhookEndpointSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [newUrl, setNewUrl] = useState('')
  const [creating, setCreating] = useState(false)
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null)

  const loadEndpoints = async () => {
    const response = await fetch('/api/webhooks/endpoints')
    if (response.ok) {
      const data = await response.json()
      setEndpoints(data.endpoints || [])
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
        if (featureData.available) await loadEndpoints()
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [status])

  const handleCreate = async () => {
    if (!newUrl.trim()) {
      toast.error('Enter an HTTPS URL to deliver events to')
      return
    }
    setCreating(true)
    try {
      const response = await fetch('/api/webhooks/endpoints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newUrl.trim() }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to add endpoint')
        return
      }
      setRevealedSecret(data.secret)
      setNewUrl('')
      await loadEndpoints()
    } catch {
      toast.error('Failed to add endpoint')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    const response = await fetch(`/api/webhooks/endpoints/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (response.ok) {
      await loadEndpoints()
    } else {
      toast.error('Failed to update endpoint')
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this webhook endpoint?')) return
    const response = await fetch(`/api/webhooks/endpoints/${id}`, { method: 'DELETE' })
    if (response.ok) {
      toast.success('Endpoint removed')
      await loadEndpoints()
    } else {
      toast.error('Failed to remove endpoint')
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
          <h1 className="text-xl font-bold text-secondary-900 mb-2">Sign in to manage webhooks</h1>
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
          <h1 className="text-2xl font-bold text-secondary-900">Webhooks</h1>
          <p className="text-secondary-600 text-sm mt-1">
            Get notified the moment a scan finishes instead of polling the API.
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
            <h2 className="text-lg font-semibold text-secondary-900 mb-2">Webhooks require Professional or higher</h2>
            <p className="text-secondary-600">Upgrade your plan to receive scan-completed notifications.</p>
          </div>
        ) : (
          <>
            {revealedSecret && (
              <div className="border-2 border-amber-400 bg-amber-50 rounded-xl p-5">
                <h3 className="font-semibold text-amber-900 mb-1">Save this signing secret now</h3>
                <p className="text-sm text-amber-800 mb-3">
                  Use it to verify the <code className="text-xs">X-Accessibility-Navigator-Signature</code> header on
                  incoming deliveries (HMAC-SHA256 of the raw request body). You won&apos;t see it again.
                </p>
                <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg px-3 py-2">
                  <code className="flex-1 text-sm font-mono break-all">{revealedSecret}</code>
                  <button
                    onClick={() => handleCopy(revealedSecret)}
                    className="p-2 text-amber-700 hover:text-amber-900 flex-shrink-0"
                    aria-label="Copy secret"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setRevealedSecret(null)}
                  className="mt-3 text-sm text-amber-800 hover:text-amber-900 font-medium"
                >
                  I&apos;ve saved it — dismiss
                </button>
              </div>
            )}

            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add an endpoint
              </h2>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://your-app.example.com/webhooks/accessibility-navigator"
                  className="form-input flex-1"
                  disabled={creating}
                />
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2 px-5">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                <Webhook className="w-4 h-4" /> Your endpoints
              </h2>
              {endpoints.length === 0 ? (
                <p className="text-sm text-secondary-500">No endpoints yet.</p>
              ) : (
                <div className="divide-y divide-secondary-100">
                  {endpoints.map(endpoint => (
                    <div key={endpoint.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-secondary-900 truncate">{endpoint.url}</div>
                        <div className="text-xs text-secondary-400 mt-0.5">
                          {endpoint.lastDeliveryAt
                            ? `Last delivery ${new Date(endpoint.lastDeliveryAt).toLocaleString()} (HTTP ${endpoint.lastDeliveryStatus ?? 'failed'})`
                            : 'No deliveries yet'}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <label className="flex items-center gap-1.5 text-sm text-secondary-600">
                          <input
                            type="checkbox"
                            checked={endpoint.enabled}
                            onChange={e => handleToggle(endpoint.id, e.target.checked)}
                          />
                          Enabled
                        </label>
                        <button
                          onClick={() => handleRemove(endpoint.id)}
                          className="p-1.5 text-secondary-400 hover:text-red-600"
                          aria-label="Remove endpoint"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-2">Event: scan.completed</h2>
              <p className="text-sm text-secondary-600 mb-3">Fired once, right after a scan finishes and saves.</p>
              <pre className="bg-gray-900 text-gray-100 text-xs p-4 rounded-lg overflow-x-auto">{PAYLOAD_EXAMPLE}</pre>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
