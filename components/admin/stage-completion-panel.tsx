'use client'

/**
 * components/admin/stage-completion-panel.tsx
 *
 * T022 — US2 (Admin Claims Stage + PASS)
 * EPIC-V2-06 — Scoring System (star rating + criteria tags on decision stage)
 *
 * Client Component: stage outcome form.
 * - Outcome radio group:
 *     non-decision stage → PASS | ESCALATE
 *     decision stage     → ACCEPTED | REJECTED
 * - EPIC-V2-06: Star rating (required on decision stage when scoring enabled)
 * - EPIC-V2-06: Criteria tag multi-select (optional)
 * - Comment textarea (min 10, max 2000)
 * - Submit button → calls completeStage() Server Action
 * - Error / loading states
 */

import { useState, useTransition } from 'react'
import { completeStage } from '@/lib/actions/complete-stage'
import { StarRating } from '@/components/ui/star-rating'
import CriteriaTagSelect from '@/components/admin/criteria-tag-select'
import type { ScoringCriterion } from '@/constants/scoring-criteria'

type NonDecisionOutcome = 'PASS' | 'ESCALATE'
type DecisionOutcome = 'ACCEPTED' | 'REJECTED'
type AnyOutcome = NonDecisionOutcome | DecisionOutcome

interface StageCompletionPanelProps {
  stageProgressId: string
  isDecisionStage: boolean
  stageName: string
  /** Whether FEATURE_SCORING_ENABLED=true (passed from server) */
  scoringEnabled?: boolean
  /** Callback on successful submission */
  onSuccess?: () => void
}

export default function StageCompletionPanel({
  stageProgressId,
  isDecisionStage,
  stageName,
  scoringEnabled = false,
  onSuccess,
}: StageCompletionPanelProps) {
  const outcomes: AnyOutcome[] = isDecisionStage ? ['ACCEPTED', 'REJECTED'] : ['PASS', 'ESCALATE']

  const outcomeLabel: Record<AnyOutcome, string> = {
    PASS: 'Pass — advance to next stage',
    ESCALATE: 'Escalate — halt for SUPERADMIN review',
    ACCEPTED: 'Accept idea',
    REJECTED: 'Reject idea',
  }

  const outcomeColor: Record<AnyOutcome, string> = {
    PASS: '#4ade80',
    ESCALATE: '#fbbf24',
    ACCEPTED: '#4ade80',
    REJECTED: '#ff6b6b',
  }

  const [outcome, setOutcome] = useState<AnyOutcome>(outcomes[0])
  const [comment, setComment] = useState('')
  const [score, setScore] = useState(0)
  const [criteria, setCriteria] = useState<ScoringCriterion[]>([])
  const [scoreError, setScoreError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const commentTooShort = comment.trim().length < 10
  const commentTooLong = comment.trim().length > 2000

  // Score is required on decision stage when scoring is enabled
  const showScoring = isDecisionStage && scoringEnabled
  const scoreValid = !showScoring || score > 0

  const canSubmit = !commentTooShort && !commentTooLong && !isPending && scoreValid

  function handleSubmit() {
    // Re-check score before submitting
    if (showScoring && score === 0) {
      setScoreError('A score (1–5) is required to finalise the decision.')
      return
    }
    setScoreError(null)

    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      const result = await completeStage(
        stageProgressId,
        outcome,
        comment.trim(),
        showScoring ? score : undefined,
        showScoring ? criteria : undefined
      )
      if ('error' in result) {
        setError(result.error)
      } else {
        onSuccess?.()
      }
    })
  }

  return (
    <section
      className="rounded-xl p-6 space-y-5"
      style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      aria-label={`Complete stage: ${stageName}`}
    >
      <h2 className="text-base font-semibold" style={{ color: '#F0F0FA' }}>
        Complete Stage: {stageName}
      </h2>

      {/* EPIC-V2-06: Star Rating (decision stage only, when scoring enabled) */}
      {showScoring && (
        <StarRating
          value={score}
          onChange={(v) => {
            setScore(v)
            setScoreError(null)
          }}
          label="Rate this idea"
          required
          error={scoreError}
        />
      )}

      {/* EPIC-V2-06: Criteria Tags (decision stage only, when scoring enabled) */}
      {showScoring && <CriteriaTagSelect value={criteria} onChange={setCriteria} />}

      {/* Outcome radio group */}
      <fieldset>
        <legend className="text-xs font-medium mb-2" style={{ color: '#8888A8' }}>
          Outcome <span style={{ color: '#ff6b6b' }}>*</span>
        </legend>
        <div className="flex flex-col gap-2" role="radiogroup" aria-label="Review outcome">
          {outcomes.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 transition-colors"
              style={{
                background: outcome === opt ? 'rgba(0,200,255,0.06)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${outcome === opt ? 'rgba(0,200,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <input
                type="radio"
                name="outcome"
                value={opt}
                checked={outcome === opt}
                onChange={() => setOutcome(opt)}
                className="sr-only"
              />
              <span
                className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                style={{
                  borderColor: outcome === opt ? outcomeColor[opt] : 'rgba(255,255,255,0.2)',
                }}
              >
                {outcome === opt && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: outcomeColor[opt] }}
                  />
                )}
              </span>
              <span className="text-sm" style={{ color: outcome === opt ? '#F0F0FA' : '#8888A8' }}>
                {outcomeLabel[opt]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Comment */}
      <div>
        <label
          htmlFor="complete-stage-comment"
          className="block text-xs font-medium mb-1"
          style={{ color: '#8888A8' }}
        >
          Comment <span style={{ color: '#ff6b6b' }}>*</span>{' '}
          <span style={{ color: '#555577' }}>(min 10 characters)</span>
        </label>
        <textarea
          id="complete-stage-comment"
          rows={4}
          maxLength={2000}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value)
            setError(null)
          }}
          placeholder="Provide your review notes…"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none transition-colors"
          style={{
            background: '#12121E',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#F0F0FA',
          }}
          aria-describedby="comment-hint"
        />
        <div id="comment-hint" className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: commentTooShort ? '#fbbf24' : '#555577' }}>
            {comment.trim().length} / 2000
          </span>
          {commentTooShort && comment.length > 0 && (
            <span className="text-xs" style={{ color: '#fbbf24' }}>
              At least 10 characters required
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,107,107,0.08)', color: '#ff6b6b' }}
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="rounded-lg px-6 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
        aria-disabled={!canSubmit}
      >
        {isPending ? 'Submitting…' : 'Submit Review'}
      </button>
    </section>
  )
}
