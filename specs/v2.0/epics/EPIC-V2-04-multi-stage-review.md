# Epic: Multi-Stage Review

**Epic ID**: EPIC-V2-04
**Owner**: Aykan Uğur — Admin
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Target Release**: V2.0 Phase 5 (~1 hr)
**PRD Reference**: [specs/v2.0/prd-v2.0.md](../prd-v2.0.md) — Section 8

---

## 1. Summary

Replace V1's fixed two-step review with a configurable multi-stage pipeline per category. SUPERADMIN creates pipelines at `/admin/review-config`, each composed of ordered stages. Non-decision stages produce `PASS` or `ESCALATE` outcomes; exactly one decision stage per pipeline records `ACCEPTED` or `REJECTED`. A seeded default 2-stage pipeline preserves V1 behaviour for categories with no custom config. The `IdeaReview` model is soft-deprecated; new submissions route through `IdeaStageProgress`. A stage progress indicator is visible to all users on the idea detail page. Pipeline configuration is locked against destructive edits while ideas are actively being reviewed in it.

---

## 2. Business Context

### 2.1 Strategic Alignment

- **Company Goal**: Deliver a review system that scales to the actual complexity of different idea types in V2.0.
- **Product Vision Fit**: V1's identical two-step workflow is inadequate for high-stakes decisions (budget approval, market launch) while being excessive overhead for straightforward process suggestions. Configurable pipelines align review effort with idea risk and impact.

### 2.2 Business Value

| Value Driver     | Description                                                                                                                | Estimated Impact                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Review precision | Pipelines match scrutiny to category — "New Product/Service" gets 3 stages; "Process Improvement" uses the 2-stage default | Reduces over- and under-review      |
| Accountability   | Stage-by-stage audit trail (who reviewed, what outcome, when)                                                              | Full traceability for each decision |
| Flexibility      | SUPERADMIN can add categories or adjust pipeline depth without a code deployment                                           | Self-service pipeline management    |

### 2.3 Cost of Delay

Without multi-stage review, high-stakes idea categories (Product, Technical Innovation) cannot credibly enforce a multi-reviewer approval chain. Ideas requiring Finance or Engineering sign-off will continue to be handled via ad-hoc Slack threads, undermining the platform's authority as the system of record.

---

## 3. Scope

### 3.1 In Scope

- `ReviewPipeline` model — bound 1:1 to a category; `isDefault` flag for built-in pipeline
- `ReviewPipelineStage` model — ordered stages; `isDecisionStage` flag; name max 60 chars; optional description
- `StageOutcome` enum: `PASS`, `ESCALATE`, `ACCEPTED`, `REJECTED`
- `IdeaStageProgress` model — tracks each stage's claim, outcome, comment, timestamps per idea
- `stageProgress` relation added to `Idea` model
- New `AuditAction` values: `STAGE_STARTED`, `STAGE_COMPLETED`, `PIPELINE_CREATED`, `PIPELINE_UPDATED`
- Default 2-stage pipeline seeded for all 5 categories (replicates V1 behaviour exactly)
- `IdeaReview` model soft-deprecated: no new records created post-Phase 5; existing in-flight V1 reviews continue untouched
- Pipeline configuration page at `/admin/review-config` (SUPERADMIN only): list categories with current pipeline, create/edit pipelines and stages
- Pipeline locking: stages cannot be deleted while any idea is actively in that stage; only name/description updates allowed
- Admin review workflow updated: admins claim and complete stages from `/admin/review/[id]/stage/[stageId]`; `PASS` auto-advances to next stage; `ESCALATE` flags for SUPERADMIN
- Stage progress indicator on `/ideas/[id]`: stepper/breadcrumb visible to all users; pending stage content hidden from non-admins
- Feature flag: `FEATURE_MULTI_STAGE_REVIEW_ENABLED` (default `false`)

### 3.2 Out of Scope

