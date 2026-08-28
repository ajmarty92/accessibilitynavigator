'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, CheckCircle, AlertCircle, Code, Eye, Download, FileText, ClipboardCheck, Brain, Scale } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateVpatRows } from '@/lib/vpat-generator'
import { summarizeLegalRisk, legalRiskSummaryText } from '@/lib/legal-report-generator'

interface Violation {
  id: string
  description: string
  help: string
  helpUrl?: string
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  tags: string[]
  nodes: ViolationNode[]
  wcagReference?: string
  elementCount?: number
  priorityScore?: number
  legalRiskScore?: number
  userImpactScore?: number
  businessRiskScore?: number
  technicalComplexity?: number
  effortHours?: number
  explanation?: string
  priority?: 'critical' | 'high' | 'medium' | 'low'
  complianceDeadline?: string
  businessJustification?: string
  fixRecommendations?: string[]
  framework?: string
}

interface ViolationNode {
  html: string
  target: string[]
  failureSummary?: string
}

interface CodeFix {
  id: string
  violationId: string
  framework: string
  originalCode: string
  fixedCode: string
  explanation: string
  steps: string[]
  testingRecommendations: string[]
  browserCompatibility: string[]
  additionalImprovements: string[]
  beforeAfter?: {
    description: string
    impact: string
  }
}

interface ManualAuditItem {
  id: string
  category: string
  code: string
  title: string
  guidance: string
  wcagReference?: string | null
  status: 'not_started' | 'pass' | 'fail' | 'not_applicable'
  notes?: string | null
}

interface StatementConfig {
  id: string
  slug: string
  organizationName: string
  contactEmail?: string | null
  contactPhone?: string | null
  customNotes?: string | null
  published: boolean
  updatedAt: string
}

interface StatementContent {
  organizationName: string
  siteUrl: string
  conformanceStatus: string
  conformanceSummary: string
  knownLimitations: { description: string; wcagReference: string; impact: string }[]
  additionalLimitationCount: number
  methodology: string
  technicalSpecifications: string[]
  manualAuditCompletionPct: number | null
  assessmentDate: string
  contactEmail?: string | null
  contactPhone?: string | null
  customNotes?: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  'keyboard-navigation': 'Keyboard Navigation',
  'screen-reader': 'Screen Reader',
  'reading-order': 'Reading Order & Structure',
  'color-and-contrast': 'Color & Contrast',
  'zoom-and-reflow': 'Zoom & Reflow',
  forms: 'Forms',
}

interface ScanResult {
  scanId: string
  url: string
  timestamp: string
  complianceScore: number
  violations: Violation[]
  pagesScanned: number
  frameworkDetection?: {
    react: boolean
    vue: boolean
    angular: boolean
    svelte: boolean
    nextjs: boolean
    gatsby: boolean
    nuxtjs: boolean
  }
  codeFixes?: CodeFix[]
  enhanced?: {
    aiPrioritization: boolean
    codeGeneration: boolean
    customRules: boolean
    performanceAnalysis: boolean
    frameworkDetection: boolean
  }
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const scanId = params.scanId as string
  
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'violations' | 'fixes' | 'audit' | 'statement'>('overview')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'effort'>('priority')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [auditItems, setAuditItems] = useState<ManualAuditItem[]>([])
  const [auditLoading, setAuditLoading] = useState(true)
  const [statementConfig, setStatementConfig] = useState<StatementConfig | null>(null)
  const [statementContent, setStatementContent] = useState<StatementContent | null>(null)
  const [statementLoading, setStatementLoading] = useState(true)
  const [statementSaving, setStatementSaving] = useState(false)
  const [statementForm, setStatementForm] = useState({
    organizationName: '',
    contactEmail: '',
    contactPhone: '',
    customNotes: '',
  })

  useEffect(() => {
    const fetchScanResult = async () => {
      try {
        const response = await fetch(`/api/scans/${scanId}`)
        if (response.ok) {
          const data = await response.json()
          setScanResult(data)
        } else {
          const storedResult = sessionStorage.getItem(`scan_${scanId}`)
          if (storedResult) {
            setScanResult(JSON.parse(storedResult))
          }
        }
      } catch (error) {
        console.error('Error fetching scan:', error)
        const storedResult = sessionStorage.getItem(`scan_${scanId}`)
        if (storedResult) {
          setScanResult(JSON.parse(storedResult))
        }
      } finally {
        setLoading(false)
      }
    }

    fetchScanResult()
  }, [scanId])

