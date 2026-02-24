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
  { key: 'total', label: 'Total Ideas', color: 'text-foreground', bg: 'bg-card' },
  {
    key: 'submitted',
    label: 'Awaiting Review',
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  {
    key: 'underReview',
    label: 'Under Review',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    key: 'accepted',
    label: 'Accepted',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
  },
  { key: 'rejected', label: 'Rejected', color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
] as const

export default function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <section aria-label="Dashboard statistics">
      <h2 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        Overview
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {STAT_CARDS.map(({ key, label, color, bg }) => (
          <div key={key} className={`rounded-xl border p-4 ${bg}`}>
            <p className="text-2xl font-bold tabular-nums leading-none text-foreground">
              {stats[key]}
            </p>
            <p className={`mt-1 text-xs font-medium ${color}`}>{label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
