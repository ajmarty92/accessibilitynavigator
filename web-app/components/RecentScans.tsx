'use client'

import { motion } from 'framer-motion'
import { ExternalLink, TrendingUp, TrendingDown, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

export default function RecentScans() {
  const router = useRouter()
  
  const { data: scans, isLoading } = useQuery({
    queryKey: ['recent-scans'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/scans?limit=5')
        if (!response.ok) return []
        return response.json()
      } catch (error) {
        return []
      }
    },
    retry: false,
    initialData: [],
  })

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success-600'
    if (score >= 70) return 'text-warning-600'
    return 'text-danger-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-success-100'
    if (score >= 70) return 'bg-warning-100'
    return 'bg-danger-100'
  }

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Scans</h2>
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-200 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recent Scans</h2>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All Scans →
        </button>
      </div>

      <div className="space-y-4">
        {scans && scans.length > 0 ? (
          scans.map((scan: any, index: number) => {
            const violationCount = scan.violations?.length || 0

            return (
              <motion.div
                key={scan.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="card hover:shadow-md transition-all cursor-pointer group"
                onClick={() => router.push(`/results/${scan.id}`)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Score Badge */}
                    <div className={`w-16 h-16 rounded-xl ${getScoreBgColor(scan.complianceScore)} flex items-center justify-center`}>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getScoreColor(scan.complianceScore)}`}>
                          {scan.complianceScore}
                        </div>
                        <div className="text-xs text-gray-600">%</div>
                      </div>
                    </div>

                    {/* Scan Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                          {scan.url}
                        </h3>
                        <ExternalLink className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {formatDistanceToNow(new Date(scan.timestamp), { addSuffix: true })}
                        </span>
                        <span>•</span>
                        <span>{violationCount} violations</span>
                        {scan.pagesScanned && (
                          <>
                            <span>•</span>
                            <span>{scan.pagesScanned} pages scanned</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button className="btn btn-secondary opacity-0 group-hover:opacity-100 transition-opacity">
                    View Report
                  </button>
                </div>
              </motion.div>
            )
          })
        ) : (
          /* Empty State */
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No scans yet</h3>
            <p className="text-gray-600 mb-4">
              Start your first accessibility scan to see results here
            </p>
          </div>
        )}
      </div>
    </div>
  )
}