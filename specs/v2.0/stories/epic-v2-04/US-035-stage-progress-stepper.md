# User Story: Stage Progress Stepper on Idea Detail

**Story ID**: US-035
**Epic**: EPIC-V2-04 — Multi-Stage Review
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 5 — Step 5
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** submitter or admin viewing an idea that is `UNDER_REVIEW`,
**I want to** see a stage progress stepper showing which review stages are complete, which is active, and which are pending,
**so that** the review pipeline is transparent and I can understand where the idea is in the process.

---

## Context & Motivation

Without visibility into the pipeline, submitters experience the review process as a black box. A stepper component makes the multi-stage process legible: submitters see how many stages their idea has passed through; admins get a quick orientation when they first open an idea. The stepper is display-only — no actions are taken from it.

---

## Acceptance Criteria

1. **Given** an idea is `UNDER_REVIEW` with a pipeline that has 3 stages,
   **When** the idea detail page loads,
   **Then** a stepper component shows 3 steps: completed stages (✓ icon, green), the current active stage (spinner/clock icon, blue), and pending stages (grey circle).

2. **Given** an idea has completed Stage 1 (`outcome=PASS`) and Stage 2 is active,
   **When** the stepper renders,
   **Then** Stage 1 shows a completed tick, Stage 2 shows an active state, Stage 3 shows pending.

3. **Given** the idea decision is `ACCEPTED` or `REJECTED`,
   **When** the stepper renders,
   **Then** all stages show completed ticks and the last stage shows the outcome badge (`ACCEPTED` = green / `REJECTED` = red).

4. **Given** a V1-era idea with no `pipelineId` and no `IdeaStageProgress` records,
   **When** the idea detail page loads,
   **Then** no stepper is rendered — the V1 status badge is shown instead.

5. **Given** `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false`,
   **When** the idea detail page loads,
   **Then** no stepper is rendered regardless of whether `IdeaStageProgress` data exists.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                            | Expected Behavior                                                                                                                       |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | An idea has `IdeaStageProgress` rows but `pipelineId` is null (data inconsistency)  | Stepper is not rendered — the component requires both `pipelineId` and at least one `stageProgress` row                                 |
| 2   | Pipeline has been modified after the idea was claimed (stages renamed or reordered) | Stepper renders using the stage names from the `IdeaStageProgress.stage` relation — the joined stage name reflects the current DB value |
| 3   | ESCALATE outcome creates two `IdeaStageProgress` rows for the same stage            | The stepper renders the stage once, showing the most recent `IdeaStageProgress` entry for that `stageId` (by `startedAt DESC`)          |

---

## UI / UX Notes

- Stepper component: `components/ideas/stage-progress-stepper.tsx`
- Render position: between the idea metadata card and the description section on the detail page.
- Stepper style: horizontal for ≤ 4 stages; vertical for > 4 stages (CSS `@media` or className toggle based on stage count).
- Stage state indicators:
  - Completed: `CheckCircle2` icon (Lucide), `text-green-600`
  - Active: `Clock` icon (Lucide), `text-blue-500`, subtle pulse animation
  - Pending: `Circle` icon (Lucide), `text-muted-foreground`
  - Decision stage completed (ACCEPTED): `CheckCircle2` with a green `"Accepted"` badge
  - Decision stage completed (REJECTED): `XCircle` icon, red `"Rejected"` badge
- The stepper is read-only for all roles — no click actions.

---

## Technical Notes

- The idea detail query must include `stageProgressItems: { include: { stage: true }, orderBy: { startedAt: 'desc' } }` and `pipeline: { include: { stages: { orderBy: { order: 'asc' } } } }`.
- The `StageProgressStepper` component receives: `pipeline: ReviewPipeline & { stages: ReviewPipelineStage[] }` and `progressItems: IdeaStageProgress[]` as props.
- For each stage in `pipeline.stages`, find the latest matching `progressItem` (by `stageId`). If none → pending. If `completedAt != null` → completed. If `completedAt == null` → active.
- **Feature Flag**: `FEATURE_MULTI_STAGE_REVIEW_ENABLED`.

---

## Dependencies

| Dependency                                                        | Type  | Status                           | Blocker? |
| ----------------------------------------------------------------- | ----- | -------------------------------- | -------- |
| US-031 — Models                                                   | Story | Must be done first               | Yes      |
| US-033 — Stage initialisation (produces progress rows to display) | Story | Required for real data           | No       |
| US-034 — Stage completion (produces completed rows)               | Story | Required for full stepper states | No       |

---

## Test Plan

### Manual Testing

- [ ] Idea in Stage 1 (active) → stepper shows Stage 1 active, Stage 2+ pending
- [ ] Idea that passed Stage 1 (active in Stage 2) → Stage 1 completed, Stage 2 active
- [ ] Decided idea (`ACCEPTED`) → all stages completed; last stage shows "Accepted" badge
- [ ] V1 idea → no stepper shown

### Automated Testing

- [ ] Unit: `StageProgressStepper` renders correct state (completed/active/pending) for each stage given a mock `progressItems` array
- [ ] Unit: ESCALATE duplicate progress rows — stepper renders stage once (latest row)
- [ ] Unit: V1 idea (no pipeline) — component returns `null`

---

## Definition of Done

- [ ] `StageProgressStepper` component renders all valid stage states
- [ ] Idea detail query updated to include stage progress and pipeline data
- [ ] V1 ideas and feature-flag-disabled state both safely render no stepper
- [ ] `git commit: feat(multi-stage): stage progress stepper on idea detail`
