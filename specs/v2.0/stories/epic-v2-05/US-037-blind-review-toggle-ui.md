# User Story: Blind Review Toggle in Pipeline Config UI

**Story ID**: US-037
**Epic**: EPIC-V2-05 — Blind Review
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 6 — Step 2
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** SUPERADMIN,
**I want to** enable or disable blind review per pipeline from the pipeline configuration page,
**so that** I can control evaluation objectivity without requiring a code deployment.

---

## Context & Motivation

The `blindReview` field (US-036) is useless without a UI to toggle it. Adding the toggle to the existing `/admin/review-config` pipeline editor (US-032) keeps all pipeline configuration in one place and avoids a new settings page. The toggle must be SUPERADMIN-only — regular admins cannot change blind review settings.

---

## Acceptance Criteria

1. **Given** I am SUPERADMIN on `/admin/review-config`,
   **When** I expand a pipeline accordion,
   **Then** I see a row labelled "Enable Blind Review" with a toggle switch (`Switch` from shadcn/ui) and an info icon with a tooltip: "When enabled, reviewers see 'Anonymous Submitter' instead of the author's name until the final decision is recorded. SUPERADMIN users always see the true identity."

2. **Given** the pipeline has ideas currently `UNDER_REVIEW`,
   **When** I toggle blind review to `true` and click Save,
   **Then** an amber warning banner appears above the Save button: "Blind review will apply immediately to all active reviews in this pipeline. Reviewers currently viewing these ideas must refresh." Save is still permitted.

3. **Given** I toggle blind review and click Save,
   **When** the Server Action runs,
   **Then** `ReviewPipeline.blindReview` is updated, a `PIPELINE_UPDATED` audit log entry is written with `metadata: { field: "blindReview", newValue: true/false }`, and a success toast is shown.

4. **Given** an `ADMIN` (non-SUPERADMIN) opens the pipeline config page,
   **When** the page loads,
   **Then** the blind review toggle row is not rendered — it is absent from the DOM, not just disabled.

5. **Given** `FEATURE_BLIND_REVIEW_ENABLED=false`,
   **When** the page loads for SUPERADMIN,
   **Then** the toggle is rendered but disabled with a tooltip: "Blind review is currently disabled by a feature flag."

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                            | Expected Behavior                                                                   |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | ADMIN directly calls `PATCH /api/admin/pipelines/[id]` with `{ blindReview: true }` | Server Action enforces `SUPERADMIN` only — returns `403 Forbidden`                  |
| 2   | SUPERADMIN enables blind review, then immediately disables it in the same session   | Each toggle save updates the DB — no caching of the old value between the two saves |

---

## UI / UX Notes

- Toggle placement: below the stage list, above the "Set as Default" button, inside the pipeline accordion.
- Layout: `flex items-center justify-between` row — left: label + info icon (`Info` from Lucide with tooltip); right: `Switch`.
- Warning banner: shadcn/ui `Alert` with `variant="warning"` (amber). Appears conditionally when toggling to `true` on a pipeline with active ideas — evaluated client-side using a `hasActiveReviews` boolean prop passed from the server.
- Success toast: "Blind review has been enabled/disabled for [Pipeline Name]."

---

## Technical Notes

- Extend `updatePipeline` Server Action (from US-032) to accept `blindReview: boolean` as an optional field.
- Server-side guard: `if (session.user.role !== 'SUPERADMIN' && 'blindReview' in data) return error('403')`.
- `hasActiveReviews` boolean: determined server-side when loading the pipeline config page — `prisma.ideaStageProgress.count({ where: { idea: { pipelineId: pipeline.id, status: 'UNDER_REVIEW' }, completedAt: null } }) > 0`.
- **Feature Flag**: `FEATURE_BLIND_REVIEW_ENABLED`.

---

## Dependencies

| Dependency                                       | Type  | Status             | Blocker? |
| ------------------------------------------------ | ----- | ------------------ | -------- |
| US-036 — `blindReview` field exists in DB        | Story | Must be done first | Yes      |
| US-032 — Pipeline config page (the UI to extend) | Story | Must be done first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] SUPERADMIN toggles blind review on → saved; `blindReview = true` in DB; audit entry written
- [ ] SUPERADMIN toggles on a pipeline with active reviews → warning banner shown
- [ ] ADMIN opens pipeline config → no blind review toggle visible
- [ ] `FEATURE_BLIND_REVIEW_ENABLED=false` → toggle visible but disabled

### Automated Testing

- [ ] Integration: `updatePipeline({ blindReview: true })` with SUPERADMIN session → DB updated
- [ ] Integration: `updatePipeline({ blindReview: true })` with ADMIN session → `403`
- [ ] Unit: toggle renders as disabled when `featureEnabled=false`

---

## Definition of Done

- [ ] Toggle added to pipeline config accordion (SUPERADMIN view only)
- [ ] Feature-flag-disabled state renders toggle as disabled
- [ ] `PIPELINE_UPDATED` audit entry written on toggle save
- [ ] `git commit: feat(blind-review): blind review toggle in pipeline config UI`
