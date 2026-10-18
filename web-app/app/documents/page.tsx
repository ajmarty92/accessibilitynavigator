'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Lock, Upload, Loader2, FileText, CheckCircle2, AlertTriangle } from 'lucide-react'

interface DocumentScanSummary {
  id: string
  fileName: string
  pageCount: number
  complianceScore: number
  isTagged: boolean
  createdAt: string
  violations: { id: string; impact: string }[]
}

function scoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  return 'text-red-600'
}

export default function DocumentsPage() {
  const { status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [scans, setScans] = useState<DocumentScanSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const loadScans = async () => {
    const response = await fetch('/api/documents')
    if (response.ok) {
      const data = await response.json()
      setScans(data.documentScans || [])
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') {
      if (status !== 'loading') setLoading(false)
      return
    }
    loadScans().finally(() => setLoading(false))
  }, [status])

  const handleUpload = async (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are supported')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/documents', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to scan document')
        return
      }
      toast.success('Document scanned')
      router.push(`/documents/${data.documentScan.id}`)
    } catch {
      toast.error('Failed to scan document')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (status !== 'loading' && status !== 'authenticated') {
    return (
      <div className="min-h-screen bg-secondary-50 flex items-center justify-center px-4">
        <div className="text-center bg-white border border-secondary-200 rounded-2xl shadow-xl p-10 max-w-md">
          <div className="w-14 h-14 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-secondary-400" />
          </div>
          <h1 className="text-xl font-bold text-secondary-900 mb-2">Sign in to scan documents</h1>
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
          <h1 className="text-2xl font-bold text-secondary-900">Document Accessibility</h1>
          <p className="text-secondary-600 text-sm mt-1">
            Upload a PDF to check it against the same PDF/UA and WCAG checks screen readers depend on —
            tagging, alt text, headings, tables, form labels, and reading order.
          </p>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="card">
          <label
            htmlFor="document-upload"
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-secondary-300 rounded-xl py-10 px-4 cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 transition-colors ${
              uploading ? 'pointer-events-none opacity-60' : ''
            }`}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-secondary-400" />
            )}
            <span className="font-medium text-secondary-900">
              {uploading ? 'Scanning your PDF…' : 'Click to upload a PDF, or drag it here'}
            </span>
            <span className="text-xs text-secondary-500">Up to 25MB</span>
            <input
              id="document-upload"
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={uploading}
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) handleUpload(file)
              }}
            />
          </label>
        </div>

        <div className="card">
          <h2 className="font-semibold text-secondary-900 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Scanned documents
          </h2>
          {loading ? (
            <div className="animate-pulse h-24" />
          ) : scans.length === 0 ? (
            <p className="text-sm text-secondary-500">No documents scanned yet.</p>
          ) : (
            <div className="divide-y divide-secondary-100">
              {scans.map(scan => {
                const criticalCount = scan.violations.filter(v => v.impact === 'critical').length
                return (
                  <Link
                    key={scan.id}
                    href={`/documents/${scan.id}`}
                    className="py-3 flex items-center justify-between gap-4 hover:bg-secondary-50 -mx-2 px-2 rounded-lg"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      {scan.isTagged ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-secondary-900 truncate">{scan.fileName}</div>
                        <div className="text-xs text-secondary-500 mt-0.5">
                          {scan.pageCount} page{scan.pageCount === 1 ? '' : 's'} ·{' '}
                          {new Date(scan.createdAt).toLocaleString()}
                          {criticalCount > 0 && ` · ${criticalCount} critical issue${criticalCount === 1 ? '' : 's'}`}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold flex-shrink-0 ${scoreColor(scan.complianceScore)}`}>
                      {scan.complianceScore}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