- Per-stage role assignment (only specific ADMIN emails can complete Stage 2) — deferred to V3.0
- Pipeline versioning / snapshots (ideas always use the pipeline at submission time — enforced by `IdeaStageProgress` records created at submission)
- Physical removal of `IdeaReview` model — scheduled for V3.0
- Email notifications on stage transition — deferred to V3.0
- Pipeline analytics (avg. time per stage, bottleneck detection) — deferred to V3.0

### 3.3 Assumptions

- The default 2-stage pipeline is seeded during the Phase 5 deployment migration; it has `isDefault = true` and cannot be deleted
- When `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false`, the V1 `IdeaReview` workflow remains active; the flag acts as a full routing switch
- Any `ADMIN` or `SUPERADMIN` can claim and complete any stage in V2.0 — no per-stage assignment
- A "pipeline snapshot" is implicitly created at submission time by generating all `IdeaStageProgress` rows for the idea at the moment it transitions from `SUBMITTED → UNDER_REVIEW`
- `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false` in production until QA sign-off

---

## 4. User Personas

| Persona            | Role          | Primary Need                                                                                                    |
| ------------------ | ------------- | --------------------------------------------------------------------------------------------------------------- |
| Deniz (Admin)      | Innovation PM | Claim and complete review stages without being blocked by absent colleagues; see clear stage status at a glance |
| Aykan (Superadmin) | Portal owner  | Configure pipelines per category once; lock config while reviews are in flight; escalate flagged ideas          |
| Elif (Submitter)   | EPAM employee | See where her idea is in the review pipeline — how many stages remain — without needing to contact an admin     |

---

## 5. Feature Breakdown

### Feature 1: DB Models, Enum & Migration — Must Have

**Description**: Create `ReviewPipeline`, `ReviewPipelineStage`, `IdeaStageProgress` models; add `StageOutcome` enum; add `stageProgress` relation on `Idea`; add 4 new `AuditAction` values; run migration; seed the default 2-stage pipeline.

**User Stories**:

- [ ] As a developer, `prisma migrate dev` applies all new models and the `StageOutcome` enum without errors.
- [ ] As a developer, running the seed creates a default 2-stage pipeline (`isDefault=true`) for each of the 5 categories.
- [ ] As the system, existing `IdeaReview` rows and all V1 idea records are unaffected by the migration.

**Acceptance Criteria**:

1. `prisma migrate dev` applies cleanly; the following tables exist: `ReviewPipeline`, `ReviewPipelineStage`, `IdeaStageProgress`
2. `StageOutcome` enum contains exactly: `PASS`, `ESCALATE`, `ACCEPTED`, `REJECTED`
3. `AuditAction` enum contains the 4 new values: `STAGE_STARTED`, `STAGE_COMPLETED`, `PIPELINE_CREATED`, `PIPELINE_UPDATED`
4. `Idea` model has a `stageProgress IdeaStageProgress[]` relation
5. `IdeaStageProgress` has a composite unique constraint on `(ideaId, stageId)`
6. `ReviewPipelineStage` has a compound index on `(pipelineId, order)`
7. After seed, 5 default pipelines exist — one per category — each with `isDefault=true` and exactly 2 stages: Stage 1 `isDecisionStage=false`, Stage 2 `isDecisionStage=true`
8. All existing `Idea` and `IdeaReview` rows are unmodified

**Estimated Effort**: S (~12 min)

---

### Feature 2: Pipeline Configuration Page — Must Have

**Description**: A new page at `/admin/review-config` accessible only to SUPERADMIN. Lists all 5 categories with their currently bound pipeline name (or "Default (2-stage)"). Allows creating a new custom pipeline for a category, editing stage names/descriptions, adding/removing stages (subject to locking rules), and deleting a custom pipeline (reverting category to default).

**User Stories**:

