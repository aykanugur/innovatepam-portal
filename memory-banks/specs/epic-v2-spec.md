# V2.0 Epics — Implementation Status

**Last Updated**: 2026-02-27  
**Version**: 1.0  
**Status**: V2.0 in active development (5/6 epics complete)  
**Owner**: Aykan Uğur

---

## V2.0 Epic Overview

V2.0 adds a multi-stage, configurable review pipeline on top of the Phase 1 MVP foundation.  
All V2.0 work lives under `specs/v2.0/` inside the app.

---

## EPIC-V2-01 — Foundation & Multi-Stage Review Infrastructure

**Status**: ✅ Complete  
**Branch**: merged to `master`

Introduced the core data model for the multi-stage pipeline.  
Key additions:

- `ReviewPipeline` model — named, per-category pipelines owned by SUPERADMIN
- `PipelineStage` model — ordered stages within a pipeline (one may be `isDecisionStage`)
- `IdeaStageProgress` model — tracks per-idea, per-stage reviewer assignment and outcomes
- Feature flag: `FEATURE_MULTI_STAGE_REVIEW_ENABLED`
- State machine for `IdeaStatus` transitions via `lib/state-machine/idea-status.ts`

---

## EPIC-V2-02 — Idea Submission V2 (Smart Forms)

**Status**: ✅ Complete  
**Branch**: merged to `master`

Dynamic field templates per category. Admins can configure extra fields for each category.  
Key additions:

- `FieldTemplate` type (`types/field-template.ts`)
- `constants/field-templates.ts` — per-category field definitions
- Extended `createIdea` schema with `dynamicFields: Record<string, unknown>`
- Smart form UI renders appropriate fields based on selected category

---

## EPIC-V2-03 — Claim & Complete Stage

**Status**: ✅ Complete  
**Branch**: merged to `master`

ADMINs (and SUPERADMINs) can claim a stage, review it, then PASS or REJECT.  
Key additions:

- `lib/actions/claim-stage.ts` — assign reviewer to a `IdeaStageProgress` record
- `lib/actions/complete-stage.ts` — record outcome (PASS / REJECT / ESCALATE)
- Admin review UI: `/admin/review/[id]/stage/[stageId]/page.tsx`
- Self-review guard at every action

---

## EPIC-V2-04 — Decision Stage & Final Status Transitions

**Status**: ✅ Complete  
**Branch**: merged to `master`

The last stage of a pipeline is the decision stage. Completing it with PASS→ACCEPTED or REJECT→REJECTED.  
Key additions:

- `isDecisionStage` flag on `PipelineStage`
- `StageCompletionPanel` component
- `complete-stage.ts` updated to handle terminal transitions
- Escalation outcome type added

---

## EPIC-V2-05 — Blind Review

**Status**: ✅ Complete — merged `3e0a7ce` → `master`  
**Branch**: `001-blind-review` (merged and deleted)

SUPERADMIN can toggle blind review on a pipeline so ADMINs see `'Anonymous'` as the author during `UNDER_REVIEW`.  
Key additions:

- `blindReview: Boolean` on `ReviewPipeline` model
- Migration: `20260226192945_add_blind_review_to_pipeline`
- `lib/blind-review.ts` — pure masking utility `maskAuthorIfBlind()` (100% test coverage)
- Feature flag: `FEATURE_BLIND_REVIEW_ENABLED`
- `components/pipeline/pipeline-config-form.tsx` — Switch/Tooltip/Alert toggle
- Masking applied at 4 call sites: idea detail, API route, admin review pages (×2)
- 12 unit tests

### Five-Condition Predicate

```
featureFlagEnabled
  AND pipeline.blindReview === true
  AND idea.status === 'UNDER_REVIEW'
  AND requester.role === 'ADMIN'       (not SUPERADMIN)
  AND requester.id !== idea.authorId
```

---

## EPIC-V2-06 — Scoring System

**Status**: ✅ Complete (merged 2026-02-27)
**Branch**: `feat/v2-scoring-system`

ADMINs assign a 1–5 star score at the decision stage. Score is visible to the submitter post-decision.  
Required:

- `IdeaScore` model with `score Int` (1–5 DB constraint), optional `criteriaTag` array
- Score required before ACCEPTED/REJECTED can be finalised
- Submitter sees score on `/ideas/[id]` after decision
- 3 analytics widgets: avg score by category, score histogram, top-scored ideas

**Dependencies**: EPIC-V2-04 (decision stage, `StageCompletionPanel`) — already complete.

---

## Phase 1 MVP (V1.0) — Status: ✅ COMPLETE

All P1 Must stories shipped and verified:

| Story  | Description                  | Status |
| ------ | ---------------------------- | ------ |
| US-001 | Next.js scaffold             | ✅     |
| US-002 | Database & Prisma schema     | ✅     |
| US-003 | Environment & Vercel deploy  | ✅     |
| US-004 | User registration            | ✅     |
| US-005 | Email verification           | ✅     |
| US-006 | Login / logout               | ✅     |
| US-007 | User management (SUPERADMIN) | ✅     |
| US-008 | Submit idea form             | ✅     |
| US-009 | Idea list view               | ✅     |
| US-010 | Idea detail view             | ✅     |
| US-011 | My ideas view                | ✅     |
| US-012 | Admin review queue           | ✅     |
| US-013 | Finalize review (AC/REJ)     | ✅     |
| US-014 | Analytics page               | ✅     |
| US-015 | Settings page                | ✅     |
| US-016 | GA smoke test & v1.0.0 tag   | ✅     |

---

## Spec File Index — V2.0

### PRD

