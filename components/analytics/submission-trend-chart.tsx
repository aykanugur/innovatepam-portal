'use client'

/**
 * components/analytics/submission-trend-chart.tsx — T038
 *
 * Line chart of per-day submission counts, 30-day rolling window (US-014, FR-024).
 * Shows empty state when all counts are zero.
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface SubmissionTrendChartProps {
  data: { date: string; count: number }[]
}

export function SubmissionTrendChart({ data }: SubmissionTrendChartProps) {
  const allZero = data.every((d) => d.count === 0)

  if (allZero) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        No submissions in the last 30 days
      </div>
    )
  }

  // Format ISO date strings to short display labels (e.g. "Dec 5")
  const formatted = data.map((d) => ({
    ...d,
    label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  return (
    <div>
      <h3 className="mb-4 text-base font-semibold text-gray-900">Submissions (Last 30 Days)</h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            interval={Math.floor(formatted.length / 6)}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value: number | undefined) => [value ?? 0, 'Submissions']}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
