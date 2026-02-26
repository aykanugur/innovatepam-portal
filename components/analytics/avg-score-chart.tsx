'use client'

/**
 * components/analytics/avg-score-chart.tsx
 *
 * EPIC-V2-06 — Scoring System
 * US-044: Average score by category bar chart.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Star } from 'lucide-react'

interface AvgScoreChartProps {
  data: { categoryLabel: string; avg: number }[]
}

export function AvgScoreChart({ data }: AvgScoreChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Star className="w-10 h-10 mb-3 text-[#4a4a6a]" />
        <p className="text-sm font-medium" style={{ color: '#8888A8' }}>
          No scored ideas yet
        </p>
        <p className="text-xs mt-1" style={{ color: '#555577' }}>
          Scores will appear after decisions are finalized.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#C0C0D8' }}>
        Avg Score by Category
      </h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="categoryLabel"
            tick={{ fill: '#8888A8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <YAxis
            domain={[0, 5]}
            ticks={[0, 1, 2, 3, 4, 5]}
            tick={{ fill: '#8888A8', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
          />
          <Tooltip
            contentStyle={{
              background: '#1A1A2A',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#F0F0FA',
              fontSize: 12,
            }}
            formatter={(value: number | undefined) => [`${(value ?? 0).toFixed(1)}`, 'Avg Score']}
          />
          <Bar dataKey="avg" fill="#00c8ff" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
