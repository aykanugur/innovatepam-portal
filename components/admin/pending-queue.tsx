/**
 * PendingQueue — US-013 FR-012
 *
 * Server component. Renders a table of SUBMITTED ideas ordered oldest-first.
 * Each row links to /admin/review/<id> for review.
 * Empty state: "No ideas awaiting review. Great work!" (FR-012 exact copy).
 *
 * Lives in components/admin/pending-queue.tsx (T021)
 */

import Link from 'next/link'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'

export interface PendingSummary {
  id: string
  title: string
  category: string
  createdAt: string | Date
  author: { displayName: string | null }
}

interface PendingQueueProps {
  ideas: PendingSummary[]
}

function relativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const diffMs = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) return `${diffWeeks} weeks ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function PendingQueue({ ideas }: PendingQueueProps) {
  if (ideas.length === 0) {
    return (
      <section aria-label="Pending review queue">
        <h2
          className="mb-3 text-sm font-semibold uppercase tracking-wide"
          style={{ color: '#8888A8' }}
        >
          Pending Review
        </h2>
        <div
          className="rounded-xl px-6 py-10 text-center"
          style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-sm" style={{ color: '#8888A8' }}>
            No ideas awaiting review. Great work!
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Pending review queue">
      <h2
        className="mb-3 text-sm font-semibold uppercase tracking-wide"
        style={{ color: '#8888A8' }}
      >
        Pending Review
        <span
          className="ml-2 rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ background: 'rgba(245,158,11,0.15)', color: '#fbbf24' }}
        >
          {ideas.length}
        </span>
      </h2>

      <div
        className="overflow-hidden rounded-xl"
        style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <table className="w-full text-sm">
          <thead style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <tr className="text-left">
              <th className="px-4 py-3 font-medium" style={{ color: '#8888A8' }}>
                Title
              </th>
              <th
                className="hidden px-4 py-3 font-medium sm:table-cell"
                style={{ color: '#8888A8' }}
              >
                Author
              </th>
              <th
                className="hidden px-4 py-3 font-medium md:table-cell"
                style={{ color: '#8888A8' }}
              >
                Category
              </th>
              <th className="px-4 py-3 font-medium" style={{ color: '#8888A8' }}>
                Submitted
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {ideas.map((idea) => (
              <tr
                key={idea.id}
                className="transition-colors"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                <td
                  className="px-4 py-3 font-medium max-w-xs truncate"
                  style={{ color: '#F0F0FA' }}
                >
                  {idea.title}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell" style={{ color: '#8888A8' }}>
                  {idea.author.displayName ?? 'Unknown'}
                </td>
                <td className="hidden px-4 py-3 md:table-cell" style={{ color: '#8888A8' }}>
                  {CATEGORY_LABEL[idea.category as CategorySlug] ?? idea.category}
                </td>
                <td className="px-4 py-3" style={{ color: '#8888A8' }}>
                  {relativeTime(idea.createdAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/review/${idea.id}`}
                    className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
