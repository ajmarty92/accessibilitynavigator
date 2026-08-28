'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Minus, ExternalLink, Lock } from 'lucide-react'
import ComplianceTrendChart from '@/components/ComplianceTrendChart'

interface SiteSummary {
  url: string
  latestScore: number
  previousScore: number | null
  scanCount: number
  lastScanAt: string
  history: { scanId: string; timestamp: string; complianceScore: number }[]
}

function ScoreDelta({ latest, previous }: { latest: number; previous: number | null }) {
  if (previous === null) {
    return <span className="text-xs text-gray-400">First scan</span>
  }
  const delta = latest - previous
  if (delta === 0) {
    return (
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Minus className="w-3 h-3" /> No change
      </span>
    )
  }
  const improved = delta > 0
  return (
    <span className={`flex items-center gap-1 text-xs font-medium ${improved ? 'text-green-600' : 'text-red-600'}`}>
      {improved ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {improved ? '+' : ''}
      {delta} since last scan
    </span>
  )
}

function getScoreColor(score: number) {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-amber-600'
  return 'text-red-600'
}

export default function SitesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [sites, setSites] = useState<SiteSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status !== 'loading') setLoading(false)
      return
    }

    fetch('/api/sites')
      .then(res => (res.ok ? res.json() : { sites: [] }))
      .then(data => setSites(data.sites || []))
      .catch(() => setSites([]))
      .finally(() => setLoading(false))
  }, [status])

  if (status !== 'loading' && status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
        <div className="text-center bg-white border border-secondary-200 rounded-2xl shadow-xl p-10 max-w-md">
          <div className="w-14 h-14 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-secondary-400" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">Sign in to see your sites</h1>
          <p className="text-secondary-600 mb-6">Track compliance trends across every site you&apos;ve scanned.</p>
          <Link href="/login" className="btn-primary inline-flex">Sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="bg-white border-b border-secondary-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <button onClick={() => router.push('/')} className="text-primary-600 hover:text-primary-700 text-sm mb-1">
              ← Back to Dashboard
            </button>
            <h1 className="text-2xl font-bold text-secondary-900">Compliance Trends</h1>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="card animate-pulse h-64" />
            ))}
          </div>
        ) : sites.length === 0 ? (
          <div className="card text-center py-16">
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No sites scanned yet</h3>
            <p className="text-secondary-600 mb-4">Run a scan from the dashboard to start tracking a site&apos;s trend.</p>
            <Link href="/" className="btn-primary inline-flex">Scan a site</Link>
          </div>
        ) : (
          <div className="space-y-6">
            {sites.map(site => (
              <motion.div
                key={site.url}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="card"
              >
                <div className="flex items-start justify-between mb-4 gap-4">
                  <div>
                    <h3 className="font-semibold text-secondary-900 flex items-center gap-2">
                      {site.url}
                      <a href={site.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 text-secondary-400 hover:text-secondary-600" />
                      </a>
                    </h3>
                    <p className="text-sm text-secondary-500">
                      {site.scanCount} scan{site.scanCount === 1 ? '' : 's'} · last scanned{' '}
                      {new Date(site.lastScanAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-3xl font-bold ${getScoreColor(site.latestScore)}`}>
                      {site.latestScore}
                    </div>
                    <ScoreDelta latest={site.latestScore} previous={site.previousScore} />
                  </div>
                </div>

                <ComplianceTrendChart history={site.history} />

                <div className="mt-4">
                  <button
                    onClick={() => router.push(`/results/${site.history[site.history.length - 1].scanId}`)}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View latest report →
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
