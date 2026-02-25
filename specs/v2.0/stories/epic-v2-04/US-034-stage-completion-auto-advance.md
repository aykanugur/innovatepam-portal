# User Story: Stage Completion & Auto-Advance

**Story ID**: US-034
**Epic**: EPIC-V2-04 — Multi-Stage Review
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: M
**Sprint**: Phase 5 — Step 4
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** admin reviewing an idea on a stage,
**I want to** submit a stage outcome (Pass / Escalate / Accept / Reject) and have the system automatically advance to the next stage or finalize the decision,
**so that** the review pipeline progresses without requiring manual admin intervention to set up each subsequent stage.

---

## Context & Motivation

Stage completion is the core runtime logic of the multi-stage review system. When a reviewer submits a `PASS` or `ESCALATE` outcome on a non-decision stage, the system automatically creates the next `IdeaStageProgress` row. When a reviewer submits `ACCEPTED` or `REJECTED` on a decision stage, the system marks the idea as decided. All writes happen atomically in a single transaction.

---

## Acceptance Criteria

1. **Given** an admin on a non-decision stage submits outcome `PASS`,
   **When** the Server Action runs,
   **Then** in a single `$transaction`:
   - Current `IdeaStageProgress.completedAt` is set to `now()`
   - Current `IdeaStageProgress.outcome` is set to `PASS`
   - A new `IdeaStageProgress` row is created for the next stage (order + 1) with no `reviewerId` (awaiting claim by next reviewer)
   - `AuditLog` entry written with action `STAGE_COMPLETED`

2. **Given** an admin on the decision stage submits outcome `ACCEPTED`,
   **When** the Server Action runs,
   **Then** in a single `$transaction`:
   - Current `IdeaStageProgress.completedAt` is set to `now()`
   - Current `IdeaStageProgress.outcome` is set to `ACCEPTED`
   - `Idea.status` is updated to `ACCEPTED`
   - `AuditLog` entry written with action `IDEA_ACCEPTED`

3. **Given** an admin on the decision stage submits outcome `REJECTED`,
   **When** the Server Action runs,
   **Then** `Idea.status` is set to `REJECTED` (same atomic pattern as AC-2 but with `REJECTED`).

4. **Given** an admin on any stage submits outcome `ESCALATE`,
   **When** the Server Action runs,
   **Then** the current stage is marked complete with `outcome=ESCALATE` and a new `IdeaStageProgress` is created for the same stage with no `reviewerId` — the idea is re-queued at the same stage for a second reviewer.

5. **Given** the decision stage is completed but there is no next stage (it is the last),
   **When** the Server Action processes a `PASS` outcome on this stage,
   **Then** the Server Action treats `PASS` as a configuration error and returns `400`: "The pipeline's last stage must be a decision stage."

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                                | Expected Behavior                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Reviewer submits an outcome but the `IdeaStageProgress` row has already been completed (race condition) | The `$transaction` uses `where: { completedAt: null }` in the update — Prisma throws `P2025`; Server Action returns `409`: "This stage has already been completed." |
| 2   | `ESCALATE` on a decision stage                                                                          | `ESCALATE` is only valid on non-decision stages. Server Action validates `stage.isDecisionStage === false` before accepting `ESCALATE`. Returns `400` if invalid.   |
| 3   | Reviewer resubmits the same outcome (double-click)                                                      | Same as EC-1 — `completedAt` guard catches the duplicate.                                                                                                           |

---

## UI / UX Notes

- Route: `/admin/review/[ideaId]/stage/[stageProgressId]`
- Non-decision stage review panel: shows the idea content + a textarea for comment + outcome buttons: "Pass →" (green) and "Escalate ↑" (amber).
- Decision stage review panel: shows the idea content + comment + score (US-041, added in Phase 7) + "Accept ✓" (green) and "Reject ✗" (red) buttons.
- After submitting any outcome: redirect to `/admin/review` (pending queue) with a toast: "Stage completed. [Idea title] has been passed to the next stage." / "Decision recorded."
- Outcome buttons are disabled during the pending submission state.

---

## Technical Notes

- Server Action: `lib/actions/complete-stage.ts`
- Input: `{ stageProgressId, outcome: StageOutcome, comment?: string }`
- Outcome routing:
  ```ts
  if (outcome === 'PASS') {
    const nextStage = getNextStage(pipeline, currentStage.order)
    if (!nextStage) return error('No next stage — check pipeline config')
    await prisma.$transaction([completeProgress, createNextProgress, createAuditLog])
  } else if (outcome === 'ESCALATE') {
    await prisma.$transaction([completeProgress, createEscalatedProgress, createAuditLog])
  } else if (outcome === 'ACCEPTED' || outcome === 'REJECTED') {
    await prisma.$transaction([completeProgress, updateIdeaStatus, createAuditLog])
  }
  ```
- `getNextStage(pipeline, currentOrder)`: utility that loads the stage with `order = currentOrder + 1` from the same pipeline.
- **Feature Flag**: `FEATURE_MULTI_STAGE_REVIEW_ENABLED`.

---

## Dependencies

| Dependency                                                                       | Type  | Status             | Blocker? |
| -------------------------------------------------------------------------------- | ----- | ------------------ | -------- |
| US-031 — Models                                                                  | Story | Must be done first | Yes      |
| US-033 — Stage initialisation (produces the `IdeaStageProgress` row to complete) | Story | Must be done first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] Admin submits `PASS` on Stage 1 → new Stage 2 `IdeaStageProgress` row created; redirect to queue
- [ ] Admin submits `ACCEPTED` on decision stage → `Idea.status = ACCEPTED`; `IdeaStageProgress.completedAt` set
- [ ] Admin submits `REJECTED` on decision stage → `Idea.status = REJECTED`
- [ ] Admin submits `ESCALATE` → current stage re-queued with empty `reviewerId`

### Automated Testing

- [ ] Integration: `completeStage(PASS)` creates the next `IdeaStageProgress` and completes the current one atomically
- [ ] Integration: `completeStage(ACCEPTED)` updates `Idea.status` to `ACCEPTED` atomically
- [ ] Integration: duplicate submit (stage already completed) returns `409`
- [ ] Integration: `ESCALATE` on a decision stage returns `400`

---

## Definition of Done

- [ ] `complete-stage` Server Action handles all four `StageOutcome` values
- [ ] Atomic `$transaction` for all outcome types — no partial writes possible
- [ ] Race condition guard via `where: { completedAt: null }`
- [ ] `git commit: feat(multi-stage): stage completion and auto-advance`
