'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface KnownLimitation {
  description: string
  wcagReference: string
  impact: string
}

interface StatementContent {
  organizationName: string
  siteUrl: string
  conformanceStatus: string
  conformanceSummary: string
  knownLimitations: KnownLimitation[]
  additionalLimitationCount: number
  methodology: string
  technicalSpecifications: string[]
  manualAuditCompletionPct: number | null
  assessmentDate: string
  contactEmail?: string | null
  contactPhone?: string | null
  customNotes?: string | null
}

const IMPACT_LABELS: Record<string, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
}

export default function PublicStatementPage() {
  const params = useParams()
  const slug = params.slug as string

  const [content, setContent] = useState<StatementContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    fetch(`/api/statements/${slug}`)
      .then(async res => {
        if (!res.ok) {
          setNotFound(true)
          return
        }
        const data = await res.json()
        setContent(data.content)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading…</p>
      </div>
    )
  }

  if (notFound || !content) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Statement not found</h1>
          <p className="text-gray-600">This accessibility statement doesn&apos;t exist or is no longer published.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Accessibility Statement</h1>
        <p className="text-gray-700 mb-4">
          <strong>{content.organizationName}</strong> — {content.siteUrl}
        </p>

        <span
          className={`inline-block font-semibold px-3 py-1 rounded-md mb-4 text-sm ${
            content.conformanceStatus === 'Not conformant'
              ? 'bg-red-100 text-red-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {content.conformanceStatus}
        </span>
        <p className="text-gray-800 leading-relaxed mb-8">{content.conformanceSummary}</p>

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Known limitations</h2>
        {content.knownLimitations.length === 0 ? (
          <p className="text-gray-700">No outstanding accessibility issues were identified in the most recent assessment.</p>
        ) : (
          <>
            <ul className="list-disc pl-5 space-y-2">
              {content.knownLimitations.map((limitation, index) => (
                <li key={index} className="text-gray-800">
                  <strong>{IMPACT_LABELS[limitation.impact] || limitation.impact}:</strong> {limitation.description}{' '}
                  <span className="text-gray-500 text-sm">({limitation.wcagReference})</span>
                </li>
              ))}
            </ul>
            {content.additionalLimitationCount > 0 && (
              <p className="text-gray-600 text-sm mt-3">
                {content.additionalLimitationCount} additional issue(s) were identified and are being tracked internally.
              </p>
            )}
          </>
        )}

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Measures taken</h2>
        <p className="text-gray-800 leading-relaxed">{content.methodology}</p>
        <p className="text-gray-800 mt-3">
          This site relies on the following technologies: {content.technicalSpecifications.join(', ')}.
        </p>

        {content.customNotes && (
          <>
            <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Additional information</h2>
            <p className="text-gray-800 leading-relaxed">{content.customNotes}</p>
          </>
        )}

        <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-3">Feedback</h2>
        <p className="text-gray-800 mb-3">
          We welcome your feedback on the accessibility of {content.siteUrl}. If you encounter an accessibility
          barrier, please let us know.
        </p>
        {content.contactEmail || content.contactPhone ? (
          <p className="text-gray-800">
            {content.contactEmail && (
              <>
                Email:{' '}
                <a href={`mailto:${content.contactEmail}`} className="text-indigo-600 hover:underline">
                  {content.contactEmail}
                </a>
                <br />
              </>
            )}
            {content.contactPhone && <>Phone: {content.contactPhone}</>}
          </p>
        ) : (
          <p className="text-gray-500">Contact information for accessibility feedback has not yet been provided.</p>
        )}

        <p className="text-gray-500 text-sm mt-10 pt-4 border-t border-gray-200">
          This statement was last reviewed on{' '}
          {new Date(content.assessmentDate).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          and reflects the results of a self-assessment. It is not a substitute for a full independent accessibility
          audit.
        </p>
      </div>
    </div>
  )
}
