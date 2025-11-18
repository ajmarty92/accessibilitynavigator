'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Loader2, Settings, ChevronDown } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface ScanFormProps {
  onScanStart?: () => void
}

export default function ScanForm({ onScanStart }: ScanFormProps) {
  const [url, setUrl] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [options, setOptions] = useState({
    maxPages: 10,
    useAI: true,
    depth: 1,
    customRules: true,
    includePerformance: true,
  })

  const router = useRouter()

  const scanMutation = useMutation({
    mutationFn: async (data: { url: string; options: typeof options }) => {
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Scan failed')
      }

      return response.json()
    },
    onSuccess: (data) => {
      toast.success('Scan completed successfully!')
      onScanStart?.()
      
      // Store scan result in sessionStorage for results page
      const scanData = {
        ...data,
        timestamp: new Date().toISOString(),
        url: url
      }
      sessionStorage.setItem(`scan_${data.scan?.id || Date.now()}`, JSON.stringify(scanData))
      
      // Redirect to results page
      if (data.scan?.id) {
        router.push(`/results/${data.scan.id}`)
      } else {
        // Fallback if no scan ID
        router.push('/dashboard')
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Scan failed. Please try again.')
      console.error('Scan error:', error)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!url.trim()) {
      toast.error('Please enter a URL')
      return
    }

    // Validate URL
    let formattedUrl = url.trim()
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`
    }

    try {
      new URL(formattedUrl)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    scanMutation.mutate({ url: formattedUrl, options })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-4xl mx-auto"
    >
      <div className="bg-white border border-secondary-200 rounded-2xl shadow-xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* URL Input */}
          <div>
            <label htmlFor="url" className="block text-sm font-semibold text-secondary-900 mb-3">
              Website URL
            </label>
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10">
                  <Search className="w-5 h-5 text-secondary-400" />
                </div>
                <input
                  type="text"
                  id="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="form-input pl-12 pr-4 py-4 text-lg shadow-sm focus:shadow-md transition-shadow duration-200"
                  disabled={scanMutation.isPending}
                  aria-describedby="url-help"
                />
              </div>
              <motion.button
                type="submit"
                disabled={scanMutation.isPending}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="btn-primary btn-lg px-8 flex items-center gap-3 shadow-lg hover:shadow-xl transition-shadow duration-200"
              >
                {scanMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    Scan Now
                  </>
                )}
              </motion.button>
            </div>
            <p id="url-help" className="mt-2 text-sm text-secondary-600">
              Enter any website URL to scan for WCAG accessibility violations
            </p>
          </div>

          {/* Advanced Options Toggle */}
          <div className="border-t border-secondary-100 pt-6">
            <motion.button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm font-medium text-secondary-700 hover:text-primary-600 transition-colors duration-200"
              aria-expanded={showAdvanced}
              aria-controls="advanced-options"
            >
              <Settings className="w-4 h-4" />
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
              <ChevronDown 
                className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? 'rotate-180' : ''}`}
              />
            </motion.button>
          </div>

          {/* Advanced Options */}
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                id="advanced-options"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="border-t border-secondary-100 pt-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <label htmlFor="maxPages" className="block text-sm font-medium text-secondary-700 mb-2">
                      Max Pages
                    </label>
                    <input
                      type="number"
                      id="maxPages"
                      value={options.maxPages}
                      onChange={(e) => setOptions({ ...options, maxPages: parseInt(e.target.value) || 1 })}
                      min="1"
                      max="100"
                      className="form-input"
                      disabled={scanMutation.isPending}
                    />
                    <p className="mt-1 text-xs text-secondary-500">
                      Number of pages to scan
                    </p>
                  </div>

                  <div>
                    <label htmlFor="depth" className="block text-sm font-medium text-secondary-700 mb-2">
                      Crawl Depth
                    </label>
                    <select
                      id="depth"
                      value={options.depth}
                      onChange={(e) => setOptions({ ...options, depth: parseInt(e.target.value) })}
                      className="form-input"
                      disabled={scanMutation.isPending}
                    >
                      <option value="1">1 level</option>
                      <option value="2">2 levels</option>
                      <option value="3">3 levels</option>
                    </select>
                    <p className="mt-1 text-xs text-secondary-500">
                      How deep to follow links
                    </p>
                  </div>

                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="useAI"
                        checked={options.useAI}
                        onChange={(e) => setOptions({ ...options, useAI: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 focus:ring-2"
                        disabled={scanMutation.isPending}
                      />
                      <label htmlFor="useAI" className="text-sm font-medium text-secondary-700 cursor-pointer">
                        Use AI Prioritization
                      </label>
                    </div>
                    <p className="text-xs text-secondary-500">
                      Get AI-powered legal risk assessment and prioritization
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="customRules"
                        checked={options.customRules}
                        onChange={(e) => setOptions({ ...options, customRules: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 focus:ring-2"
                        disabled={scanMutation.isPending}
                      />
                      <label htmlFor="customRules" className="text-sm font-medium text-secondary-700 cursor-pointer">
                        Custom Rules
                      </label>
                    </div>
                    <p className="text-xs text-secondary-500">
                      Framework-specific accessibility checks
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="includePerformance"
                        checked={options.includePerformance}
                        onChange={(e) => setOptions({ ...options, includePerformance: e.target.checked })}
                        className="w-4 h-4 text-primary-600 border-secondary-300 rounded focus:ring-primary-500 focus:ring-2"
                        disabled={scanMutation.isPending}
                      />
                      <label htmlFor="includePerformance" className="text-sm font-medium text-secondary-700 cursor-pointer">
                        Performance Metrics
                      </label>
                    </div>
                    <p className="text-xs text-secondary-500">
                      Include performance impact analysis
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info Section */}
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                  <span className="text-lg">💡</span>
                </div>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-primary-900 mb-3">
                  What happens during a scan?
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-primary-800">Automated WCAG 2.2 Level AA compliance check</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-5 h-5 text-warning-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-primary-800">AI analyzes violations by impact, legal risk, and effort</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Code className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-primary-800">Framework-specific code fixes generated automatically</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-5 h-5 text-accent-600 flex-shrink-0 mt-0.5" />
                    <span className="text-sm text-primary-800">Detailed report with prioritized action items</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}

// Missing imports
import { CheckCircle, Zap, Code, TrendingUp } from 'lucide-react'