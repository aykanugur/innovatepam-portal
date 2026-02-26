/**
 * lib/state-machine/idea-status.ts
 *
 * Pure function state machine for IdeaStatus transitions.
 * NO Prisma imports — pure logic only (US-016, data-model.md §3).
 *
 * Valid transitions:
 *   DRAFT        + SUBMIT        (any authenticated author)  → SUBMITTED
 *   SUBMITTED    + START_REVIEW  (ADMIN | SUPERADMIN) → UNDER_REVIEW
 *   UNDER_REVIEW + ACCEPT        (ADMIN | SUPERADMIN) → ACCEPTED
 *   UNDER_REVIEW + REJECT        (ADMIN | SUPERADMIN) → REJECTED
 *   UNDER_REVIEW + ABANDON       (SUPERADMIN only)    → SUBMITTED
 *
 * V2 (EPIC-V2-04 — Multi-Stage Review Pipeline):
 *   When FEATURE_MULTI_STAGE_REVIEW_ENABLED=true, the START_REVIEW trigger
 *   is routed through `lib/actions/claim-stage.ts` (claimStage) instead of
 *   `lib/actions/start-review.ts` (V1 IdeaReview path). The resulting
 *   SUBMITTED → UNDER_REVIEW status change is identical; only the backing
 *   record differs (IdeaStageProgress vs IdeaReview).
 *
 *   Decision-stage ACCEPT/REJECT outcomes are written by `completeStage()`
 *   directly on the Idea row. Escalation resolution (SUPERADMIN) is handled
 *   by `resolveEscalation()`. Neither path goes through this state machine —
 *   they operate directly on `Idea.status` inside a Prisma $transaction.
 *
 *   This file remains authoritative for the V1 review flow and all unit tests
 *   that validate pure transition logic.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type IdeaStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED'
export type ReviewAction = 'SUBMIT' | 'START_REVIEW' | 'ACCEPT' | 'REJECT' | 'ABANDON'
export type UserRole = 'SUBMITTER' | 'ADMIN' | 'SUPERADMIN'

// ─── Error classes ────────────────────────────────────────────────────────────

export class InvalidTransitionError extends Error {
  readonly current: IdeaStatus
  readonly action: ReviewAction

  constructor(current: IdeaStatus, action: ReviewAction) {
    super(`Invalid transition: cannot perform '${action}' when idea is in '${current}' state.`)
    this.name = 'InvalidTransitionError'
    this.current = current
    this.action = action
    Object.setPrototypeOf(this, InvalidTransitionError.prototype)
  }
}

export class InsufficientRoleError extends Error {
  readonly required: string
  readonly actual: UserRole

  constructor(required: string, actual: UserRole) {
    super(`Insufficient role: '${required}' required, but user has '${actual}'.`)
    this.name = 'InsufficientRoleError'
    this.required = required
    this.actual = actual
    Object.setPrototypeOf(this, InsufficientRoleError.prototype)
  }
}

export class AlreadyReviewedError extends Error {
  readonly current: IdeaStatus

  constructor(current: IdeaStatus) {
    super(`Idea has already been reviewed (status: '${current}').`)
    this.name = 'AlreadyReviewedError'
    this.current = current
    Object.setPrototypeOf(this, AlreadyReviewedError.prototype)
  }
}

// ─── Transition function ──────────────────────────────────────────────────────

/**
 * Compute the next IdeaStatus given a current state, an action, and a user role.
 *
 * @throws {InsufficientRoleError}  when the role cannot perform the action
 * @throws {AlreadyReviewedError}   when trying to review an already-decided idea
 * @throws {InvalidTransitionError} for any other disallowed transition
 */
export function transition(current: IdeaStatus, action: ReviewAction, role: UserRole): IdeaStatus {
  // T001 — Draft Management: DRAFT → SUBMITTED is author-triggered; handled before
  // role guards because the author identity check is enforced by the calling Server
  // Action BEFORE transition() is called (data-model.md §3.4). The state machine
  // only validates that SUBMIT is the action being requested from DRAFT state.
  if (current === 'DRAFT') {
    if (action === 'SUBMIT') return 'SUBMITTED'
    throw new InvalidTransitionError(current, action)
  }

  // Guard: already reviewed — same action on a terminal state (e.g. re-accepting an accepted idea)
  if (
    (current === 'ACCEPTED' && action === 'ACCEPT') ||
    (current === 'REJECTED' && action === 'REJECT')
  ) {
    throw new AlreadyReviewedError(current)
  }

  // Guard: role must be ADMIN or SUPERADMIN for review actions
  if (role === 'SUBMITTER') {
    throw new InsufficientRoleError('ADMIN or SUPERADMIN', role)
  }

  // Guard: ABANDON is SUPERADMIN-only — FR-030
  if (action === 'ABANDON' && role !== 'SUPERADMIN') {
    throw new InsufficientRoleError('SUPERADMIN', role)
  }

  // Valid transition table
  switch (current) {
    case 'SUBMITTED':
      if (action === 'START_REVIEW') return 'UNDER_REVIEW'
      throw new InvalidTransitionError(current, action)

    case 'UNDER_REVIEW':
      if (action === 'ACCEPT') return 'ACCEPTED'
      if (action === 'REJECT') return 'REJECTED'
      if (action === 'ABANDON') return 'SUBMITTED' // US-016 AC-6: admin abandons review
      throw new InvalidTransitionError(current, action)

    case 'ACCEPTED':
    case 'REJECTED':
      throw new InvalidTransitionError(current, action)

    default: {
      const _exhaustive: never = current
      throw new InvalidTransitionError(_exhaustive, action)
    }
  }
}
