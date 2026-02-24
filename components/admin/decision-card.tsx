/**
 * DecisionCard — US-012 FR-029
 *
 * Read-only card shown after a review is finalized (ACCEPTED or REJECTED).
 * Renders: decision badge (green/red), reviewer display name, comment, decidedAt.
 *
 * Server component — no client-side state needed.
 * Lives in components/admin/decision-card.tsx (T016)
 */

interface DecisionCardProps {
  review: {
    decision: 'ACCEPTED' | 'REJECTED'
    comment: string | null
    decidedAt: Date | string | null
    reviewer?: {
      displayName: string | null
    } | null
  }
}

export default function DecisionCard({ review }: DecisionCardProps) {
  const isAccepted = review.decision === 'ACCEPTED'

  const decidedAtStr = review.decidedAt
    ? new Date(review.decidedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-foreground">Review Decision</h2>

      <div className="flex items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            isAccepted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {isAccepted ? 'Accepted' : 'Rejected'}
        </span>
      </div>

      {review.comment && (
        <p className="text-sm text-foreground whitespace-pre-wrap">{review.comment}</p>
      )}

      <p className="text-xs text-muted-foreground">
        {review.reviewer?.displayName ? `Reviewed by ${review.reviewer.displayName}` : 'Reviewed'}
        {decidedAtStr ? ` on ${decidedAtStr}` : ''}
      </p>
    </div>
  )
}
