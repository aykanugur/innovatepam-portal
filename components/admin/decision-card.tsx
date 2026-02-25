/**
 * DecisionCard — US-012 FR-029
 *
 * Read-only card shown after a review is finalized (ACCEPTED or REJECTED).
 * Renders: decision badge (green/red), reviewer display name, comment, decidedAt.
 * T014: also renders dynamic fields (Smart Forms) in read-only mode when present.
 *
 * Server component — no client-side state needed.
 * Lives in components/admin/decision-card.tsx (T016)
 */
import type { FieldDefinition } from '@/types/field-template'
import DynamicFieldSection from '@/components/ideas/dynamic-field-section'

interface DecisionCardProps {
  review: {
    decision: 'ACCEPTED' | 'REJECTED'
    comment: string | null
    decidedAt: Date | string | null
    reviewer?: {
      displayName: string | null
    } | null
  }
  /** Parsed dynamic fields stored on the Idea (FR-002) */
  dynamicFields?: Record<string, unknown> | null
  /** Field definitions for the idea's category (from CategoryFieldTemplate) */
  fieldTemplates?: FieldDefinition[] | null
  /** Whether FEATURE_SMART_FORMS_ENABLED=true */
  smartFormsEnabled?: boolean
}

export default function DecisionCard({
  review,
  dynamicFields,
  fieldTemplates,
  smartFormsEnabled,
}: DecisionCardProps) {
  const isAccepted = review.decision === 'ACCEPTED'

  const decidedAtStr = review.decidedAt
    ? new Date(review.decidedAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null

  return (
    <div
      className="rounded-xl p-6 space-y-4"
      style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <h2 className="text-sm font-semibold" style={{ color: '#F0F0FA' }}>
        Review Decision
      </h2>

      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={
            isAccepted
              ? { background: 'rgba(16,185,129,0.15)', color: '#6ee7b7' }
              : { background: 'rgba(239,68,68,0.15)', color: '#fca5a5' }
          }
        >
          {isAccepted ? 'Accepted' : 'Rejected'}
        </span>
      </div>

      {review.comment && (
        <p className="text-sm whitespace-pre-wrap" style={{ color: '#D0D0E8' }}>
          {review.comment}
        </p>
      )}

      <p className="text-xs" style={{ color: '#8888A8' }}>
        {review.reviewer?.displayName ? `Reviewed by ${review.reviewer.displayName}` : 'Reviewed'}
        {decidedAtStr ? ` on ${decidedAtStr}` : ''}
      </p>

      {/* T014 — Smart Forms: show dynamic fields in read-only mode (FR-008) */}
      {smartFormsEnabled && fieldTemplates && dynamicFields ? (
        <DynamicFieldSection
          fields={fieldTemplates}
          values={dynamicFields as Record<string, string | number>}
          onChange={() => {}}
          readOnly
        />
      ) : null}
    </div>
  )
}
