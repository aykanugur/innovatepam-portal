# User Story: ReviewPipeline, ReviewPipelineStage & IdeaStageProgress Models + Seed

**Story ID**: US-031
**Epic**: EPIC-V2-04 — Multi-Stage Review
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: S
**Sprint**: Phase 5 — Step 1
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** developer,
**I want to** create the `ReviewPipeline`, `ReviewPipelineStage`, and `IdeaStageProgress` Prisma models with the `StageOutcome` enum and seed the default pipeline,
**so that** the multi-stage review system has a fully-defined data layer before UI or business logic is implemented.

---

## Context & Motivation

The multi-stage review system is the most data-model-intensive phase of V2.0. All five Phase 5 stories depend on this schema being correct and seeded from the start. Getting the model relationships and constraints right before building UI is critical — reworking a production schema mid-development is significantly more costly than up-front design.

---

## Acceptance Criteria

1. **Given** the migration is applied,
   **When** the three new tables are inspected,
   **Then** `ReviewPipeline`, `ReviewPipelineStage`, and `IdeaStageProgress` all exist with the column structure defined in the PRD V2.0 Section 8.

2. **Given** the seed runs,
   **When** `ReviewPipeline` is queried,
   **Then** one default pipeline exists named "Standard Review" with `isDefault=true` containing two stages: Stage 1 (Technical Review, `order=1`, `isDecisionStage=false`) and Stage 2 (Final Decision, `order=2`, `isDecisionStage=true`).

3. **Given** the `StageOutcome` enum,
   **When** it is inspected in the database,
   **Then** it contains exactly four values: `PASS`, `ESCALATE`, `ACCEPTED`, `REJECTED`.

4. **Given** an `IdeaStageProgress` row is created,
   **When** `Idea` is deleted via cascade,
   **Then** the `IdeaStageProgress` row is also deleted (`onDelete: Cascade` on the `ideaId` FK).

5. **Given** the seed runs twice (idempotency),
   **When** `ReviewPipeline` is queried,
   **Then** only one "Standard Review" pipeline exists — the seed uses `upsert`.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                                             | Expected Behavior                                                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Two `ReviewPipelineStage` rows in the same pipeline have the same `order` value                                      | `@@unique([pipelineId, order])` constraint on `ReviewPipelineStage` prevents this at the DB level                                                                                          |
| 2   | An `IdeaStageProgress` row is created with a `stageId` that belongs to a different pipeline than the idea's pipeline | Application-layer validation in the stage initialisation Server Action (US-033) prevents this mismatch; no DB constraint enforces it                                                       |
| 3   | Multiple `ReviewPipeline` rows have `isDefault=true`                                                                 | Application-layer logic ensures only one default pipeline at a time; enforce via a `@@unique` partial index if PostgreSQL version supports it; otherwise enforce in the config UI (US-032) |

---

## UI / UX Notes

N/A — data layer only.

---

## Technical Notes

- New models (add to `schema.prisma`):

  ```prisma
  model ReviewPipeline {
    id         String                @id @default(cuid())
    name       String
    category   String?               // null = applies to all categories
    isDefault  Boolean               @default(false)
    blindReview Boolean              @default(false) // added in Phase 6
    stages     ReviewPipelineStage[]
    createdAt  DateTime              @default(now())
    updatedAt  DateTime              @updatedAt
  }

  model ReviewPipelineStage {
    id              String              @id @default(cuid())
    pipelineId      String
    pipeline        ReviewPipeline      @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
    name            String
    order           Int
    isDecisionStage Boolean             @default(false)
    progress        IdeaStageProgress[]
    @@unique([pipelineId, order])
  }

  model IdeaStageProgress {
    id          String              @id @default(cuid())
    ideaId      String
    idea        Idea                @relation(fields: [ideaId], references: [id], onDelete: Cascade)
    stageId     String
    stage       ReviewPipelineStage @relation(fields: [stageId], references: [id])
    reviewerId  String?
    reviewer    User?               @relation("UserStageReviews", fields: [reviewerId], references: [id])
    outcome     StageOutcome?
    comment     String?
    startedAt   DateTime            @default(now())
    completedAt DateTime?
    @@index([ideaId])
  }

  enum StageOutcome {
    PASS
    ESCALATE
    ACCEPTED
    REJECTED
  }
  ```

- Add `pipelineId String?` and `stageProgressItems IdeaStageProgress[]` to the `Idea` model.
- Seed: `prisma/seed.ts` extended with `ReviewPipeline` + `ReviewPipelineStage` upserts.
- **Feature Flag**: `FEATURE_MULTI_STAGE_REVIEW_ENABLED` — does not affect migration or seed.

---

## Dependencies

| Dependency                   | Type  | Status                 | Blocker? |
| ---------------------------- | ----- | ---------------------- | -------- |
| All other EPIC-V2-04 stories | Story | Must follow this story | No       |

---

## Test Plan

### Manual Testing

- [ ] `prisma migrate dev` applies cleanly — all three tables and `StageOutcome` enum exist
- [ ] `npx prisma db seed` creates the default "Standard Review" pipeline with 2 stages
- [ ] Seed runs twice — no duplicate data

### Automated Testing

- [ ] Integration: creating an `IdeaStageProgress` row and then deleting the parent `Idea` cascades the deletion
- [ ] Integration: creating two `ReviewPipelineStage` rows with the same `(pipelineId, order)` throws a unique constraint error

---

## Definition of Done

- [ ] All three models + `StageOutcome` enum migrated
- [ ] Default pipeline seeded (upsert-safe)
- [ ] `Idea` model updated with `pipelineId` and `stageProgressItems` relation
- [ ] Zero TypeScript errors
- [ ] `git commit: feat(multi-stage): ReviewPipeline, ReviewPipelineStage, IdeaStageProgress models`