- [ ] US-V2-04-a: As SUPERADMIN, I visit `/admin/review-config` and see all 5 categories listed with their current pipeline or "Default".
- [ ] US-V2-04-b: As SUPERADMIN, I click "Configure" next to a category and can add stages, name them, set one as the decision stage, and save the pipeline.
- [ ] US-V2-04-c: As SUPERADMIN, I try to save a pipeline with no decision stage and see: "Exactly one stage must be marked as the decision stage."
- [ ] US-V2-04-d: As SUPERADMIN, I try to save a pipeline with two decision stages and see: "Only one stage can be the decision stage."
- [ ] US-V2-04-e: As SUPERADMIN, I try to delete a stage that has active `IdeaStageProgress` records at that stage and see: "Cannot delete stage: it has active reviews in progress."
- [ ] US-V2-04-f: As SUPERADMIN, I try to delete the default pipeline and the delete button is absent — server also returns `403` if attempted via API.
- [ ] US-V2-04-g: As ADMIN (non-superadmin), I navigate to `/admin/review-config` and receive a `403 Forbidden` page.

**Acceptance Criteria**:

1. `/admin/review-config` is only accessible to `SUPERADMIN` — `ADMIN` and `SUBMITTER` sessions return `403`
2. Stage names are validated: required, max 60 chars; server returns `422` if violated
3. Exactly one `isDecisionStage=true` per pipeline — server enforces with `422` on zero or >1
4. Save creates `PIPELINE_CREATED` or `PIPELINE_UPDATED` audit log entries with `metadata: { category, stageCount }`
5. Deleting a stage with active in-progress `IdeaStageProgress` rows returns `409 Conflict`
6. Deleting a pipeline with `isDefault=true` returns `403 Forbidden`
7. Stage order is 1-based and contiguous — gaps are not permitted; server re-sequences on stage removal
8. Custom pipeline replaces default for new submissions immediately on save; in-flight ideas are unaffected

**Estimated Effort**: M (~18 min)

---

### Feature 3: Stage Progress Initialisation on Idea Submission — Must Have

**Description**: When an idea transitions from `SUBMITTED` to `UNDER_REVIEW` (i.e., the first admin claims Stage 1), the system creates `IdeaStageProgress` rows for every stage in the category's bound pipeline — snapshotting the pipeline at submission time. This ensures pipeline changes after submission do not affect in-flight ideas.

**User Stories**:

- [ ] US-V2-04-h: As the system, when an admin starts a review on a `SUBMITTED` idea (with `FEATURE_MULTI_STAGE_REVIEW_ENABLED=true`), `IdeaStageProgress` rows are created for all stages of the category's current pipeline.
- [ ] US-V2-04-i: As the system, the first stage's `reviewerId` is set to the claiming admin's `id` and `startedAt` is set to `now()`.

**Acceptance Criteria**:

1. Claiming Stage 1 creates one `IdeaStageProgress` row per stage in the pipeline — all with `outcome=null`, `startedAt=null`, `completedAt=null` — except Stage 1 which gets `reviewerId` and `startedAt` set
2. The number of rows equals the pipeline's stage count at the moment of claiming
3. `AuditAction.STAGE_STARTED` is written with `metadata: { stageId, stageName, order: 1 }`
4. If `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false`, the V1 `IdeaReview` record is created instead — no `IdeaStageProgress` rows are created
5. The `Idea.status` transitions from `SUBMITTED → UNDER_REVIEW` as in V1

**Estimated Effort**: S (~8 min)

---

### Feature 4: Stage Completion & Auto-Advance — Must Have

**Description**: A new admin review panel at `/admin/review/[id]/stage/[stageId]` allows the claiming admin to complete a stage. Non-decision stages: select `PASS` or `ESCALATE` + mandatory comment (min 10 chars). Decision stages: select `ACCEPTED` or `REJECTED` + mandatory comment. `PASS` auto-advances the idea to the next stage. `ESCALATE` flags the idea for SUPERADMIN and halts progression. Final decision updates `Idea.status` to `ACCEPTED` or `REJECTED`.

**User Stories**:

