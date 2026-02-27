# Feature Specification: Multi-Stage Review

**Feature Branch**: `001-multi-stage-review`
**Created**: 2026-02-26
**Status**: Draft
**Epic Reference**: EPIC-V2-04 — specs/v2.0/epics/EPIC-V2-04-multi-stage-review.md

---

## Clarifications

### Session 2026-02-26

- Q: How is `ReviewPipeline` bound to a category — string slug or FK to a Category DB table? → A: String slug (denormalized). The codebase uses `constants/categories.ts` string slugs throughout; a Category DB table is out of scope.
- Q: When SUPERADMIN resolves an escalated idea, what are the available actions? → A: SUPERADMIN selects `PASS` (advance to next stage) or `REJECT` (close idea) directly via a resolution form — no re-claim of the stage is required.
- Q: If a pipeline changes after idea submission but before Stage 1 is claimed, which pipeline version applies to the idea? → A: Claim-time version. `IdeaStageProgress` rows are created at Stage 1 claim time using the category's current pipeline; no pipeline reference is stored at submission time.
- Q: Can a regular ADMIN see the escalation queue, or is it SUPERADMIN-only? → A: Both roles see it. Regular ADMINs see escalated ideas read-only (no resolution actions). SUPERADMIN sees it with `Resolve` actions (PASS/REJECT).
- Q: Does stage reorder (up/down arrows) save per-click immediately or batch to the Save Pipeline button? → A: Batched save. Reorder changes are local in the UI until the user clicks "Save Pipeline" — no per-click server calls.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — SUPERADMIN Configures a Pipeline (Priority: P1)

Aykan (SUPERADMIN) visits `/admin/review-config` and sees all 5 idea categories listed. He clicks "Configure" next to "New Product/Service" and builds a 3-stage pipeline: "Initial Screen" → "Technical Feasibility" → "Final Decision" (decision stage). He saves it. From that point on, all new ideas in that category follow the 3-stage flow.

**Why this priority**: Pipeline configuration is the prerequisite for all multi-stage review behaviour. Without it, the entire feature cannot be demonstrated.

**Independent Test**: Log in as SUPERADMIN, visit `/admin/review-config`, create a 3-stage pipeline (one marked decision stage), save, and confirm the pipeline persists with correct stage names and order.

**Acceptance Scenarios**:

1. **Given** a SUPERADMIN session, **When** I visit `/admin/review-config`, **Then** I see all 5 categories each showing their current pipeline name or "Default (2-stage)".
2. **Given** the config page, **When** I add 3 named stages, mark one as the decision stage, and save, **Then** the pipeline is persisted with all 3 stages in correct order.
3. **Given** a pipeline with 0 decision stages, **When** I attempt to save, **Then** I see "Exactly one stage must be marked as the decision stage."
4. **Given** a pipeline with 2 decision stages, **When** I attempt to save, **Then** I see "Only one stage can be the decision stage."
5. **Given** an ADMIN (non-superadmin) session, **When** I navigate to `/admin/review-config`, **Then** I receive a 403 Forbidden page.

---

### User Story 2 — Admin Claims Stage 1 and Completes It with PASS (Priority: P1)

Deniz (ADMIN) opens the admin queue and sees a `SUBMITTED` idea. He clicks "Start Review", claiming Stage 1 and moving the idea to `UNDER_REVIEW`. He enters a comment and selects `PASS`. The system auto-advances the idea to Stage 2.

**Why this priority**: Stage claim and PASS completion is the core happy-path mechanic — the foundation of the entire pipeline flow.

**Independent Test**: Claim Stage 1 on a submitted idea, enter a comment ≥ 10 chars, select PASS, and verify Stage 2 becomes active.

**Acceptance Scenarios**:

