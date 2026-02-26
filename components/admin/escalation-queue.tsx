/**
 * components/admin/escalation-queue.tsx
 *
 * T031 — US3 (Escalation)
 *
 * Server Component: read-only list of IdeaStageProgress rows where
 * outcome = 'ESCALATE' and idea.status = 'UNDER_REVIEW'.
 *
 * ADMIN: sees "Escalated" badge only (read-only).
 * SUPERADMIN: also sees "Resolve" link → /admin/resolve/[progressId].
 */

import Link from 'next/link'
import { db } from '@/lib/db'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'

interface EscalationQueueProps {
  isSuperAdmin: boolean
}

function relativeTime(date: Date | string): string {
  const d = new Date(date)
  const diffMs = Date.now() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default async function EscalationQueue({ isSuperAdmin }: EscalationQueueProps) {
  const escalated = await db.ideaStageProgress.findMany({
    where: {
      outcome: 'ESCALATE',
      idea: { status: 'UNDER_REVIEW' },
    },
    orderBy: { completedAt: 'asc' },
    include: {
      idea: { select: { id: true, title: true, category: true } },
      stage: { select: { name: true, order: true } },
      reviewer: { select: { displayName: true } },
    },
  })

  if (escalated.length === 0) {
    return (
      <section aria-label="Escalation queue">
        <div
          className="rounded-xl px-6 py-10 text-center"
          style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-sm" style={{ color: '#8888A8' }}>
            No escalated ideas. All clear!
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Escalation queue">
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
                className="hidden px-4 py-3 font-medium md:table-cell"
                style={{ color: '#8888A8' }}
              >
                Category
              </th>
              <th
                className="hidden px-4 py-3 font-medium sm:table-cell"
                style={{ color: '#8888A8' }}
              >
                Stage
              </th>
              <th
                className="hidden px-4 py-3 font-medium sm:table-cell"
                style={{ color: '#8888A8' }}
              >
                Escalated by
              </th>
              <th className="px-4 py-3 font-medium" style={{ color: '#8888A8' }}>
                When
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {escalated.map((row) => (
              <tr
                key={row.id}
                className="transition-colors"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                <td
                  className="px-4 py-3 font-medium max-w-xs truncate"
                  style={{ color: '#F0F0FA' }}
                >
                  <Link href={`/admin/review/${row.idea.id}`} className="hover:underline">
                    {row.idea.title ?? 'Untitled'}
                  </Link>
                </td>
                <td className="hidden px-4 py-3 md:table-cell" style={{ color: '#8888A8' }}>
                  {CATEGORY_LABEL[row.idea.category as CategorySlug] ?? row.idea.category}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell" style={{ color: '#8888A8' }}>
                  Stage {row.stage.order}: {row.stage.name}
                </td>
                <td className="hidden px-4 py-3 sm:table-cell" style={{ color: '#8888A8' }}>
                  {row.reviewer?.displayName ?? '—'}
                </td>
                <td className="px-4 py-3" style={{ color: '#8888A8' }}>
                  {row.completedAt ? relativeTime(row.completedAt) : '—'}
                </td>
                <td className="px-4 py-3 text-right">
                  {isSuperAdmin ? (
                    <Link
                      href={`/admin/resolve/${row.id}`}
                      className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                      style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                    >
                      Resolve
                    </Link>
                  ) : (
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                      style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}
                    >
                      Escalated
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