- [ ] US-V2-04-j: As an admin completing a non-decision stage with `PASS`, the current stage is marked complete and the next stage becomes active (next `IdeaStageProgress` row gets `startedAt` set to `now()`).
- [ ] US-V2-04-k: As an admin completing a non-decision stage with `ESCALATE`, the idea is flagged for SUPERADMIN attention; progression halts; the idea appears in a separate "Escalated" queue.
- [ ] US-V2-04-l: As an admin completing the decision stage with `ACCEPTED` or `REJECTED` + comment, `Idea.status` is updated and `AuditAction.STAGE_COMPLETED` + `AuditAction.IDEA_REVIEWED` are both logged.
- [ ] US-V2-04-m: As an admin trying to complete a stage without entering a comment, I see: "A comment is required (minimum 10 characters)."
- [ ] US-V2-04-n: As an admin trying to set `outcome=ACCEPTED` on a non-decision stage via API tampering, the server returns `400 Bad Request`: "ACCEPTED/REJECTED outcomes are only valid on the decision stage."

**Acceptance Criteria**:

1. `PASS` on a non-decision stage: current `IdeaStageProgress.outcome = PASS`, `completedAt = now()`; next stage's `startedAt = now()`
2. `ESCALATE` on a non-decision stage: current `IdeaStageProgress.outcome = ESCALATE`, `completedAt = now()`; no next stage is activated; idea appears in SUPERADMIN escalation queue
3. `ACCEPTED`/`REJECTED` on the decision stage: `IdeaStageProgress.outcome` set; `Idea.status` updated to `ACCEPTED`/`REJECTED`; `IdeaStageProgress.completedAt = now()`
4. Comment validation: min 10 chars, max 2,000 chars — server returns `422` on violation
5. Attempting `ACCEPTED`/`REJECTED` on `isDecisionStage=false` returns `400`
6. Attempting `PASS`/`ESCALATE` on `isDecisionStage=true` returns `400`
7. `STAGE_COMPLETED` and (on final decision) `IDEA_REVIEWED` audit entries are written
8. Only the admin who claimed the stage (`reviewerId`) can complete it — any other admin attempting to submit a completion returns `403`

**Estimated Effort**: M (~15 min)

---

### Feature 5: Stage Progress Indicator on Idea Detail Page — Must Have

**Description**: The idea detail page at `/ideas/[id]` renders a horizontal stepper/breadcrumb showing all pipeline stages, their completion status, and (for completed stages) the outcome label. Non-admin users see stage names and status only — no reviewer names or comments until the decision stage is finalised.

**User Stories**:

- [ ] US-V2-04-o: As a submitter viewing my idea, I see a stage progress indicator showing "Stage 1: Initial Review ✓ → Stage 2: Final Decision (In Progress)".
- [ ] US-V2-04-p: As a submitter, I cannot see the reviewer's name or comment on in-progress stages — only the stage name and status badge.
- [ ] US-V2-04-q: As an admin viewing an idea, I see reviewer names, outcomes, and comments for all completed stages.
- [ ] US-V2-04-r: As any user, the stage progress indicator is absent for V1 ideas (those with `IdeaReview` records and no `IdeaStageProgress` rows).

**Acceptance Criteria**:

1. Stepper renders all stages for the idea's pipeline with status badges: "Pending", "In Progress", "Pass", "Escalated", "Accepted", "Rejected"
2. SUBMITTER view: stage names + status badges only — reviewer identity and comments are hidden until the decision stage is finalised
3. ADMIN/SUPERADMIN view: all completed stage details visible (reviewer name, outcome, comment, completion timestamp)
4. For V1 ideas with no `IdeaStageProgress` rows, the stepper is absent — V1 review display is unchanged
5. Stepper is a server-rendered component; it does not require a client-side fetch

**Estimated Effort**: S (~7 min)

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)