1. **Given** a `SUBMITTED` idea and `FEATURE_MULTI_STAGE_REVIEW_ENABLED=true`, **When** an admin claims Stage 1, **Then** `IdeaStageProgress` rows are created atomically for every stage in the pipeline.
2. **Given** an admin on a non-decision stage, **When** they submit `PASS` with a valid comment, **Then** the stage is marked complete and the next stage's `startedAt` is set.
3. **Given** an admin submitting a completion, **When** the comment is fewer than 10 characters, **Then** the system shows "A comment is required (minimum 10 characters)."
4. **Given** an admin who did NOT claim the stage, **When** they attempt to submit a completion, **Then** the server returns 403 Forbidden.
5. **Given** a non-decision stage, **When** an admin submits `ACCEPTED` via API, **Then** the server returns 400 Bad Request.

---

### User Story 3 — Admin Escalates to SUPERADMIN (Priority: P2)

Deniz reviews Stage 1 and determines the idea needs SUPERADMIN attention. He selects `ESCALATE` with a comment. The idea immediately appears in the "Escalated" section of the admin queue. No further stage auto-advance occurs.

**Why this priority**: Escalation is a critical edge-case safety valve, but the happy path can be demonstrated without it.

**Independent Test**: Select ESCALATE on a non-decision stage, verify the idea appears in the escalation queue, and confirm no next stage is activated.

**Acceptance Scenarios**:

1. **Given** a non-decision stage, **When** an admin selects `ESCALATE` with a valid comment, **Then** the stage outcome is `ESCALATE` and no next stage is activated.
2. **Given** an escalated idea, **When** a SUPERADMIN views `/admin/review`, **Then** the idea appears in the "Escalated" section above the main pending queue.

---

### User Story 4 — Admin Completes the Decision Stage (Priority: P1)

Deniz is on the final decision stage. He selects `ACCEPTED` with a comment. `Idea.status` becomes `ACCEPTED`, the stage is marked complete, and the audit log records both `STAGE_COMPLETED` and `IDEA_REVIEWED`.

**Why this priority**: The decision stage is the final resolution of the review flow — without it, ideas are never resolved.

**Independent Test**: Complete all prior stages with PASS, then on the decision stage select `ACCEPTED` with a valid comment, and verify `Idea.status` becomes `ACCEPTED`.

**Acceptance Scenarios**:

1. **Given** the decision stage, **When** an admin submits `ACCEPTED` with a valid comment, **Then** `Idea.status` becomes `ACCEPTED` and both `STAGE_COMPLETED` and `IDEA_REVIEWED` audit entries are created.
2. **Given** the decision stage, **When** `REJECTED` is submitted, **Then** `Idea.status` becomes `REJECTED`.
3. **Given** the decision stage, **When** an admin submits `PASS` via API, **Then** the server returns 400 Bad Request.

---

### User Story 5 — Submitter Sees Stage Progress on Idea Detail Page (Priority: P2)

Elif visits `/ideas/[id]` and sees a horizontal stepper: "Stage 1: Initial Review ✓ → Stage 2: Final Decision (In Progress)". She sees stage names and status badges but not the reviewer's name or comment on the in-progress stage.

**Why this priority**: Transparency to submitters builds trust, but the review mechanics work without the stepper.

**Independent Test**: As a SUBMITTER, view an idea in Stage 2 — verify the stepper shows Stage 1 complete and Stage 2 in-progress, with no reviewer details exposed.

**Acceptance Scenarios**:

1. **Given** a submitter viewing their idea in multi-stage review, **When** they visit the detail page, **Then** the stepper shows all stages with accurate status badges.
2. **Given** a submitter viewing an in-progress stage, **Then** reviewer name and comment are hidden until the decision stage is finalised.
3. **Given** an admin viewing the same idea, **Then** all completed stage details are visible (reviewer name, outcome, comment, timestamp).
4. **Given** a V1 idea with no `IdeaStageProgress` rows, **Then** the stepper is absent and the V1 review display is unchanged.

---

### User Story 6 — Feature Flag Preserves V1 Behaviour (Priority: P1)

