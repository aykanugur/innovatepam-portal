/**
 * DashboardStats — US-013 FR-011
 *
 * Renders 5 stat cards: Total, Submitted (pending), Under Review, Accepted, Rejected.
 * Server component — receives pre-fetched stats from parent RSC.
 *
 * Lives in components/admin/dashboard-stats.tsx (T020)
 */

interface DashboardStatsProps {
  stats: {
    total: number
    submitted: number
    underReview: number
    accepted: number
    rejected: number
  }
}

const STAT_CARDS = [
  {
    key: 'total',
    label: 'Total Ideas',
    numColor: '#F0F0FA',
    bg: '#1A1A2A',
    border: 'rgba(255,255,255,0.08)',
    labelColor: '#8888A8',
  },
  {
    key: 'submitted',
    label: 'Awaiting Review',
    numColor: '#fbbf24',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.25)',
    labelColor: '#fbbf24',
  },
  {
    key: 'underReview',
    label: 'Under Review',
    numColor: '#60a5fa',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.25)',
    labelColor: '#60a5fa',
  },
  {
    key: 'accepted',
    label: 'Accepted',
    numColor: '#6ee7b7',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.25)',
    labelColor: '#6ee7b7',
  },
  {
    key: 'rejected',
    label: 'Rejected',
    numColor: '#fca5a5',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.25)',
    labelColor: '#fca5a5',
  },
] as const

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <section aria-label="Dashboard statistics">
      <h2
        className="mb-3 text-sm font-semibold uppercase tracking-wide"
        style={{ color: '#8888A8' }}
      >
        Overview
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAT_CARDS.map(({ key, label, numColor, bg, border, labelColor }) => (
          <div
            key={key}
            className="rounded-xl p-4"
            style={{ background: bg, border: `1px solid ${border}` }}
          >
            <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: numColor }}>
              {stats[key]}
            </p>
            <p className="mt-1 text-xs font-medium" style={{ color: labelColor }}>
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
