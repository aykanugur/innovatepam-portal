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
      <div className="flex h-48 items-center justify-center text-sm" style={{ color: '#8888A8' }}>
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
      <h3 className="mb-4 text-base font-semibold" style={{ color: '#F0F0FA' }}>
        Submissions (Last 30 Days)
      </h3>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#8888A8' }}
            interval={Math.floor(formatted.length / 6)}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#8888A8' }} />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              background: '#1A1A2A',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#F0F0FA',
            }}
            formatter={(value: number | undefined) => [value ?? 0, 'Submissions']}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#00c8ff"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