When `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false`, all review activity routes through the V1 `IdeaReview` path. No `IdeaStageProgress` rows are created. The admin queue and review panel behave exactly as in V1.

**Why this priority**: V1 regression protection is non-negotiable for safe deployment.

**Independent Test**: Set flag to `false`, claim a submitted idea, assert an `IdeaReview` record is created and zero `IdeaStageProgress` rows exist.

**Acceptance Scenarios**:

1. **Given** `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false`, **When** an admin starts a review, **Then** the V1 `IdeaReview` record is created and no `IdeaStageProgress` rows exist.
2. **Given** the flag is `false`, **When** a SUPERADMIN visits `/admin/review-config`, **Then** the page is accessible and pipelines can still be configured for future use.

---

### Edge Cases

- What happens when an admin deletes a stage while an idea is in that stage? → System returns 409 Conflict; deletion is blocked.
- What if the only custom pipeline is deleted? → Category reverts to the default; in-flight ideas use their already-snapshotted `IdeaStageProgress` rows and are unaffected.
- What if Stage 1 claim fails mid-transaction? → The entire `IdeaStageProgress` creation is atomic — no partial rows persist.
- What if `ACCEPTED` is sent to a non-decision stage via a manipulated API call? → Server validates `stage.isDecisionStage` and returns 400.
- What if a pipeline gains a new stage after an idea is already in review? → In-flight ideas use their snapshotted rows only; new submissions use the updated pipeline.
- What if no admin claims Stage 2 after Stage 1 PASS? → Idea stays `UNDER_REVIEW` with Stage 2 pending — no timeout in V2.0.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST support a configurable `ReviewPipeline` per idea category, composed of an ordered sequence of named stages.
- **FR-002**: Each pipeline MUST have exactly one decision stage; zero or more than one decision stages MUST be rejected with a validation error at save time.
- **FR-003**: System MUST enforce stage name validation: required field, maximum 60 characters.
- **FR-004**: System MUST seed a default 2-stage pipeline (`isDefault=true`) for all 5 categories; the default pipeline MUST NOT be deletable.
- **FR-005**: System MUST create one `IdeaStageProgress` row per stage atomically (single transaction) when Stage 1 is first claimed.
- **FR-006**: System MUST auto-advance to the next stage when a non-decision stage is completed with `PASS`.
- **FR-007**: System MUST halt stage progression and surface the idea in the escalation queue when a non-decision stage is completed with `ESCALATE`.
- **FR-008**: System MUST update `Idea.status` to `ACCEPTED` or `REJECTED` when the decision stage is completed.
- **FR-009**: System MUST restrict stage completion to the admin who claimed that stage; any other admin returns 403 Forbidden.
- **FR-010**: System MUST validate stage completion comments: minimum 10 characters, maximum 2,000 characters.
- **FR-011**: System MUST reject `ACCEPTED`/`REJECTED` on non-decision stages and `PASS`/`ESCALATE` on the decision stage with 400 Bad Request.
- **FR-012**: System MUST block stage deletion when any `IdeaStageProgress` row for that stage has `completedAt=null`; return 409 Conflict.
- **FR-013**: System MUST block pipeline deletion when any `IdeaStageProgress` rows for that pipeline have `completedAt=null`; return 409 Conflict.
- **FR-014**: System MUST re-sequence stage order (1-based, contiguous) server-side when a stage is removed from a pipeline.
- **FR-015**: System MUST write audit log entries for `STAGE_STARTED`, `STAGE_COMPLETED`, `PIPELINE_CREATED`, `PIPELINE_UPDATED`, and `IDEA_REVIEWED` (on final decision).
- **FR-016**: System MUST route review starts through `IdeaStageProgress` when `FEATURE_MULTI_STAGE_REVIEW_ENABLED=true`, and through `IdeaReview` when `false`.
- **FR-017**: System MUST render a stage progress stepper on the idea detail page for ideas with `IdeaStageProgress` rows; V1 ideas MUST retain the existing review display.
- **FR-018**: System MUST hide reviewer identity and comments from non-admin users on in-progress stages until the decision stage is finalised.
- **FR-019**: `/admin/review-config` MUST be accessible only to SUPERADMIN; all other roles return 403 Forbidden.
- **FR-020**: The escalation queue on `/admin/review` MUST be visible to both ADMIN and SUPERADMIN roles. ADMIN may view escalated ideas read-only. Only SUPERADMIN may resolve an escalation by selecting `PASS` (advance to next stage) or `REJECT` (close the idea) via a resolution form — no stage re-claim is required for resolution.

