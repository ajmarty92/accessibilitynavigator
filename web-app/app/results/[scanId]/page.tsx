'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Copy, CheckCircle, AlertCircle, Code, Eye, Download, Filter, Brain } from 'lucide-react'

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
  const [selectedTab, setSelectedTab] = useState<'overview' | 'violations' | 'fixes'>('overview')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'priority' | 'impact' | 'effort'>('priority')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

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
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Export Report
                </button>
              </div>
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
      </div>
    </div>
  )
}