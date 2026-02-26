/**
 * lib/blind-review.ts
 *
 * EPIC-V2-05 — Blind Review
 *
 * Pure masking utility. Determines whether an idea's author identity should be
 * replaced with "Anonymous" for the requesting user.
 *
 * Server-side only — never import from client components.
 *
 * Masking is applied only when ALL FIVE conditions are true:
 *   1. The FEATURE_BLIND_REVIEW_ENABLED flag is set to "true"
 *   2. The idea's pipeline has blindReview === true
 *   3. The idea's current status is "UNDER_REVIEW"
 *   4. The requesting user's role is "ADMIN" (not SUPERADMIN, not USER)
 *   5. The requester is NOT the idea's author (self-view exemption)
 *
 * In all other cases the real displayName is returned (or "Unknown" if null).
 *
 * References:
 *   - PRD V2.0 Section 9 — Objectivity & Audit Traceability
 *   - research.md D-001 through D-005
 *   - data-model.md masking predicate
 */

export interface MaskAuthorParams {
  /** ID of the idea's author */
  authorId: string
  /** Display name of the idea's author (may be null from DB) */
  authorDisplayName: string | null | undefined
  /** ID of the user making the request */
  requesterId: string
  /** Role of the user making the request */
  requesterRole: string
  /** Whether the pipeline that owns this idea has blind review enabled */
  pipelineBlindReview: boolean
  /** Current workflow status of the idea */
  ideaStatus: string
  /** Whether FEATURE_BLIND_REVIEW_ENABLED=true in env */
  featureFlagEnabled: boolean
}

/**
 * Returns the author display name to surface to the requesting user.
 * Returns `'Anonymous'` when all five masking conditions hold.
 * Returns the real `authorDisplayName` (or `'Unknown'` if falsy) otherwise.
 */
export function maskAuthorIfBlind({
  authorId,
  authorDisplayName,
  requesterId,
  requesterRole,
  pipelineBlindReview,
  ideaStatus,
  featureFlagEnabled,
}: MaskAuthorParams): string {
  const shouldMask =
    featureFlagEnabled &&
    pipelineBlindReview &&
    ideaStatus === 'UNDER_REVIEW' &&
    requesterRole === 'ADMIN' &&
    requesterId !== authorId

  return shouldMask ? 'Anonymous' : (authorDisplayName ?? 'Unknown')
}
