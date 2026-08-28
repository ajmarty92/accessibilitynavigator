'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { Lock, FileText, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface DocumentViolation {
  id: string
  checkId: string
  description: string
  help: string
  impact: string
  wcagReference: string | null
  elementCount: number
}

interface DocumentScanDetail {
  id: string
  fileName: string
  fileSizeBytes: number
  pageCount: number
  pagesAnalyzed: number
  complianceScore: number
  isTagged: boolean
  documentTitle: string | null
  documentLanguage: string | null
  createdAt: string
  violations: DocumentViolation[]
}

const IMPACT_STYLE: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  serious: 'bg-orange-50 text-orange-700 border-orange-200',
  moderate: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  minor: 'bg-secondary-50 text-secondary-700 border-secondary-200',
}

function scoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

function FactRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
      )}
      <span className="text-secondary-700">{label}</span>
    </div>
  )
}

export default function DocumentScanResultsPage() {
  const { status } = useSession()
  const router = useRouter()
  const params = useParams<{ documentScanId: string }>()

  const [scan, setScan] = useState<DocumentScanDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status !== 'loading') setLoading(false)
      return
    }
    fetch(`/api/documents/${params.documentScanId}`)
      .then(async response => {
        const data = await response.json()
        if (!response.ok) {
          setError(data.error || 'Failed to load document scan')
          return
        }
        setScan(data.documentScan)
      })
      .catch(() => setError('Failed to load document scan'))
      .finally(() => setLoading(false))
  }, [status, params.documentScanId])

  if (status !== 'loading' && status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
        <div className="text-center bg-white border border-secondary-200 rounded-2xl shadow-xl p-10 max-w-md">
          <div className="w-14 h-14 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-secondary-400" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">Sign in to view this report</h1>
          <Link href="/login" className="btn-primary inline-flex">Sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-secondary-50">
      <header className="bg-white border-b border-secondary-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button onClick={() => router.push('/documents')} className="text-primary-600 hover:text-primary-700 text-sm mb-1">
            ← Back to Documents
          </button>
          <h1 className="text-2xl font-bold text-secondary-900 flex items-center gap-2">
            <FileText className="w-6 h-6" /> {loading ? 'Loading…' : scan?.fileName || 'Document report'}
          </h1>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {loading ? (
          <div className="card animate-pulse h-40" />
        ) : error || !scan ? (
          <div className="card text-center py-10">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-secondary-700">{error || 'Document scan not found'}</p>
          </div>
        ) : (
          <>
            <div className="card flex items-center justify-between gap-6 flex-wrap">
              <div>
                <div className="text-sm text-secondary-500">Compliance score</div>
                <div className={`text-4xl font-bold ${scoreColor(scan.complianceScore)}`}>
                  {scan.complianceScore}
                  <span className="text-lg text-secondary-400">/100</span>
                </div>
              </div>
              <div className="text-sm text-secondary-600 space-y-1">
                <div>{scan.pageCount} page{scan.pageCount === 1 ? '' : 's'} ({scan.pagesAnalyzed} analyzed)</div>
                <div>{(scan.fileSizeBytes / 1024).toFixed(0)} KB · scanned {new Date(scan.createdAt).toLocaleString()}</div>
              </div>
            </div>

            <div className="card space-y-2">
              <h2 className="font-semibold text-secondary-900 mb-2">Document-level checks</h2>
              <FactRow ok={scan.isTagged} label={scan.isTagged ? 'Tagged for accessibility' : 'Not tagged for accessibility'} />
              <FactRow
                ok={!!scan.documentTitle}
                label={scan.documentTitle ? `Title set: "${scan.documentTitle}"` : 'No document title set'}
              />
              <FactRow
                ok={!!scan.documentLanguage}
                label={scan.documentLanguage ? `Language set: ${scan.documentLanguage}` : 'No document language set'}
              />
            </div>

            <div className="card">
              <h2 className="font-semibold text-secondary-900 mb-4">
                Violations {scan.violations.length > 0 && `(${scan.violations.length})`}
              </h2>
              {scan.violations.length === 0 ? (
                <p className="text-sm text-secondary-500">No issues found by the automated checks.</p>
              ) : (
                <div className="space-y-3">
                  {scan.violations.map(violation => (
                    <div key={violation.id} className={`border rounded-lg p-4 ${IMPACT_STYLE[violation.impact] || IMPACT_STYLE.minor}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold">{violation.description}</span>
                        <span className="text-xs uppercase tracking-wide font-medium">
                          {violation.impact}
                          {violation.wcagReference && ` · ${violation.wcagReference}`}
                        </span>
                      </div>
                      <p className="text-sm mt-1.5 opacity-90">{violation.help}</p>
                      {violation.elementCount > 1 && (
                        <p className="text-xs mt-1.5 opacity-75">Affects {violation.elementCount} instances</p>
                      )}
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