| Dependency                                                                         | Type | Status   | Risk                                                                             |
| ---------------------------------------------------------------------------------- | ---- | -------- | -------------------------------------------------------------------------------- |
| EPIC-01 (Foundation) — Prisma, DB, seed infrastructure                             | V1   | Complete | None                                                                             |
| EPIC-04 (Evaluation Workflow) — existing `IdeaReview` model and admin review panel | V1   | Complete | None — V1 path preserved; V2 path runs alongside under flag                      |
| EPIC-V2-01 (Smart Forms)                                                           | V2.0 | Parallel | Low — no hard dependency; pipeline review panel is independent of dynamic fields |

### 6.2 Blocking (Downstream)

| Dependent Epic            | Impact if EPIC-V2-04 is Delayed                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| EPIC-V2-05 (Blind Review) | `blindReview` field is added to `ReviewPipeline` — this model must exist first                           |
| EPIC-V2-06 (Scoring)      | Score is recorded at the decision stage of `IdeaStageProgress` — stage completion logic must be in place |

---

## 7. UX / Design

- **`/admin/review-config` layout**: Card per category. Each card shows: category name, current pipeline name (or "Default (2-stage)" in muted text), stage count, and a "Configure" button. Clicking "Configure" opens an inline expanded form (accordion) — no separate page navigation.
- **Stage builder UI**: Ordered list of stage rows. Each row: drag handle (for reorder, deferred to V3.0 — use up/down arrows for V2.0) | stage name input | description input (collapsible) | "Decision Stage" radio | "Remove" button (disabled if stage has active reviews).
- **Stage progress stepper on detail page**: Horizontal stepper using shadcn/ui `Steps` or a custom `<ol>` with Tailwind; each step shows an icon (pending = grey circle, in-progress = blue spinner, pass = green check, escalate = amber warning, accepted = green badge, rejected = red badge) + stage name.
- **Escalated ideas queue**: New section on the existing `/admin/review` page, above the main pending queue. Header: "Escalated ⚠ ([count])". Rows show idea title, category, stage name where escalation occurred, and date.
- **Review panel at `/admin/review/[id]/stage/[stageId]`**: Mirrors the V1 review panel layout. Adds: stage name + order indicator ("Stage 2 of 3") at the top; outcome radio buttons (`PASS`/`ESCALATE` for non-decision, `Accept`/`Reject` for decision); mandatory comment textarea; "Submit Stage Review" button.

---

## 8. Technical Notes

- **Pipeline snapshot strategy**: `IdeaStageProgress` rows are created for all stages when Stage 1 is claimed. This is the snapshot — if the pipeline is edited after this point, the in-flight idea uses the already-created rows. No separate snapshot table is needed.
- **V1 / V2 routing**: The review start Server Action checks `FEATURE_MULTI_STAGE_REVIEW_ENABLED`. If `true`, creates `IdeaStageProgress` rows. If `false`, creates an `IdeaReview` row. Both paths update `Idea.status` to `UNDER_REVIEW`. The detail page checks `idea.stageProgress.length > 0` to decide which review display component to render.
- **Stage order re-sequencing**: When a stage is removed from a pipeline in the config UI, the remaining stages must be re-numbered (1-based, contiguous) before saving. Do this in the Server Action, not on the client, to avoid race conditions.
- **Escalation queue**: Implemented as a Prisma query: `IdeaStageProgress.findMany({ where: { outcome: 'ESCALATE' }, include: { idea: true, stage: true } })` scoped to the admin's role.
- **Decision stage validation** is enforced in two places: (1) Zod schema on the `completeStage` Server Action rejects `ACCEPTED`/`REJECTED` if `stage.isDecisionStage === false`; (2) DB does not enforce this — application layer only.
- **`IdeaReview` soft-deprecation**: Add a doc comment to the model in `schema.prisma`: `// DEPRECATED in V2.0: use IdeaStageProgress for new ideas. Scheduled for removal in V3.0.` No code that writes to `IdeaReview` should be added after this epic.

---

## 9. Milestones & Timeline

