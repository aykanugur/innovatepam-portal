# User Story: Stage Initialisation on Claim

**Story ID**: US-033
**Epic**: EPIC-V2-04 — Multi-Stage Review
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: S
**Sprint**: Phase 5 — Step 3
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** admin,
**I want** the review pipeline to initialise automatically when I claim an idea for review,
**so that** I land directly on the first review stage without requiring a separate setup action.

---

## Context & Motivation

In V1, claiming an idea transitions it directly to `UNDER_REVIEW` with no stage structure. In V2.0, claiming must additionally: select the correct pipeline (based on the idea's category, or the default pipeline if no category-specific pipeline exists), create the first `IdeaStageProgress` row for Stage 1, and assign the claiming admin as the Stage 1 reviewer. This must happen atomically — no partial state should be possible.

---

## Acceptance Criteria

1. **Given** an admin claims a `SUBMITTED` idea,
   **When** the claim Server Action runs,
   **Then** a single `prisma.$transaction` performs:
   - `Idea.status` updated to `UNDER_REVIEW`
   - `Idea.pipelineId` set to the matched pipeline's `id`
   - One `IdeaStageProgress` row created for Stage 1 of that pipeline with `reviewerId = session.user.id`, `startedAt = now()`, `completedAt = null`

2. **Given** multiple `ReviewPipeline` records exist,
   **When** an idea of category "Technical Innovation" is claimed,
   **Then** the pipeline whose `category = "Technical Innovation"` is selected; if no category-specific pipeline exists, the pipeline with `isDefault = true` is used.

3. **Given** the claim transaction completes,
   **When** the admin is redirected to the review panel,
   **Then** the URL is `/admin/review/[ideaId]/stage/[stage1Id]`.

4. **Given** the claim transaction fails (e.g., DB error),
   **When** the failure occurs,
   **Then** neither the `Idea` status update nor the `IdeaStageProgress` creation is persisted — the idea remains `SUBMITTED`.

5. **Given** `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false`,
   **When** an admin claims an idea,
   **Then** the V1 claim flow applies: `Idea.status` → `UNDER_REVIEW`; no `IdeaStageProgress` created; redirect to V1 review panel.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                 | Expected Behavior                                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | No pipeline exists at all (e.g., default pipeline was deleted)           | Server Action returns `500`: "No review pipeline available. Contact SUPERADMIN to configure a pipeline."                                                                                                                                                 |
| 2   | Two admins simultaneously claim the same idea                            | Optimistic lock via `Idea.version` (if implemented) OR the second claim receives a `409`: "This idea has already been claimed." Use a DB-level check: `where: { status: 'SUBMITTED' }` in the update — Prisma returns count 0 if status already changed. |
| 3   | Idea's category has a matched pipeline but that pipeline has zero stages | Server Action returns `400`: "The matched pipeline has no stages. Contact SUPERADMIN."                                                                                                                                                                   |

---

## UI / UX Notes

- The "Claim" button on the admin pending queue is unchanged visually — only the Server Action logic changes.
- After successful claim, the admin is redirected to `/admin/review/[ideaId]/stage/[stage1Id]` — a new page route (rendered in US-034/US-035).
- Loading state on the claim button: "Claiming…" with spinner.

---

## Technical Notes

- Server Action: `lib/actions/claim-idea.ts` — extend the existing V1 `claimIdea` or create a V2 wrapper.
- Pipeline selection logic:
  ```ts
  const pipeline = await prisma.reviewPipeline.findFirst({
    where: { OR: [{ category: idea.category }, { isDefault: true }] },
    orderBy: [{ category: 'asc' }], // category-specific pipelines take precedence over default
    include: { stages: { orderBy: { order: 'asc' }, take: 1 } },
  })
  ```
- The transaction:
  ```ts
  await prisma.$transaction([
    prisma.idea.update({
      where: { id: ideaId, status: 'SUBMITTED' },
      data: { status: 'UNDER_REVIEW', pipelineId: pipeline.id },
    }),
    prisma.ideaStageProgress.create({
      data: { ideaId, stageId: stage1.id, reviewerId: session.user.id },
    }),
    prisma.auditLog.create({ data: { action: 'IDEA_CLAIMED', actorId: session.user.id, ideaId } }),
  ])
  ```
- The `where: { status: 'SUBMITTED' }` guard in the `idea.update` ensures idempotency — if another admin claimed it first, Prisma throws a `P2025` (record not found), which the Server Action catches and returns as `409`.
- **Feature Flag**: `FEATURE_MULTI_STAGE_REVIEW_ENABLED`.

---

## Dependencies

| Dependency                                                       | Type  | Status               | Blocker? |
| ---------------------------------------------------------------- | ----- | -------------------- | -------- |
| US-031 — ReviewPipeline models + seed                            | Story | Must be done first   | Yes      |
| US-032 — Pipeline config page (ensures pipelines are configured) | Story | Should be done first | No       |

---

## Test Plan

### Manual Testing

- [ ] Admin claims a submitted idea → `IdeaStageProgress` row created for Stage 1; idea status is `UNDER_REVIEW`
- [ ] Admin redirected to `/admin/review/[ideaId]/stage/[stage1Id]`
- [ ] Two admins claim simultaneously → second gets `409`
- [ ] `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false` → V1 claim flow applies

### Automated Testing

- [ ] Integration: `claimIdea` creates `IdeaStageProgress` + updates `Idea.status` atomically
- [ ] Integration: claiming an already-`UNDER_REVIEW` idea returns `409`
- [ ] Integration: idea with a category-specific pipeline uses that pipeline (not the default)
- [ ] Integration: idea with no matching category-specific pipeline uses the default pipeline

---

## Definition of Done

- [ ] Claim Server Action selects correct pipeline and creates Stage 1 `IdeaStageProgress` atomically
- [ ] Redirect to stage review panel URL after claim
- [ ] Concurrent claim handled gracefully via `P2025` catch
- [ ] `git commit: feat(multi-stage): stage initialisation on claim`
