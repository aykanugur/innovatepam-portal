'use client'

/**
 * components/analytics/top-scored-ideas-table.tsx
 *
 * EPIC-V2-06 — Scoring System
 * US-044: Top 5 accepted ideas sorted by score descending.
 */

import Link from 'next/link'
import { StarDisplay } from '@/components/ui/star-rating'
import { Star } from 'lucide-react'

interface TopScoredIdea {
  ideaId: string
  title: string
  category: string
  score: number
  authorName: string
}

interface TopScoredIdeasTableProps {
  data: TopScoredIdea[]
}

export function TopScoredIdeasTable({ data }: TopScoredIdeasTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Star className="w-10 h-10 mb-3 text-[#4a4a6a]" />
        <p className="text-sm font-medium" style={{ color: '#8888A8' }}>
          No scored ideas yet
        </p>
        <p className="text-xs mt-1" style={{ color: '#555577' }}>
          Scores will appear after admins rate accepted ideas.
        </p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-4" style={{ color: '#C0C0D8' }}>
        Top Scored Ideas
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <th className="text-left py-2 pr-4 font-medium text-xs" style={{ color: '#8888A8' }}>
                Title
              </th>
              <th className="text-left py-2 pr-4 font-medium text-xs" style={{ color: '#8888A8' }}>
                Score
              </th>
              <th className="text-left py-2 pr-4 font-medium text-xs" style={{ color: '#8888A8' }}>
                Category
              </th>
              <th className="text-left py-2 font-medium text-xs" style={{ color: '#8888A8' }}>
                Submitter
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((idea) => (
              <tr
                key={idea.ideaId}
                className="border-b transition-colors hover:bg-white/[0.02]"
                style={{ borderColor: 'rgba(255,255,255,0.04)' }}
              >
                <td className="py-3 pr-4">
                  <Link
                    href={`/ideas/${idea.ideaId}`}
                    className="font-medium transition-colors hover:text-[#00c8ff]"
                    style={{ color: '#F0F0FA' }}
                  >
                    {idea.title}
                  </Link>
                </td>
                <td className="py-3 pr-4">
                  <StarDisplay score={idea.score} sizeClass="w-4 h-4" />
                </td>
                <td className="py-3 pr-4" style={{ color: '#8888A8' }}>
                  {idea.category}
                </td>
                <td className="py-3" style={{ color: '#8888A8' }}>
                  {idea.authorName}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