| Milestone        | Features Included | Target                         | Exit Criteria                                                                                                   |
| ---------------- | ----------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| M1 — DB & Seed   | Feature 1         | Phase 5 start                  | Migration applied; 5 default pipelines seeded; V1 data unaffected                                               |
| M2 — Config UI   | Feature 2         | Phase 5 early                  | SUPERADMIN can create, edit, delete custom pipelines; all server-side validations enforced                      |
| M3 — Review Flow | Features 3 & 4    | Phase 5 mid                    | Stage initialisation on claim, `PASS`/`ESCALATE`/`ACCEPTED`/`REJECTED` completion, auto-advance all working E2E |
| M4 — Visibility  | Feature 5         | Phase 5 complete (~1 hr total) | Stage progress stepper renders on detail page; correct role-based visibility; V1 ideas unaffected               |

---

## 10. Success Metrics

| Metric                       | Target                                                                                                |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| Default pipeline seeded      | 5 rows in `ReviewPipeline` with `isDefault=true` after deploy                                         |
| Pipeline validation enforced | Zero/two decision stages returns `422`                                                                |
| Stage deletion guard         | `409` returned when deleting a stage with active `IdeaStageProgress`                                  |
| V1 regression                | All existing `IdeaReview` records and review panel behaviour unchanged when flag is `false`           |
| Auto-advance integrity       | Completing Stage 1 with `PASS` activates Stage 2 with `startedAt` set                                 |
| Test coverage                | ≥ 80% line coverage on all Server Actions (claim, complete, config CRUD) and the V1/V2 routing switch |

---

## 11. Risks & Mitigations

| #   | Risk                                                                                                                                                | Likelihood | Impact | Mitigation                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Pipeline snapshot not created atomically — partial row creation leaves idea in an inconsistent state                                                | Med        | High   | Wrap `IdeaStageProgress` creation for all stages in a single Prisma `$transaction`. If any row fails, the entire claim is rolled back.                           |
| 2   | V1 and V2 review paths diverge silently — a bug in the feature flag routing sends new submissions down the V1 path with no `IdeaStageProgress` rows | Med        | High   | Write an integration test that explicitly enables the flag, submits an idea, and asserts `IdeaStageProgress.count > 0` after claiming Stage 1.                   |
| 3   | Stage re-ordering via up/down arrows in the config UI produces transient order conflicts (two stages at the same `order`)                           | Low        | Med    | Use a swap pattern server-side: temporarily set a placeholder order (e.g., 999), assign the target order, then resolve the placeholder — all in one transaction. |
| 4   | SUPERADMIN inadvertently deletes a custom pipeline while ideas are mid-review                                                                       | Low        | High   | Block pipeline deletion (not just stage deletion) if any `IdeaStageProgress` rows reference that pipeline and have `completedAt=null`. Return `409 Conflict`.    |

---

## 12. Open Questions

| #   | Question                                                                                                                                                                                                                                                                                         | Owner      | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------ |
| 1   | When an `ESCALATE` outcome is resolved by SUPERADMIN, what happens next — does the idea return to the escalated stage, advance to the next stage, or go back to Stage 1? PRD does not specify. (Recommendation: SUPERADMIN manually sets the next action: re-assign to current stage or advance) | Aykan Uğur | Open   |
| 2   | Can the same admin claim multiple stages on the same idea, or should an admin who completed Stage 1 be blocked from Stage 2? PRD says any admin can claim any stage in V2.0. (Recommendation: allow same admin across stages in V2.0; add restriction in V3.0 with per-stage assignment)         | Aykan Uğur | Open   |
| 3   | Should `ESCALATE` trigger an in-app notification or email to SUPERADMIN in V2.0? (Recommendation: no notification in V2.0 — SUPERADMIN checks the escalation queue manually; notifications deferred to V3.0)                                                                                     | Aykan Uğur | Open   |

---

## Appendix: Revision History

| Version | Date       | Author     | Changes                                                           |
| ------- | ---------- | ---------- | ----------------------------------------------------------------- |
| 0.1     | 2026-02-25 | Aykan Uğur | Initial draft — all sections complete based on PRD V2.0 Section 8 |
