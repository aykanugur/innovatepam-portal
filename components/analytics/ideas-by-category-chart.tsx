'use client'

/**
 * components/analytics/ideas-by-category-chart.tsx — T037
 *
 * Bar chart of idea counts by category (US-014, FR-024).
 * Shows empty state when data array is empty.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface IdeasByCategoryChartProps {
  data: { category: string; count: number }[]
}

export function IdeasByCategoryChart({ data }: IdeasByCategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-500">
        No ideas submitted yet
      </div>
    )
  }

  return (
    <div>
      <h3 className="mb-4 text-base font-semibold text-gray-900">Ideas by Category</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} />
          <Tooltip
            contentStyle={{ fontSize: 12 }}
            formatter={(value: number | undefined) => [value ?? 0, 'Ideas']}
          />
          <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
