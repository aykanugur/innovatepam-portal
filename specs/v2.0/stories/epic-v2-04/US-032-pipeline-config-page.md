# User Story: Review Pipeline Config Page (SUPERADMIN)

**Story ID**: US-032
**Epic**: EPIC-V2-04 — Multi-Stage Review
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: M
**Sprint**: Phase 5 — Step 2
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** SUPERADMIN,
**I want to** configure review pipelines — adding, editing, and reordering stages — on a dedicated admin page,
**so that** I can customise the review workflow for different idea categories without requiring a code change.

---

## Context & Motivation

The default pipeline (seeded in US-031) covers the standard case. Over time, different categories (e.g., "Technical Innovation" vs "Cost Reduction") may need different review stages. The SUPERADMIN pipeline config page provides a UI-driven way to manage pipelines and stages without manually editing database seeds or running migrations.

---

## Acceptance Criteria

1. **Given** I am SUPERADMIN and navigate to `/admin/review-config`,
   **When** the page loads,
   **Then** I see a list of all `ReviewPipeline` records, each in an expandable accordion showing its stages in `order` sequence.

2. **Given** I click "Add Pipeline",
   **When** I enter a pipeline name and click "Save",
   **Then** a new `ReviewPipeline` record is created with `isDefault=false`.

3. **Given** I expand a pipeline and click "Add Stage",
   **When** I enter a stage name and toggle "Is Decision Stage",
   **Then** a new `ReviewPipelineStage` is created with `order = (max existing order) + 1` for that pipeline.

4. **Given** I drag a stage to a new position in the order,
   **When** I drop it,
   **Then** the `order` values of all affected stages are updated atomically.

5. **Given** I set a pipeline as the default,
   **When** I click "Set as Default",
   **Then** that pipeline's `isDefault` is set to `true` and all other pipelines have `isDefault` set to `false` — at most one default at a time.

6. **Given** an `ADMIN` (non-SUPERADMIN) navigates to `/admin/review-config`,
   **When** the page loads,
   **Then** the server returns a redirect to `/forbidden`.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                                      | Expected Behavior                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1   | SUPERADMIN tries to delete a pipeline that has active ideas (ideas currently `UNDER_REVIEW` in that pipeline) | Server returns `409`: "Cannot delete a pipeline with active reviews. Reassign or close all active ideas first."     |
| 2   | SUPERADMIN tries to delete the only remaining pipeline                                                        | Server returns `409`: "At least one pipeline must exist."                                                           |
| 3   | Stage reorder drag-and-drop leaves a `PASS` transition from the last stage (non-decision stage at the end)    | A warning badge appears on the stage: "This stage has no decision stage after it." User is not blocked from saving. |

---

## UI / UX Notes

- Route: `/admin/review-config` — accessible only to `SUPERADMIN`
- Layout: a list of `Accordion` items (shadcn/ui), one per pipeline. Inside each accordion: stage list with drag handles (using `@dnd-kit/core`).
- Stage rows: drag handle (`GripVertical` icon) | stage name | "Decision Stage" badge (if `isDecisionStage=true`) | Edit (pencil) | Delete (trash) icons.
- New pipeline / new stage: inline form that expands inline (not a modal).
- "Set as Default" button: `Badge` / `Button` in the pipeline header. Disabled and showing "Default" for the current default.
- Blind Review toggle (from EPIC-V2-05 US-037): also lives on this page — added in Phase 6.

---

## Technical Notes

- Server Actions for pipeline CRUD: `createPipeline`, `updatePipeline`, `deletePipeline`, `createStage`, `updateStage`, `deleteStage`, `reorderStages`, `setDefaultPipeline` — all in `lib/actions/pipeline-config.ts`.
- `reorderStages` receives an ordered array of `{ id, order }` and runs a `prisma.$transaction` to update all `order` values atomically.
- Route protection: middleware + server-side `getServerSession` check ensuring `role === SUPERADMIN`.
- **Feature Flag**: `FEATURE_MULTI_STAGE_REVIEW_ENABLED`.

---

## Dependencies

| Dependency                            | Type    | Status                                                    | Blocker? |
| ------------------------------------- | ------- | --------------------------------------------------------- | -------- |
| US-031 — ReviewPipeline models + seed | Story   | Must be done first                                        | Yes      |
| `@dnd-kit/core` package               | Package | Install via `npm install @dnd-kit/core @dnd-kit/sortable` | No       |

---

## Test Plan

### Manual Testing

- [ ] Add a new pipeline → appears in the list
- [ ] Add a stage → stage appears in the pipeline accordion
- [ ] Drag stage to reorder → `order` values update in DB
- [ ] Set a pipeline as default → previous default loses `isDefault=true`
- [ ] `ADMIN` navigates to `/admin/review-config` → redirected to `/forbidden`

### Automated Testing

- [ ] Integration: `createPipeline` Server Action creates a `ReviewPipeline` record
- [ ] Integration: `setDefaultPipeline` sets only one pipeline as default
- [ ] Integration: `deletePipeline` with active reviews returns `409`
- [ ] Integration: `reorderStages` updates all stage `order` values in a single transaction

---

## Definition of Done

- [ ] `/admin/review-config` page accessible to SUPERADMIN only
- [ ] Full pipeline and stage CRUD working
- [ ] Stage drag-to-reorder working with atomic DB update
- [ ] One-default-at-a-time enforced
- [ ] `git commit: feat(multi-stage): review pipeline config page`