### Key Entities

- **ReviewPipeline**: Represents a category's review workflow. Bound 1:1 to a category via a `categorySlug` string field (matches the slug constants in `constants/categories.ts` — no FK to a separate Category table). Has `isDefault` flag (default pipelines cannot be deleted). Contains an ordered list of stages.
- **ReviewPipelineStage**: One step within a pipeline. Has a name (≤ 60 chars), optional description, 1-based `order`, and an `isDecisionStage` boolean. Exactly one per pipeline must have `isDecisionStage=true`.
- **IdeaStageProgress**: Tracks a single idea's progress through one stage. Created for all stages atomically when Stage 1 is claimed. Holds reviewer identity, outcome (`PASS`, `ESCALATE`, `ACCEPTED`, `REJECTED`, or null), comment, and timestamps. Composite unique constraint on `(ideaId, stageId)`.
- **StageOutcome** (enum): `PASS`, `ESCALATE`, `ACCEPTED`, `REJECTED`.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A SUPERADMIN can create and save a custom multi-stage pipeline for any category within 2 minutes, with changes taking effect for all new submissions immediately.
- **SC-002**: An idea in a 3-stage pipeline is fully resolved (all stages completed) without any manual database intervention — the system auto-advances between stages on `PASS`.
- **SC-003**: When `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false`, zero `IdeaStageProgress` rows exist after any number of review starts — V1 behaviour is completely preserved with no leakage.
- **SC-004**: Stage claim atomicity: no partially-created `IdeaStageProgress` sets exist in the database under any failure condition.
- **SC-005**: Submitters can identify how many stages remain in their idea's review at a glance without contacting an admin.
- **SC-006**: All server-side validation and guard errors return appropriate HTTP status codes (400, 403, 409, 422) with human-readable messages — never an unhandled 500.
- **SC-007**: Server Actions for claim, complete, and pipeline CRUD achieve ≥ 80% line coverage in unit/integration tests.

---

## Assumptions

- The default 2-stage pipeline is seeded during Phase 5 deployment; it has `isDefault=true` and cannot be deleted.
- Any `ADMIN` or `SUPERADMIN` can claim and complete any stage in V2.0 (per-stage assignment deferred to V3.0).
- `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false` in production until QA sign-off.
- When an `ESCALATE` is resolved by SUPERADMIN, they select `PASS` (advance to next stage) or `REJECT` (close the idea) via a resolution form — no stage re-claim is required. No automated re-queue in V2.0.
- `IdeaStageProgress` rows are created at Stage 1 claim time using the category's currently active pipeline. Ideas that are `SUBMITTED` but not yet claimed always receive the pipeline version current at the moment of first claim.
- Stage reorder changes in the pipeline config UI are batched locally and only persisted to the server when the user clicks "Save Pipeline" — no per-click server calls.
- The same admin may claim and complete multiple stages on the same idea in V2.0.

---

## Out of Scope

- Per-stage role assignment (specific admins for specific stages) — V3.0
- Pipeline versioning beyond the implicit snapshot via `IdeaStageProgress` rows
- Physical removal of `IdeaReview` model — V3.0
- Email/in-app notifications on stage transition — V3.0
- Pipeline analytics (avg time per stage, bottleneck detection) — V3.0
- Drag-to-reorder in the config UI — V3.0 (up/down arrows used in V2.0)
