'use client'

import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock, Target } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

export default function DashboardStats() {
  const { data: scans, isLoading } = useQuery({
    queryKey: ['scans'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/scans?limit=100')
        if (!response.ok) return []
        return response.json()
      } catch (error) {
        return []
      }
    },
    retry: false,
    initialData: [],
  })

  // Calculate stats from real data
  const calculateStats = () => {
    if (!scans || scans.length === 0) {
      return {
        avgCompliance: 0,
        totalViolations: 0,
        criticalIssues: 0,
        scansCount: 0,
      }
    }

    const avgCompliance = Math.round(
      scans.reduce((sum: number, scan: any) => sum + scan.complianceScore, 0) / scans.length
    )

    const totalViolations = scans.reduce(
      (sum: number, scan: any) => sum + (scan.violations?.length || 0),
      0
    )

    const criticalIssues = scans.reduce(
      (sum: number, scan: any) =>
        sum + (scan.violations?.filter((v: any) => v.priority === 'critical').length || 0),
      0
    )

    return {
      avgCompliance,
      totalViolations,
      criticalIssues,
      scansCount: scans.length,
    }
  }

  const stats = calculateStats()

  const statsConfig = [
    {
      label: 'Avg Compliance Score',
      value: isLoading ? '...' : `${stats.avgCompliance}%`,
      change: '+12%',
      trend: 'up',
      icon: Target,
      color: 'success',
    },
    {
      label: 'Total Violations',
      value: isLoading ? '...' : stats.totalViolations.toString(),
      change: '-18',
      trend: 'down',
      icon: AlertCircle,
      color: 'warning',
    },
    {
      label: 'Critical Issues',
      value: isLoading ? '...' : stats.criticalIssues.toString(),
      change: '-5',
      trend: 'down',
      icon: AlertCircle,
      color: 'danger',
    },
    {
      label: 'Total Scans',
      value: isLoading ? '...' : stats.scansCount.toString(),
      change: '+42',
      trend: 'up',
      icon: Clock,
      color: 'primary',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Overview</h2>
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          View All Reports →
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsConfig.map((stat, index) => {
          const Icon = stat.icon
          const isPositive = stat.trend === 'up' && stat.label !== 'Total Violations'
          const TrendIcon = stat.trend === 'up' ? TrendingUp : TrendingDown

          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center bg-${stat.color}-100`}>
                  <Icon className={`w-6 h-6 text-${stat.color}-600`} />
                </div>
                <div className={`flex items-center gap-1 text-sm font-medium ${
                  isPositive ? 'text-success-600' : 'text-danger-600'
                }`}>
                  <TrendIcon className="w-4 h-4" />
                  {stat.change}
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}