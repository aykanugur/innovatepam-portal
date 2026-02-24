'use client'

/**
 * ReviewActionPanel — US-012 AC-1/AC-3/AC-6
 *
 * Renders the correct affordance based on the idea's current status:
 * - SUBMITTED: "Start Review" button
 * - UNDER_REVIEW (reviewer is NOT the author): comment textarea + Accept/Reject
 * - UNDER_REVIEW (reviewer IS the author): self-review notice, no actions
 *
 * Lives in components/admin/review-action-panel.tsx (T015)
 */

import { useState, useTransition } from 'react'
import { startReviewAction } from '@/lib/actions/start-review'
import { finalizeReviewAction } from '@/lib/actions/finalize-review'
import type { IdeaStatus } from '@/lib/generated/prisma/client'

interface ReviewActionPanelProps {
  idea: {
    id: string
    status: IdeaStatus
    authorId: string
  }
  currentUser: {
    id: string
    role: string
  }
}

export default function ReviewActionPanel({ idea, currentUser }: ReviewActionPanelProps) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const isSelfReview = idea.authorId === currentUser.id
  const minCommentLen = 10
  const commentTrimmed = comment.trim()
  const commentValid = commentTrimmed.length >= minCommentLen

  // ── SUBMITTED: show Start Review button ──────────────────────────────────
  if (idea.status === 'SUBMITTED') {
    return (
      <div
        className="rounded-xl p-6"
        style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="mb-2 text-sm font-semibold" style={{ color: '#F0F0FA' }}>
          Start Review
        </h2>
        <p className="mb-4 text-sm" style={{ color: '#8888A8' }}>
          Claim this idea for review. Once started, enter a comment and decision.
        </p>

        {error && (
          <p className="mb-3 text-sm font-medium" style={{ color: '#fca5a5' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setError(null)
            startTransition(async () => {
              const formData = new FormData()
              formData.set('ideaId', idea.id)
              const result = await startReviewAction(undefined, formData)
              if (!result.success) {
                setError(
                  result.error === 'SELF_REVIEW_FORBIDDEN'
                    ? 'You cannot review your own idea.'
                    : result.error === 'ALREADY_UNDER_REVIEW'
                      ? 'Another reviewer has already started this review.'
                      : `Error: ${result.error ?? 'Unknown error'}`
                )
              }
            })
          }}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
        >
          {isPending ? 'Starting…' : 'Start Review'}
        </button>
      </div>
    )
  }

  // ── UNDER_REVIEW: guard against self-review ───────────────────────────────
  if (idea.status === 'UNDER_REVIEW' && isSelfReview) {
    return (
      <div
        className="rounded-xl p-6"
        style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}
      >
        <h2 className="mb-1 text-sm font-semibold" style={{ color: '#fbbf24' }}>
          Self-Review Not Allowed
        </h2>
        <p className="text-sm" style={{ color: '#fcd34d' }}>
          You submitted this idea. Another reviewer must evaluate it (US-012 AC-6).
        </p>
      </div>
    )
  }

  // ── UNDER_REVIEW: show comment textarea + Accept / Reject ─────────────────
  if (idea.status === 'UNDER_REVIEW' && !isSelfReview) {
    const handleDecision = (decision: 'ACCEPTED' | 'REJECTED') => {
      setError(null)
      startTransition(async () => {
        const result = await finalizeReviewAction({
          ideaId: idea.id,
          decision,
          comment: commentTrimmed,
        })
        if (!result.success) {
          setError(
            result.error === 'SELF_REVIEW_FORBIDDEN'
              ? 'You cannot review your own idea.'
              : result.error === 'VALIDATION_ERROR'
                ? 'Comment must be at least 10 characters.'
                : `Error: ${result.error ?? 'Unknown error'}`
          )
        }
      })
    }

    return (
      <div
        className="rounded-xl p-6 space-y-4"
        style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: '#F0F0FA' }}>
          Enter Your Decision
        </h2>

        {error && (
          <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>
            {error}
          </p>
        )}

        <div>
          <label
            htmlFor="review-comment"
            className="block text-sm font-medium mb-1"
            style={{ color: '#C0C0D8' }}
          >
            Review Comment{' '}
            <span className="font-normal" style={{ color: '#8888A8' }}>
              (min {minCommentLen} characters)
            </span>
          </label>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Provide detailed feedback for the submitter…"
            rows={4}
            disabled={isPending}
            className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 resize-none"
            style={
              {
                background: '#0C0C14',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#F0F0FA',
                focusRingColor: '#00c8ff',
              } as React.CSSProperties
            }
          />
          <p
            className="mt-1 text-xs"
            style={{
              color:
                commentTrimmed.length > 0 && commentTrimmed.length < minCommentLen
                  ? '#fca5a5'
                  : '#8888A8',
            }}
          >
            {commentTrimmed.length} / {minCommentLen}+ characters
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isPending || !commentValid}
            onClick={() => handleDecision('ACCEPTED')}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#059669' }}
          >
            {isPending ? 'Saving…' : 'Accept'}
          </button>
          <button
            type="button"
            disabled={isPending || !commentValid}
            onClick={() => handleDecision('REJECTED')}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: '#dc2626' }}
          >
            {isPending ? 'Saving…' : 'Reject'}
          </button>
        </div>
      </div>
    )
  }

  // ── ACCEPTED/REJECTED: no more actions ───────────────────────────────────
  return null
}
