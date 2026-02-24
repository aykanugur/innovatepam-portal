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
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Start Review</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Claim this idea for review. Once started, enter a comment and decision.
        </p>

        {error && <p className="mb-3 text-sm font-medium text-destructive">{error}</p>}

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
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Starting…' : 'Start Review'}
        </button>
      </div>
    )
  }

  // ── UNDER_REVIEW: guard against self-review ───────────────────────────────
  if (idea.status === 'UNDER_REVIEW' && isSelfReview) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
        <h2 className="mb-1 text-sm font-semibold text-amber-800">Self-Review Not Allowed</h2>
        <p className="text-sm text-amber-700">
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
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">Enter Your Decision</h2>

        {error && <p className="text-sm font-medium text-destructive">{error}</p>}

        <div>
          <label
            htmlFor="review-comment"
            className="block text-sm font-medium text-foreground mb-1"
          >
            Review Comment{' '}
            <span className="text-muted-foreground font-normal">
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
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 resize-none"
          />
          <p
            className={`mt-1 text-xs ${
              commentTrimmed.length > 0 && commentTrimmed.length < minCommentLen
                ? 'text-destructive'
                : 'text-muted-foreground'
            }`}
          >
            {commentTrimmed.length} / {minCommentLen}+ characters
          </p>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            disabled={isPending || !commentValid}
            onClick={() => handleDecision('ACCEPTED')}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Accept'}
          </button>
          <button
            type="button"
            disabled={isPending || !commentValid}
            onClick={() => handleDecision('REJECTED')}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
