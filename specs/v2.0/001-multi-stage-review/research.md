# Research: Multi-Stage Review

**Phase**: 0 — Resolve unknowns before design
**Date**: 2026-02-26
**Branch**: `001-multi-stage-review`

---

## R-001 — Prisma $transaction for Atomic Stage Snapshot

**Decision**: Use `db.$transaction([...writes])` (batch API) for atomically creating all `IdeaStageProgress` rows when Stage 1 is claimed.

**Rationale**: Prisma 7's `$transaction` guarantees all-or-nothing — if any row fails, none are persisted. This is the pattern already used in `finalize-review.ts` and `submit-draft.ts` for multi-step writes. The batch API (array form) is preferred over interactive transactions here because all writes are predetermined and have no read dependencies between them.

**Alternatives considered**: Interactive transaction (`$transaction(async (tx) => {...})`) — valid but unnecessarily complex when all writes are independent inserts. Rejected for simplicity.

---

## R-002 — Feature Flag Pattern

**Decision**: Add `FEATURE_MULTI_STAGE_REVIEW_ENABLED` to `lib/env.ts` Zod schema with `z.string().default('false')`. Read via `env.FEATURE_MULTI_STAGE_REVIEW_ENABLED === 'true'` pattern (not a boolean Zod type — consistent with all 7 existing flags).

**Rationale**: The existing pattern in `lib/env.ts` uses `z.string().default('false')` for all 7 feature flags and compares as string. Keeping consistency avoids divergent patterns that confuse future readers.

**Alternatives considered**: `z.coerce.boolean().default(false)` — cleaner TypeScript but breaks consistency with existing flags. Rejected.

---

## R-003 — Pipeline Snapshot Strategy

**Decision**: No separate snapshot model. `IdeaStageProgress` rows created at Stage 1 claim time serve as the implicit snapshot. Each row holds a `stageId` foreign key to the `ReviewPipelineStage` that existed at claim time.

**Rationale**: Pipeline stages are never deleted while in-flight ideas reference them (FR-012 blocks deletion with 409). So `IdeaStageProgress.stageId` references remain valid throughout an in-flight review. This makes the "snapshot" a natural consequence of the guard constraints rather than extra infrastructure.

**Alternatives considered**: A `PipelineSnapshot` model that deep-copies all stage data at submission — adds schema complexity with no benefit given the deletion guard. Rejected.

---

## R-004 — Stage Reorder Implementation

**Decision**: Server-side re-sequencing on every save. When stages are reordered via up/down arrows in the UI, the client sends the full ordered array. The `updatePipeline` Server Action assigns `order = index + 1` to each stage in the received array within a single transaction, replacing all previous orders atomically.

**Rationale**: Client-side re-ordering is batched to "Save Pipeline" (clarification Q5). Sending the full ordered array and re-sequencing server-side is simpler and avoids race conditions vs. swap-based approaches. Wrap in `$transaction` to prevent transient order gaps.

**Alternatives considered**: Swap-based approach (set temp order 999, swap two items) — handles the race condition but adds complexity. Rejected since full-array replace in a transaction is simpler and equally correct.

---

## R-005 — Decision Stage Validation Placement

**Decision**: Validated in two places: (1) Zod schema on `completeStage` Server Action — validates `outcome` against `stage.isDecisionStage` fetched from DB; (2) the `IdeaStageProgress` record is written only after validation passes. No DB-level constraint.

**Rationale**: The existing pattern in the codebase (Zod + Server Action validation, no DB CHECK constraints for business logic) is consistent throughout. Adding a DB constraint for this cross-field business rule is non-trivial in Postgres and unnecessary given the server-side guard.

**Alternatives considered**: Postgres `CHECK` constraint — technically possible but fragile and duplicates application logic. Rejected.

---

## R-006 — Escalation Resolution Action Path

**Decision**: New Server Action `resolveEscalation(stageProgressId, action: 'PASS' | 'REJECT', comment)`. `PASS` auto-advances by setting the next `IdeaStageProgress.startedAt = now()`. `REJECT` sets `Idea.status = REJECTED` and records a final `STAGE_COMPLETED` + `IDEA_REVIEWED` audit entry. SUPERADMIN role check enforced in the action.

**Rationale**: Parallel to `completeStage` but without the original-reviewer restriction (clarification Q2 — SUPERADMIN resolves without re-claiming). Clean separation of concerns.

**Alternatives considered**: Reusing `completeStage` with a `force` flag — muddies the reviewer ownership check. Rejected.

---

## R-007 — Pipeline Config UI Pattern

**Decision**: Inline accordion (expand-on-click) on `/admin/review-config`. No separate page navigation per category. Matches the UX spec from EPIC-V2-04 §7 ("accordion — no separate page navigation"). Client Component (`'use client'`) for the stage builder form; Server Component for the outer page data fetch.

**Rationale**: Consistent with the accordion-style patterns already used in `pending-queue.tsx`. Avoids a nested route (`/admin/review-config/[slug]`) that would add route complexity for zero UX benefit.

**Alternatives considered**: Separate modal per category — adds portal complexity. Separate page per category — requires extra routing. Both rejected.

---

## R-008 — Stage Progress Stepper Component

**Decision**: Server Component (`<StageProgressStepper>`) — receives pre-fetched `IdeaStageProgress[]` and renders a static `<ol>` with Tailwind status classes. Role-based data redaction (reviewer name/comment hiding) done server-side before passing to the component.

**Rationale**: The spec states the stepper is server-rendered (AC-5 of Feature 5). Doing role-based redaction on the server avoids sending sensitive reviewer data to the client at all, which is the correct security posture.

**Alternatives considered**: Client Component with `useSession` role check — would leak reviewer data in the JSON payload before hiding it. Rejected on security grounds.

---

## R-009 — Audit Log Metadata Shape

**Decision**:

- `STAGE_STARTED`: `{ stageId, stageName, order, pipelineId }`
- `STAGE_COMPLETED`: `{ stageId, stageName, order, outcome, pipelineId }`
- `PIPELINE_CREATED`: `{ categorySlug, pipelineName, stageCount }`
- `PIPELINE_UPDATED`: `{ categorySlug, pipelineName, stageCount, changesDescription }`

**Rationale**: Consistent with existing audit log metadata patterns (e.g., `IDEA_REVIEW_STARTED` includes `reviewId`). Enough to reconstruct the event for audit purposes without over-engineering.

---

## All Unknowns Resolved

| Unknown                   | Resolution                                                                 |
| ------------------------- | -------------------------------------------------------------------------- |
| Atomic snapshot strategy  | `$transaction` batch insert in `claimStage` action                         |
| Feature flag format       | `z.string().default('false')` consistent with existing flags               |
| Pipeline snapshot model   | Not needed — `IdeaStageProgress.stageId` FK + deletion guard is sufficient |
| Stage reorder             | Full-array replace in a transaction, server-side                           |
| Decision stage validation | Zod + Server Action; no DB constraint                                      |
| Escalation resolution     | New `resolveEscalation` Server Action, PASS/REJECT, SUPERADMIN only        |
| Config UI layout          | Inline accordion, Client Component inside Server Component page            |
| Stepper rendering         | Server Component, role-redaction server-side                               |
