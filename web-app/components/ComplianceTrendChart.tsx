'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'

interface TrendPoint {
  scanId: string
  timestamp: string
  complianceScore: number
}

interface ComplianceTrendChartProps {
  history: TrendPoint[]
  height?: number
}

function scoreColor(score: number) {
  if (score >= 90) return '#16a34a'
  if (score >= 70) return '#d97706'
  return '#dc2626'
}

export default function ComplianceTrendChart({ history, height = 220 }: ComplianceTrendChartProps) {
  if (history.length < 2) {
    return (
      <div
        className="flex items-center justify-center text-sm text-gray-500 bg-gray-50 rounded-lg"
        style={{ height }}
      >
        Scan this site again to start tracking its trend over time
      </div>
    )
  }

  const data = history.map(point => ({
    ...point,
    label: format(new Date(point.timestamp), 'MMM d'),
  }))
  const latestScore = data[data.length - 1].complianceScore

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={{ stroke: '#e5e7eb' }} />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={{ stroke: '#e5e7eb' }}
          width={32}
        />
        <Tooltip
          formatter={(value: number) => [`${value}/100`, 'Compliance score']}
          labelFormatter={(label, payload) =>
            payload?.[0]?.payload ? format(new Date(payload[0].payload.timestamp), 'PPp') : label
          }
        />
        <Line
          type="monotone"
          dataKey="complianceScore"
          stroke={scoreColor(latestScore)}
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
