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
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Pending Review
        </h2>
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm text-muted-foreground">No ideas awaiting review. Great work!</p>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Pending review queue">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Pending Review
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          {ideas.length}
        </span>
      </h2>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border">
            <tr className="text-left">
              <th className="px-4 py-3 font-medium text-muted-foreground">Title</th>
              <th className="hidden px-4 py-3 font-medium text-muted-foreground sm:table-cell">
                Author
              </th>
              <th className="hidden px-4 py-3 font-medium text-muted-foreground md:table-cell">
                Category
              </th>
              <th className="px-4 py-3 font-medium text-muted-foreground">Submitted</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {ideas.map((idea) => (
              <tr key={idea.id} className="hover:bg-muted/40 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground max-w-xs truncate">
                  {idea.title}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground sm:table-cell">
                  {idea.author.displayName ?? 'Unknown'}
                </td>
                <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">
                  {CATEGORY_LABEL[idea.category as CategorySlug] ?? idea.category}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{relativeTime(idea.createdAt)}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/review/${idea.id}`}
                    className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
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