- [specs/v2.0/prd-v2.0.md](../../specs/v2.0/prd-v2.0.md)

### Epics

- [EPIC-V2-01 Smart Forms](../../specs/v2.0/epics/EPIC-V2-01-smart-forms.md)
- [EPIC-V2-02 Multi-Media](../../specs/v2.0/epics/EPIC-V2-02-multi-media.md)
- [EPIC-V2-03 Draft Management](../../specs/v2.0/epics/EPIC-V2-03-draft-management.md)
- [EPIC-V2-04 Multi-Stage Review](../../specs/v2.0/epics/EPIC-V2-04-multi-stage-review.md)
- [EPIC-V2-05 Blind Review](../../specs/v2.0/epics/EPIC-V2-05-blind-review.md)
- [EPIC-V2-06 Scoring System](../../specs/v2.0/epics/EPIC-V2-06-scoring-system.md)

### V2 User Stories

**EPIC-V2-01 Smart Forms (US-017–020)**

- [US-017 Category field template model](../../specs/v2.0/stories/epic-v2-01/US-017-category-field-template-model.md)
- [US-018 Dynamic fields column](../../specs/v2.0/stories/epic-v2-01/US-018-dynamic-fields-column.md)
- [US-019 Dynamic form rendering](../../specs/v2.0/stories/epic-v2-01/US-019-dynamic-form-rendering.md)
- [US-020 Dynamic field display](../../specs/v2.0/stories/epic-v2-01/US-020-dynamic-field-display.md)

**EPIC-V2-02 Multi-Media Attachments (US-021–025)**

- [US-021 Idea attachment model](../../specs/v2.0/stories/epic-v2-02/US-021-idea-attachment-model.md)
- [US-022 Multi-file upload UI](../../specs/v2.0/stories/epic-v2-02/US-022-multi-file-upload-ui.md)
- [US-023 Attachment list/detail](../../specs/v2.0/stories/epic-v2-02/US-023-attachment-list-detail.md)
- [US-024 Attachment proxy route](../../specs/v2.0/stories/epic-v2-02/US-024-attachment-proxy-route.md)
- [US-025 Admin delete attachment](../../specs/v2.0/stories/epic-v2-02/US-025-admin-delete-attachment.md)

**EPIC-V2-03 Draft Management (US-026–030)**

- [US-026 Draft status state machine](../../specs/v2.0/stories/epic-v2-03/US-026-draft-status-state-machine.md)
- [US-027 Save draft action](../../specs/v2.0/stories/epic-v2-03/US-027-save-draft-action.md)
- [US-028 Drafts tab my-ideas](../../specs/v2.0/stories/epic-v2-03/US-028-drafts-tab-my-ideas.md)
- [US-029 Resume draft edit](../../specs/v2.0/stories/epic-v2-03/US-029-resume-draft-edit.md)
- [US-030 Draft expiry cron](../../specs/v2.0/stories/epic-v2-03/US-030-draft-expiry-cron.md)

**EPIC-V2-04 Multi-Stage Review (US-031–035)**

- [US-031 Review pipeline models](../../specs/v2.0/stories/epic-v2-04/US-031-review-pipeline-models.md)
- [US-032 Pipeline config page](../../specs/v2.0/stories/epic-v2-04/US-032-pipeline-config-page.md)
- [US-033 Stage initialisation on claim](../../specs/v2.0/stories/epic-v2-04/US-033-stage-initialisation-on-claim.md)
- [US-034 Stage completion auto-advance](../../specs/v2.0/stories/epic-v2-04/US-034-stage-completion-auto-advance.md)
- [US-035 Stage progress stepper](../../specs/v2.0/stories/epic-v2-04/US-035-stage-progress-stepper.md)

**EPIC-V2-05 Blind Review (US-036–039) — ✅ Complete**

- [US-036 Blind review field migration](../../specs/v2.0/stories/epic-v2-05/US-036-blind-review-field-migration.md)
- [US-037 Blind review toggle UI](../../specs/v2.0/stories/epic-v2-05/US-037-blind-review-toggle-ui.md)
- [US-038 Server-side masking](../../specs/v2.0/stories/epic-v2-05/US-038-server-side-masking.md)
- [US-039 Audit log exemption](../../specs/v2.0/stories/epic-v2-05/US-039-audit-log-exemption.md)

**EPIC-V2-06 Scoring System (US-040–044) — ⏳ Not started**

- [US-040 Idea score model](../../specs/v2.0/stories/epic-v2-06/US-040-idea-score-model.md)
- [US-041 Star rating input](../../specs/v2.0/stories/epic-v2-06/US-041-star-rating-input.md)
- [US-042 Criteria tag multi-select](../../specs/v2.0/stories/epic-v2-06/US-042-criteria-tag-multi-select.md)
- [US-043 Score visibility detail](../../specs/v2.0/stories/epic-v2-06/US-043-score-visibility-detail.md)
- [US-044 Analytics widgets](../../specs/v2.0/stories/epic-v2-06/US-044-analytics-widgets.md)

### Sprint Spec Folders

- [001-smart-forms/](../../specs/v2.0/001-smart-forms/) — plan, tasks, contracts, data-model
- [001-multi-media-attachments/](../../specs/v2.0/001-multi-media-attachments/)
- [001-draft-management/](../../specs/v2.0/001-draft-management/)
- [001-multi-stage-review/](../../specs/v2.0/001-multi-stage-review/)
- [001-blind-review/](../../specs/v2.0/001-blind-review/) ← active sprint spec (complete)
- [001-idea-submission/](../../specs/v2.0/001-idea-submission/)
