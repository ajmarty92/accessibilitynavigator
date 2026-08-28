'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Lock, Trash2, Plus, Loader2, Radar } from 'lucide-react'

interface Monitor {
  id: string
  url: string
  frequency: string
  failOn: string
  alertEmails: string[]
  enabled: boolean
  lastRunAt: string | null
  nextRunAt: string
  createdAt: string
}

export default function MonitorsPage() {
  const { status } = useSession()
  const router = useRouter()

  const [monitors, setMonitors] = useState<Monitor[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    url: '',
    frequency: 'daily',
    failOn: 'serious',
    alertEmails: '',
  })

  const loadMonitors = async () => {
    const response = await fetch('/api/monitors')
    if (response.ok) {
      const data = await response.json()
      setMonitors(data.monitors || [])
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status !== 'loading') setLoading(false)
      return
    }
    loadMonitors().finally(() => setLoading(false))
  }, [status])

  const handleCreate = async () => {
    const emails = form.alertEmails
      .split(',')
      .map(e => e.trim())
      .filter(Boolean)

    if (!form.url.trim()) {
      toast.error('Enter a URL to monitor')
      return
    }
    if (emails.length === 0) {
      toast.error('Enter at least one alert email')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: form.url.trim(),
          frequency: form.frequency,
          failOn: form.failOn,
          alertEmails: emails,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to create monitor')
        return
      }
      toast.success('Monitor created')
      setForm({ url: '', frequency: 'daily', failOn: 'serious', alertEmails: '' })
      await loadMonitors()
    } catch {
      toast.error('Failed to create monitor')
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: string, enabled: boolean) => {
    const response = await fetch(`/api/monitors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    })
    if (response.ok) {
      await loadMonitors()
    } else {
      toast.error('Failed to update monitor')
    }
  }

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this monitor? It will stop rescanning and alerting.')) return
    const response = await fetch(`/api/monitors/${id}`, { method: 'DELETE' })
    if (response.ok) {
      toast.success('Monitor removed')
      await loadMonitors()
    } else {
      toast.error('Failed to remove monitor')
    }
  }

  if (status !== 'loading' && status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
        <div className="text-center bg-white border border-secondary-200 rounded-2xl shadow-xl p-10 max-w-md">
          <div className="w-14 h-14 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-secondary-400" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">Sign in to manage monitors</h1>
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
          <h1 className="text-2xl font-bold text-secondary-900">Scheduled Monitors</h1>
          <p className="text-secondary-600 text-sm mt-1">
            Automatically rescan a site on a schedule and get emailed only when it regresses — new violations
            since the last scan, not the same pre-existing debt every time.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="card animate-pulse h-32" />
        ) : (
          <>
            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-3 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Add a monitor
              </h2>
              <div className="space-y-3">
                <input
                  type="text"
                  value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  placeholder="https://example.com"
                  className="form-input w-full"
                  disabled={creating}
                />
                <div className="grid grid-cols-2 gap-3">
                  <select
                    value={form.frequency}
                    onChange={e => setForm({ ...form, frequency: e.target.value })}
                    className="form-input"
                    disabled={creating}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                  <select
                    value={form.failOn}
                    onChange={e => setForm({ ...form, failOn: e.target.value })}
                    className="form-input"
                    disabled={creating}
                  >
                    <option value="critical">Alert on: Critical only</option>
                    <option value="serious">Alert on: Serious or above</option>
                    <option value="moderate">Alert on: Moderate or above</option>
                    <option value="any">Alert on: Any new issue</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={form.alertEmails}
                  onChange={e => setForm({ ...form, alertEmails: e.target.value })}
                  placeholder="alerts@example.com, dev-team@example.com"
                  className="form-input w-full"
                  disabled={creating}
                />
                <button onClick={handleCreate} disabled={creating} className="btn-primary flex items-center gap-2 px-5">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create monitor
                </button>
              </div>
            </div>

            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
                <Radar className="w-4 h-4" /> Active monitors
              </h2>
              {monitors.length === 0 ? (
                <p className="text-sm text-secondary-500">No monitors yet.</p>
              ) : (
                <div className="divide-y divide-secondary-100">
                  {monitors.map(monitor => (
                    <div key={monitor.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-secondary-900 truncate">{monitor.url}</div>
                        <div className="text-xs text-secondary-500 mt-0.5">
                          {monitor.frequency} · alerts on {monitor.failOn}+ · {monitor.alertEmails.join(', ')}
                        </div>
                        <div className="text-xs text-secondary-400 mt-0.5">
                          {monitor.lastRunAt
                            ? `Last run ${new Date(monitor.lastRunAt).toLocaleString()}`
                            : 'Not yet run'}{' '}
                          · next run {new Date(monitor.nextRunAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <label className="flex items-center gap-1.5 text-sm text-secondary-600">
                          <input
                            type="checkbox"
                            checked={monitor.enabled}
                            onChange={e => handleToggle(monitor.id, e.target.checked)}
                          />
                          Enabled
                        </label>
                        <button
                          onClick={() => handleRemove(monitor.id)}
                          className="p-1.5 text-secondary-400 hover:text-red-600"
                          aria-label="Remove monitor"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
