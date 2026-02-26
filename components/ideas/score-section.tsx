/**
 * components/ideas/score-section.tsx
 *
 * EPIC-V2-06 — Scoring System
 * US-043: Evaluation score section on the idea detail page.
 *
 * Server Component — renders score + criteria tags when conditions are met:
 * 1. FEATURE_SCORING_ENABLED=true
 * 2. Idea status is ACCEPTED or REJECTED
 * 3. IdeaScore record exists
 *
 * Completely absent from DOM when any condition fails (not hidden, not placeholder).
 */

import { StarDisplay } from '@/components/ui/star-rating'

interface ScoreSectionProps {
  /** IdeaScore data (null if no score exists) */
  score: {
    score: number
    criteria: string[]
    reviewerName?: string
  } | null
  /** Current idea status */
  ideaStatus: string
  /** Whether FEATURE_SCORING_ENABLED=true */
  scoringEnabled: boolean
  /** Whether blind review mode is active (hides reviewer name) */
  blindMode?: boolean
}

export default function ScoreSection({
  score,
  ideaStatus,
  scoringEnabled,
  blindMode = false,
}: ScoreSectionProps) {
  // Completely absent when: flag is off, score is null, or pre-decision status
  if (!scoringEnabled) return null
  if (!score) return null
  if (ideaStatus !== 'ACCEPTED' && ideaStatus !== 'REJECTED') return null

  return (
    <section
      className="rounded-2xl p-6"
      style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      aria-label={`Evaluation score: ${score.score} out of 5`}
    >
      <h2 className="mb-4 text-sm font-semibold" style={{ color: '#C0C0D8' }}>
        Evaluation Score
      </h2>

      <StarDisplay score={score.score} />

      {/* Criteria tags (only when criteria exist) */}
      {score.criteria.length > 0 && (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: '#60607A' }}>
            Evaluation criteria:
          </p>
          <div className="flex flex-wrap gap-2">
            {score.criteria.map((criterion) => (
              <span
                key={criterion}
                className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#8888A8',
                }}
              >
                {criterion}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Reviewer attribution (hidden in blind review mode) */}
      {score.reviewerName && !blindMode && (
        <p className="text-xs mt-3" style={{ color: '#60607A' }}>
          Scored by {score.reviewerName}
        </p>
      )}
    </section>
  )
}