  useEffect(() => {
    const fetchAuditItems = async () => {
      try {
        const response = await fetch(`/api/scans/${scanId}/audit`)
        if (response.ok) {
          const data = await response.json()
          setAuditItems(data.items || [])
        }
      } catch (error) {
        console.error('Error fetching manual audit checklist:', error)
      } finally {
        setAuditLoading(false)
      }
    }

    fetchAuditItems()
  }, [scanId])

  useEffect(() => {
    const fetchStatement = async () => {
      try {
        const response = await fetch(`/api/scans/${scanId}/statement`)
        if (response.ok) {
          const data = await response.json()
          setStatementConfig(data.statement)
          setStatementContent(data.content)
          setStatementForm({
            organizationName: data.statement?.organizationName || '',
            contactEmail: data.statement?.contactEmail || '',
            contactPhone: data.statement?.contactPhone || '',
            customNotes: data.statement?.customNotes || '',
          })
        }
      } catch (error) {
        console.error('Error fetching accessibility statement:', error)
      } finally {
        setStatementLoading(false)
      }
    }

    fetchStatement()
  }, [scanId])

  const handleSaveStatement = async (overrides: Partial<typeof statementForm & { published: boolean }> = {}) => {
    setStatementSaving(true)
    try {
      const response = await fetch(`/api/scans/${scanId}/statement`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...statementForm, ...overrides }),
      })
      const data = await response.json()
      if (!response.ok) {
        toast.error(data.error || 'Failed to save statement')
        return
      }
      setStatementConfig(data.statement)
      toast.success(data.statement.published ? 'Statement published' : 'Statement saved')

      // Refresh the preview content now that config (org name, contact info) changed.
      const refreshed = await fetch(`/api/scans/${scanId}/statement`)
      if (refreshed.ok) {
        const refreshedData = await refreshed.json()
        setStatementContent(refreshedData.content)
      }
    } catch (error) {
      console.error('Failed to save statement:', error)
      toast.error('Failed to save statement')
    } finally {
      setStatementSaving(false)
    }
  }

  const handleCopyStatementLink = async () => {
    if (!statementConfig) return
    const url = `${window.location.origin}/statement/${statementConfig.slug}`
    await navigator.clipboard.writeText(url)
    toast.success('Public link copied')
  }

  const handleExportStatementHtml = async () => {
    if (!statementContent) return
    const { renderStatementHtml } = await import('@/lib/accessibility-statement-render')
    const html = renderStatementHtml({
      ...statementContent,
      conformanceStatus: statementContent.conformanceStatus as 'Partially conformant' | 'Not conformant',
      assessmentDate: new Date(statementContent.assessmentDate),
    })
    const blob = new Blob([html], { type: 'text/html;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `accessibility-statement-${scanId}.html`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('HTML statement downloaded — paste it into your own site')
  }

  const handleAuditUpdate = async (itemId: string, updates: { status?: string; notes?: string }) => {
    const previous = auditItems
    setAuditItems(items => items.map(item => (item.id === itemId ? { ...item, ...updates } as ManualAuditItem : item)))

    try {
      const response = await fetch(`/api/scans/${scanId}/audit`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, ...updates }),
      })
      if (!response.ok) throw new Error('Failed to save')
    } catch (error) {
      console.error('Failed to save checklist update:', error)
      setAuditItems(previous)
      toast.error('Failed to save checklist update')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scan results...</p>
        </div>
      </div>
    )
  }

  if (!scanResult) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Scan not found</h1>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const filteredViolations = scanResult.violations
    .filter(v => filterPriority === 'all' || v.priority === filterPriority)
    .sort((a, b) => {
      if (sortBy === 'priority') {
        return (b.priorityScore || 0) - (a.priorityScore || 0)
      } else if (sortBy === 'impact') {
        return (b.userImpactScore || 0) - (a.userImpactScore || 0)
      } else {
        return (a.effortHours || 0) - (b.effortHours || 0)
      }
    })

  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300',
  }

  const impactColors = {
    critical: 'text-red-600',
    serious: 'text-orange-600',
    moderate: 'text-yellow-600',
    minor: 'text-green-600',
  }

  const handleCopyCode = async (code: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCode(codeId)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch (error) {
      console.error('Failed to copy code:', error)
    }
  }

  const handleExportCsv = () => {
    if (!scanResult) return

    const headers = ['Priority', 'Impact', 'WCAG Reference', 'Issue', 'Description', 'Elements Affected']
    const escape = (value: string) => `"${(value || '').replace(/"/g, '""')}"`

    const rows = scanResult.violations.map(v => [
      v.priority || 'medium',
      v.impact,
      v.wcagReference || '',
      v.help,
      v.description,
      String(v.elementCount ?? v.nodes?.length ?? ''),
    ].map(escape).join(','))

    const csv = [headers.map(escape).join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `accessibility-report-${scanId}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('CSV report downloaded')
  }

  const handleExportPdf = async () => {
    if (!scanResult) return

    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const marginX = 14
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 16) {
        doc.addPage()
        y = 20
      }
    }

    doc.setFontSize(18)
    doc.text('Accessibility Compliance Report', marginX, y)
    y += 9

    doc.setFontSize(10)
    doc.setTextColor(90)
    doc.text(scanResult.url, marginX, y)
    y += 6
    doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y)
    y += 10

    doc.setTextColor(0)
    doc.setFontSize(14)
    doc.text(`Compliance Score: ${scanResult.complianceScore}/100`, marginX, y)
    y += 7
    doc.setFontSize(11)
    doc.text(
      `${scanResult.violations.length} violations across ${scanResult.pagesScanned} page(s)`,
      marginX,
      y
    )
    y += 12

    doc.setFontSize(13)
    doc.text('Violations', marginX, y)
    y += 8

    scanResult.violations.forEach((violation, index) => {
      ensureSpace(24)
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      const title = doc.splitTextToSize(
        `${index + 1}. [${(violation.priority || 'medium').toUpperCase()}] ${violation.help}`,
        pageWidth - marginX * 2
      )
      doc.text(title, marginX, y)
      y += title.length * 5.5

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      const meta = `Impact: ${violation.impact}${violation.wcagReference ? ` · WCAG: ${violation.wcagReference}` : ''}`
      doc.text(meta, marginX, y)
      y += 5

      const description = doc.splitTextToSize(violation.description, pageWidth - marginX * 2)
      ensureSpace(description.length * 5)
      doc.text(description, marginX, y)
      y += description.length * 5 + 4
    })

    doc.save(`accessibility-report-${scanId}.pdf`)
    toast.success('PDF report downloaded')
  }

  const handleExportVpat = async () => {
    if (!scanResult) return

    const rows = generateVpatRows(scanResult.violations, auditItems)
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const marginX = 12
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 18

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 14) {
        doc.addPage()
        y = 18
      }
    }

    doc.setFontSize(16)
    doc.text('VPAT 2.4 — WCAG 2.1 Edition (Draft)', marginX, y)
    y += 8
    doc.setFontSize(10)
    doc.setTextColor(90)
    doc.text(`Product/Page: ${scanResult.url}`, marginX, y)
    y += 5
    doc.text(`Report generated: ${new Date().toLocaleString()}`, marginX, y)
    y += 8

    doc.setFontSize(8.5)
    const disclaimer = doc.splitTextToSize(
      'This draft is generated from automated scan results and the manual audit checklist completed in Accessibility Navigator. "Supports" is only assigned when a criterion was both free of automated violations AND explicitly verified in a manual review — "Not Evaluated" means it requires further manual verification before conformance can be claimed. This is a starting point for a full audit, not a substitute for one.',
      pageWidth - marginX * 2
    )
    doc.text(disclaimer, marginX, y)
    y += disclaimer.length * 4 + 6
    doc.setTextColor(0)

    doc.setFontSize(9)
    const colX = { criterion: marginX, name: marginX + 16, level: marginX + 92, conformance: marginX + 106 }
    const drawHeader = () => {
      doc.setFont('helvetica', 'bold')
      doc.text('Criteria', colX.criterion, y)
      doc.text('Level', colX.level, y)
      doc.text('Conformance', colX.conformance, y)
      y += 5
      doc.setFont('helvetica', 'normal')
    }
    drawHeader()

    rows.forEach(row => {
      const nameLines = doc.splitTextToSize(`${row.criterion.id} ${row.criterion.name}`, 74)
      const remarkLines = doc.splitTextToSize(row.remarks, pageWidth - marginX * 2 - 4)
      const rowHeight = Math.max(nameLines.length, 1) * 4 + remarkLines.length * 3.6 + 2

      ensureSpace(rowHeight + 2)
      if (y === 18) drawHeader()

      doc.text(nameLines, colX.name, y)
      doc.text(row.criterion.level, colX.level, y)
      doc.text(row.conformance, colX.conformance, y)
      y += Math.max(nameLines.length, 1) * 4
      doc.setTextColor(110)
      doc.setFontSize(7.5)
      doc.text(remarkLines, colX.name, y)
      doc.setFontSize(9)
      doc.setTextColor(0)
      y += remarkLines.length * 3.6 + 3
    })

    doc.save(`vpat-draft-${scanId}.pdf`)
    toast.success('VPAT draft downloaded')
  }

  const handleExportLegalReport = async () => {
    if (!scanResult) return

    const summary = summarizeLegalRisk(scanResult.violations, auditItems)
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    const marginX = 14
    const pageHeight = doc.internal.pageSize.getHeight()
    const pageWidth = doc.internal.pageSize.getWidth()
    let y = 20

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - 16) {
        doc.addPage()
        y = 20
      }
    }

    const riskColors: Record<string, [number, number, number]> = {
      Critical: [185, 28, 28],
      High: [194, 120, 3],
      Medium: [161, 98, 7],
      Low: [21, 128, 61],
    }

    doc.setFontSize(18)
    doc.text('Accessibility Legal Risk Assessment', marginX, y)
    y += 9
    doc.setFontSize(10)
    doc.setTextColor(90)
    doc.text(`${scanResult.url} · Prepared ${new Date().toLocaleString()}`, marginX, y)
    y += 12

    const [r, g, b] = riskColors[summary.riskLevel]
    doc.setFillColor(r, g, b)
    doc.roundedRect(marginX, y - 5, 46, 9, 1.5, 1.5, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(11)
    doc.text(`${summary.riskLevel.toUpperCase()} RISK`, marginX + 4, y + 1)
    doc.setTextColor(0)
    y += 14

    doc.setFontSize(10)
    const summaryLines = doc.splitTextToSize(legalRiskSummaryText(summary.riskLevel), pageWidth - marginX * 2)
    doc.text(summaryLines, marginX, y)
    y += summaryLines.length * 5 + 8

    doc.setFontSize(12)
    doc.text('Key Figures', marginX, y)
    y += 7
    doc.setFontSize(10)
    const figures = [
      `Compliance score: ${scanResult.complianceScore}/100`,
      `Total violations: ${summary.totalViolations} (${summary.criticalCount} critical, ${summary.seriousCount} serious)`,
      `Average AI-assessed legal risk score: ${summary.avgLegalRiskScore ?? 'N/A (AI prioritization not run)'}${summary.avgLegalRiskScore !== null ? '/10' : ''}`,
      `Manual audit completion: ${summary.manualAuditCompletionPct}%${summary.manualAuditFailCount > 0 ? ` (${summary.manualAuditFailCount} manual check(s) failed)` : ''}`,
      `Pages scanned: ${scanResult.pagesScanned}`,
    ]
    figures.forEach(line => {
      ensureSpace(6)
      doc.text(`• ${line}`, marginX, y)
      y += 6
    })
    y += 4

    if (summary.topRiskViolations.length > 0) {
      ensureSpace(10)
      doc.setFontSize(12)
      doc.text('Highest-Risk Findings', marginX, y)
      y += 7
      doc.setFontSize(9)

      summary.topRiskViolations.forEach((violation, index) => {
        ensureSpace(14)
        doc.setFont('helvetica', 'bold')
        const title = doc.splitTextToSize(
          `${index + 1}. [${violation.impact.toUpperCase()}] ${violation.help || violation.description || ''}`,
          pageWidth - marginX * 2
        )
        doc.text(title, marginX, y)
        y += title.length * 4.5

        doc.setFont('helvetica', 'normal')
        const meta = `WCAG: ${violation.wcagReference || 'N/A'}${
          violation.legalRiskScore != null ? ` · Legal risk score: ${violation.legalRiskScore}/10` : ''
        }`
        doc.text(meta, marginX, y)
        y += 6
      })
      y += 4
    }

    ensureSpace(20)
    doc.setFontSize(8)
    doc.setTextColor(120)
    const disclaimer = doc.splitTextToSize(
      'This report is generated from automated WCAG scanning and self-reported manual audit results. It is provided for internal risk assessment and remediation planning purposes and does not constitute legal advice. Consult qualified counsel for litigation risk assessment and regulatory compliance determinations.',
      pageWidth - marginX * 2
    )
    doc.text(disclaimer, marginX, pageHeight - 20)

    doc.save(`legal-risk-report-${scanId}.pdf`)
    toast.success('Legal risk report downloaded')
  }

  const getFrameworkIcon = (framework: string) => {
    switch (framework) {
      case 'react': return '⚛️'
      case 'vue': return '💚'
      case 'angular': return '🅰️'
      case 'svelte': return '🔥'
      default: return '🌐'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <button
                onClick={() => router.push('/')}
                className="text-indigo-600 hover:text-indigo-700 flex items-center gap-2 mb-2"
              >
                ← Back to Dashboard
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Scan Results</h1>
              <p className="text-gray-600">{scanResult.url}</p>
              {scanResult.enhanced && (
                <div className="flex gap-2 mt-2">
                  {scanResult.enhanced.aiPrioritization && (
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
                      AI Analysis
                    </span>
                  )}
                  {scanResult.enhanced.codeGeneration && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Code Fixes
                    </span>
                  )}
                  {scanResult.enhanced.customRules && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Custom Rules
                    </span>
                  )}
                  {scanResult.enhanced.frameworkDetection && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                      {getFrameworkIcon(Object.keys(scanResult.frameworkDetection || {}).find(k => 
                        (scanResult.frameworkDetection as any)[k]) || 'Unknown') || '🌐'} 
                      {Object.keys(scanResult.frameworkDetection || {}).find(k => 
                        (scanResult.frameworkDetection as any)[k]) || 'HTML'}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-indigo-600">
                {scanResult.complianceScore}
              </div>
              <div className="text-sm text-gray-600">Compliance Score</div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setSelectedTab('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'overview'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setSelectedTab('violations')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'violations'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Violations ({filteredViolations.length})
            </button>
            {scanResult.codeFixes && scanResult.codeFixes.length > 0 && (
              <button
                onClick={() => setSelectedTab('fixes')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === 'fixes'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Code Fixes ({scanResult.codeFixes.length})
              </button>
            )}
            <button
              onClick={() => setSelectedTab('audit')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'audit'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Manual Audit {auditItems.length > 0 && `(${auditItems.filter(i => i.status !== 'not_started').length}/${auditItems.length})`}
            </button>
            <button
              onClick={() => setSelectedTab('statement')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'statement'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Accessibility Statement
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Tab */}
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="text-3xl font-bold text-gray-900">{scanResult.violations.length}</div>
                <div className="text-sm text-gray-600">Total Violations</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="text-3xl font-bold text-red-600">
                  {scanResult.violations.filter(v => v.priority === 'critical').length}
                </div>
                <div className="text-sm text-gray-600">Critical Issues</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="text-3xl font-bold text-orange-600">
                  {scanResult.violations.filter(v => v.priority === 'high').length}
                </div>
                <div className="text-sm text-gray-600">High Priority</div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="text-3xl font-bold text-indigo-600">{scanResult.pagesScanned}</div>
                <div className="text-sm text-gray-600">Pages Scanned</div>
              </motion.div>
            </div>

            {/* Enhanced Features */}
            {scanResult.enhanced && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Enhanced Analysis</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {scanResult.enhanced.aiPrioritization && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                        <Brain className="w-4 h-4 text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-700">AI Prioritization</span>
                    </div>
                  )}
                  {scanResult.enhanced.codeGeneration && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Code className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-700">Code Fixes</span>
                    </div>
                  )}
                  {scanResult.enhanced.customRules && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-700">Custom Rules</span>
                    </div>
                  )}
                  {scanResult.enhanced.frameworkDetection && (
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <Eye className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="text-sm text-gray-700">Framework Detection</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Quick Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setSelectedTab('violations')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4" />
                  Review Violations
                </button>
                {scanResult.codeFixes && scanResult.codeFixes.length > 0 && (
                  <button
                    onClick={() => setSelectedTab('fixes')}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                  >
                    <Code className="w-4 h-4" />
                    View Code Fixes
                  </button>
                )}
                <button
                  onClick={handleExportPdf}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={handleExportCsv}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Export CSV
                </button>
                <button
                  onClick={handleExportVpat}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  Export VPAT Draft
                </button>
                <button
                  onClick={handleExportLegalReport}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <Scale className="w-4 h-4" />
                  Export Legal Risk Report
                </button>
              </div>
            </motion.div>

            {/* Manual Audit Progress */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-lg shadow-md p-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900">Manual Audit</h3>
                <button
                  onClick={() => setSelectedTab('audit')}
                  className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Open checklist →
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Automated scanning catches roughly a third of real WCAG failures. This checklist covers what
                only a human can verify — keyboard traps, screen reader behavior, reading order, and more.
              </p>
              {!auditLoading && auditItems.length > 0 && (
                <div>
                  <div className="w-full bg-gray-100 rounded-full h-2 mb-1">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all"
                      style={{
                        width: `${Math.round(
                          (auditItems.filter(i => i.status !== 'not_started').length / auditItems.length) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    {auditItems.filter(i => i.status !== 'not_started').length} of {auditItems.length} checks completed
                    {auditItems.some(i => i.status === 'fail') && (
                      <span className="text-red-600 font-medium">
                        {' '}· {auditItems.filter(i => i.status === 'fail').length} failed
                      </span>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Violations Tab - Simplified for brevity */}
        {selectedTab === 'violations' && (
          <div className="space-y-4">
            {filteredViolations.map((violation, index) => (
              <motion.div
                key={violation.id + index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg shadow-md overflow-hidden"
              >
                <div
                  className="p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => setSelectedViolation(
                    selectedViolation?.id === violation.id ? null : violation
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                          priorityColors[violation.priority || 'medium']
                        }`}>
                          {violation.priority?.toUpperCase() || 'MEDIUM'}
                        </span>
                        <span className={`text-sm font-medium ${impactColors[violation.impact]}`}>
                          {violation.impact.toUpperCase()} Impact
                        </span>
                        {violation.wcagReference && (
                          <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {violation.wcagReference}
                          </span>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {violation.help}
                      </h3>
                      <p className="text-gray-600 mb-3">{violation.description}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Code Fixes Tab */}
        {selectedTab === 'fixes' && scanResult.codeFixes && (
          <div className="space-y-4">
            {scanResult.codeFixes.map((fix, index) => (
              <motion.div
                key={fix.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-lg shadow-md p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Code Fix for {fix.framework.charAt(0).toUpperCase() + fix.framework.slice(1)}
                  </h3>
                  <button
                    onClick={() => handleCopyCode(fix.fixedCode, fix.id)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2 text-sm"
                  >
                    {copiedCode === fix.id ? (
                      <><CheckCircle className="w-4 h-4" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4" /> Copy Code</>
                    )}
                  </button>
                </div>
                <p className="text-gray-700 mb-4">{fix.explanation}</p>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded text-sm overflow-x-auto mb-4">
                  {fix.fixedCode}
                </pre>
              </motion.div>
            ))}
          </div>
        )}

        {/* Manual Audit Tab */}
        {selectedTab === 'audit' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-900">
              Work through each item using the real device/assistive tech named in the guidance — a keyboard
              alone, a screen reader, a color-blindness simulator. Mark it Pass, Fail, or Not Applicable as you
              go. Progress is saved automatically and feeds directly into the VPAT export above.
            </div>

            {auditLoading ? (
              <div className="text-center py-12 text-gray-500">Loading checklist…</div>
            ) : (
              Object.entries(
                auditItems.reduce<Record<string, ManualAuditItem[]>>((groups, item) => {
                  (groups[item.category] ||= []).push(item)
                  return groups
                }, {})
              ).map(([category, items]) => (
                <div key={category} className="bg-white rounded-lg shadow-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                    <h3 className="font-semibold text-gray-900">
                      {CATEGORY_LABELS[category] || category}
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map(item => (
                      <div key={item.id} className="p-6">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">{item.title}</h4>
                            {item.wcagReference && (
                              <span className="text-xs text-gray-500">{item.wcagReference}</span>
                            )}
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {(['not_started', 'pass', 'fail', 'not_applicable'] as const).map(status => {
                              const labels: Record<string, string> = {
                                not_started: 'Not started',
                                pass: 'Pass',
                                fail: 'Fail',
                                not_applicable: 'N/A',
                              }
                              const active = item.status === status
                              const activeColors: Record<string, string> = {
                                not_started: 'bg-gray-600 text-white',
                                pass: 'bg-green-600 text-white',
                                fail: 'bg-red-600 text-white',
                                not_applicable: 'bg-gray-400 text-white',
                              }
                              return (
                                <button
                                  key={status}
                                  onClick={() => handleAuditUpdate(item.id, { status })}
                                  className={`px-2.5 py-1 rounded text-xs font-medium border ${
                                    active
                                      ? activeColors[status]
                                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {labels[status]}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{item.guidance}</p>
                        <textarea
                          defaultValue={item.notes || ''}
                          onBlur={e => handleAuditUpdate(item.id, { notes: e.target.value })}
                          placeholder="Notes (optional) — what you checked, what you found…"
                          rows={2}
                          className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Accessibility Statement Tab */}
        {selectedTab === 'statement' && (
          <div className="space-y-6">
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm text-indigo-900">
              A public accessibility statement is one of the specific things DOJ guidance and plaintiffs&apos; counsel
              look for. Fill this in and publish it, then link to it from your site&apos;s footer — or export the HTML
              and host it yourself.
            </div>

            {statementLoading ? (
              <div className="text-center py-12 text-gray-500">Loading…</div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Editor */}
                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization name</label>
                    <input
                      type="text"
                      value={statementForm.organizationName}
                      onChange={e => setStatementForm({ ...statementForm, organizationName: e.target.value })}
                      placeholder="Acme Schools"
                      className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
                    <input
                      type="email"
                      value={statementForm.contactEmail}
                      onChange={e => setStatementForm({ ...statementForm, contactEmail: e.target.value })}
                      placeholder="accessibility@example.com"
                      className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact phone (optional)</label>
                    <input
                      type="text"
                      value={statementForm.contactPhone}
                      onChange={e => setStatementForm({ ...statementForm, contactPhone: e.target.value })}
                      className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Additional information (optional)</label>
                    <textarea
                      value={statementForm.customNotes}
                      onChange={e => setStatementForm({ ...statementForm, customNotes: e.target.value })}
                      rows={3}
                      placeholder="e.g. remediation timeline, third-party content not covered by this assessment…"
                      className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      onClick={() => handleSaveStatement()}
                      disabled={statementSaving || !statementForm.organizationName.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 text-sm font-medium"
                    >
                      Save
                    </button>
                    {statementConfig?.published ? (
                      <button
                        onClick={() => handleSaveStatement({ published: false })}
                        disabled={statementSaving}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm font-medium"
                      >
                        Unpublish
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSaveStatement({ published: true })}
                        disabled={statementSaving || !statementForm.organizationName.trim()}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                      >
                        Publish
                      </button>
                    )}
                  </div>

                  {statementConfig?.published && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Public link</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 truncate">
                          {typeof window !== 'undefined' ? window.location.origin : ''}/statement/{statementConfig.slug}
                        </code>
                        <button
                          onClick={handleCopyStatementLink}
                          className="p-1.5 text-gray-500 hover:text-indigo-600"
                          aria-label="Copy public link"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleExportStatementHtml}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" /> Export as standalone HTML
                  </button>
                </div>

                {/* Preview */}
                <div className="bg-white rounded-lg shadow-md p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Preview</h3>
                  {statementContent && (
                    <div className="text-sm">
                      <span
                        className={`inline-block font-semibold px-2.5 py-1 rounded-md mb-3 ${
                          statementContent.conformanceStatus === 'Not conformant'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {statementContent.conformanceStatus}
                      </span>
                      <p className="text-gray-700 mb-4">{statementContent.conformanceSummary}</p>

                      <p className="font-medium text-gray-900 mb-2">Known limitations</p>
                      {statementContent.knownLimitations.length === 0 ? (
                        <p className="text-gray-600 mb-4">No outstanding issues identified.</p>
                      ) : (
                        <ul className="list-disc pl-5 space-y-1 mb-4 text-gray-700">
                          {statementContent.knownLimitations.slice(0, 5).map((limitation, index) => (
                            <li key={index}>
                              {limitation.description}{' '}
                              <span className="text-gray-500">({limitation.wcagReference})</span>
                            </li>
                          ))}
                          {statementContent.knownLimitations.length > 5 && (
                            <li className="text-gray-500">
                              +{statementContent.knownLimitations.length - 5} more in the full statement
                            </li>
                          )}
                        </ul>
                      )}

                      <p className="text-gray-500 text-xs">{statementContent.methodology}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}