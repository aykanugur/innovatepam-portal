# Tasks: Multi-Stage Review

**Feature**: EPIC-V2-04 — Multi-Stage Review Pipeline
**Branch**: `001-multi-stage-review`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)
**Total Tasks**: 36 | **Parallel Opportunities**: 14

---

## Phase 1 — Setup

> Project initialization: schema, migration infrastructure, feature flag, shared Zod schemas, seed.

- [x] T001 Add `StageOutcome` enum and 4 new `AuditAction` values to `innovatepam-portal/prisma/schema.prisma`
- [x] T002 Add `ReviewPipeline`, `ReviewPipelineStage`, `IdeaStageProgress` models to `innovatepam-portal/prisma/schema.prisma`
- [x] T003 Add `stageProgress IdeaStageProgress[]` relation to `Idea` model and soft-deprecation comment to `IdeaReview` in `innovatepam-portal/prisma/schema.prisma`
- [x] T004 Run `npx prisma migrate dev --name add-multi-stage-review` and commit migration files in `innovatepam-portal/prisma/migrations/`
- [x] T005 Add `FEATURE_MULTI_STAGE_REVIEW_ENABLED` as `z.string().default('false')` to `innovatepam-portal/lib/env.ts`
- [x] T006 Create `innovatepam-portal/lib/validations/pipeline.ts` with `ClaimStageSchema`, `CompleteStageSchema`, `ResolveEscalationSchema`, `CreatePipelineSchema`, `UpdatePipelineSchema`, `DeletePipelineSchema`
- [x] T007 Update `innovatepam-portal/prisma/seed.ts` to upsert 5 default `ReviewPipeline` rows (one per category slug) each with 2 stages (`isDecisionStage=false` then `isDecisionStage=true`), all `isDefault=true`

---

## Phase 2 — Foundational

> Blocks all user stories. Must be complete before any US phase begins.

- [x] T008 [P] Add V2 trigger semantics comments to `innovatepam-portal/lib/state-machine/idea-status.ts` (no new states; document that `START_REVIEW` routes via `IdeaStageProgress` when flag is enabled)
- [x] T009 [P] Create `innovatepam-portal/lib/actions/claim-stage.ts` file scaffold with `'use server'`, imports, feature-flag guard, and auth session check — no business logic yet

---

## Phase 3 — User Story 6: Feature Flag Preserves V1 Behaviour (P1)

> **Story goal**: When `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false`, all review activity routes through V1 `IdeaReview` path — zero `IdeaStageProgress` rows created.
>
> **Independent test**: Set flag to `false`, start a review as ADMIN, assert `IdeaReview` record exists and `IdeaStageProgress.count === 0`.

- [x] T010 [US6] Implement feature-flag branching in the existing V1 review-start flow (locate the Server Action or handler that creates `IdeaReview` and add the `FEATURE_MULTI_STAGE_REVIEW_ENABLED` check to route to V2 path when `true`, preserving V1 path when `false`)
- [x] T011 [US6] Verify `/admin/review-config` is accessible and pipelines can be configured regardless of flag state — update auth guard in `innovatepam-portal/app/admin/review-config/page.tsx` once created (flag-independence requirement from FR-016 / spec US6 AC-2)
- [x] T012 [P] [US6] Write integration test `innovatepam-portal/tests/unit/actions/claim-stage.test.ts` — flag=false case: asserts `IdeaReview` row created, `IdeaStageProgress` count is 0

---

## Phase 4 — User Story 1: SUPERADMIN Configures a Pipeline (P1)

> **Story goal**: SUPERADMIN visits `/admin/review-config`, builds/edits a multi-stage pipeline per category, and saves. Changes take effect for all new idea claims.
>
> **Independent test**: Log in as SUPERADMIN, create a 3-stage pipeline with one decision stage, save, and confirm persistence. Log in as ADMIN and confirm 403 on `/admin/review-config`.

- [x] T013 [P] [US1] Implement `createPipeline()` Server Action in `innovatepam-portal/lib/actions/pipeline-crud.ts` — SUPERADMIN auth, `categorySlug` uniqueness guard, stage array validation (contiguous order, exactly 1 decision stage), `createMany` for stages, `PIPELINE_CREATED` audit log
- [x] T014 [P] [US1] Implement `updatePipeline()` Server Action in `innovatepam-portal/lib/actions/pipeline-crud.ts` — full-array replace in `$transaction`, in-flight stage guard (409), re-sequence order, `PIPELINE_UPDATED` audit log
- [x] T015 [P] [US1] Implement `deletePipeline()` Server Action in `innovatepam-portal/lib/actions/pipeline-crud.ts` — `isDefault` guard (403), in-flight progress guard (409), Cascade delete via Prisma
- [x] T016 [P] [US1] Create `innovatepam-portal/components/pipeline/stage-row.tsx` — Client Component, single stage row with name input, description input, decision-stage checkbox, up/down reorder buttons (local state only, no server call per click)
- [x] T017 [US1] Create `innovatepam-portal/components/pipeline/pipeline-config-form.tsx` — Client Component, renders list of `StageRow` components, local drag-free reorder (up/down), "Add Stage" button, "Save Pipeline" button that calls `createPipeline` or `updatePipeline`, inline error display
- [x] T018 [US1] Create `innovatepam-portal/app/admin/review-config/page.tsx` — Server Component, SUPERADMIN-only auth guard (redirect 403 for non-SUPERADMIN), fetches all 5 pipelines with stages, renders `PipelineConfigForm` per category
- [x] T019 [P] [US1] Write unit tests `innovatepam-portal/tests/unit/actions/pipeline-crud.test.ts` — covers: create success, duplicate slug 409, 0 decision stages error, 2 decision stages error, delete default 403, delete in-flight 409, update removes in-flight stage 409

---

## Phase 5 — User Story 2: Admin Claims Stage 1 and Completes with PASS (P1)

> **Story goal**: An ADMIN clicks "Start Review" on a `SUBMITTED` idea, claims Stage 1, enters a comment, selects PASS, and the system auto-advances to Stage 2.
>
> **Independent test**: Submit an idea in any category, claim Stage 1 as ADMIN, verify all `IdeaStageProgress` rows created, submit PASS with 10+ char comment, verify Stage 2 `startedAt` is set.

- [x] T020 [US2] Implement `claimStage(ideaId)` business logic in `innovatepam-portal/lib/actions/claim-stage.ts` — all precondition guards per contract, `$transaction` creating all stage rows, Stage 1 activation, `Idea.status → UNDER_REVIEW`, `STAGE_STARTED` + `IDEA_REVIEW_STARTED` audit entries
- [x] T021 [P] [US2] Implement `completeStage()` PASS path in `innovatepam-portal/lib/actions/complete-stage.ts` — PASS outcome: sets `completedAt`, next-stage `startedAt`, `STAGE_COMPLETED` + `STAGE_STARTED` audit entries; include `reviewerId` identity guard (403 if not claimer)
- [x] T022 [P] [US2] Create `innovatepam-portal/components/admin/stage-completion-panel.tsx` — Client Component, outcome radio group (PASS / ESCALATE for non-decision; ACCEPTED / REJECTED for decision stage), comment textarea (min 10 / max 2000 client validation), submit button, error state display
- [x] T023 [US2] Create `innovatepam-portal/app/admin/review/[id]/stage/[stageId]/page.tsx` — Server Component, fetches `IdeaStageProgress` + `IdeaStageProgress.stage`, renders `StageCompletionPanel`, passes correct outcome options based on `isDecisionStage`
- [x] T024 [US2] Modify `innovatepam-portal/app/admin/review/page.tsx` — add "Start Review" button in the pending queue row that calls `claimStage(ideaId)` (visible only when `FEATURE_MULTI_STAGE_REVIEW_ENABLED=true` and idea status is `SUBMITTED`)
- [x] T025 [P] [US2] Write unit tests `innovatepam-portal/tests/unit/actions/claim-stage.test.ts` — flag=true: already-claimed 409, no pipeline 409, invalid status 409, success creates N rows atomically, non-ADMIN 403

---

## Phase 6 — User Story 4: Admin Completes the Decision Stage (P1)

> **Story goal**: On the final decision stage, admin selects ACCEPTED/REJECTED; `Idea.status` updates and both `STAGE_COMPLETED` and `IDEA_REVIEWED` audit entries are written.
>
> **Independent test**: Complete all prior non-decision stages with PASS, then on the decision stage select ACCEPTED with ≥ 10 char comment; verify `Idea.status === 'ACCEPTED'` and 2 audit entries written.

- [x] T026 [US4] Implement `completeStage()` ACCEPTED and REJECTED paths in `innovatepam-portal/lib/actions/complete-stage.ts` — sets `Idea.status`, writes `IDEA_REVIEWED` audit, validates `isDecisionStage=true` guard (400 if `PASS`/`ESCALATE` sent to decision stage)
- [x] T027 [US4] Add server-side outcome-vs-stage-type cross-validation to `completeStage()` in `innovatepam-portal/lib/actions/complete-stage.ts` — `PASS`/`ESCALATE` on decision stage → 400; `ACCEPTED`/`REJECTED` on non-decision stage → 400
- [x] T028 [P] [US4] Write unit tests `innovatepam-portal/tests/unit/actions/complete-stage.test.ts` — PASS success + next stage activated, PASS on decision stage 400, ACCEPTED on decision stage success, REJECTED success, non-claimer 403, already-completed 409, comment too short 422

---

## Phase 7 — User Story 3: Admin Escalates to SUPERADMIN (P2)

> **Story goal**: Admin selects ESCALATE on a non-decision stage; idea appears in the escalation queue; no next stage is activated. SUPERADMIN resolves with PASS (advance) or REJECT (close idea).
>
> **Independent test**: Select ESCALATE on a non-decision stage with ≥ 10 char comment; confirm `IdeaStageProgress.outcome = 'ESCALATE'`, next stage `startedAt` is still null, and idea appears in escalation queue.

- [x] T029 [US3] Implement `completeStage()` ESCALATE path in `innovatepam-portal/lib/actions/complete-stage.ts` — sets outcome, `completedAt`, writes `STAGE_COMPLETED`, does NOT activate next stage
- [x] T030 [US3] Implement `resolveEscalation(stageProgressId, action, comment)` in `innovatepam-portal/lib/actions/resolve-escalation.ts` — SUPERADMIN-only guard, `NOT_ESCALATED` guard, PASS path (next stage activation or idea ACCEPTED if last stage), REJECT path (`Idea.status = REJECTED`), audit entries per contract
- [x] T031 [P] [US3] Create `innovatepam-portal/components/admin/escalation-queue.tsx` — Server Component (read-only list of `IdeaStageProgress` where `outcome = 'ESCALATE'`), shows idea title / category / escalated-at / escalating admin name; SUPERADMIN gets "Resolve" link, ADMIN sees read-only badge
- [x] T032 [P] [US3] Create `innovatepam-portal/components/admin/resolve-escalation-form.tsx` — Client Component, PASS/REJECT radio, comment textarea, calls `resolveEscalation()`, SUPERADMIN-only render condition
- [x] T033 [US3] Modify `innovatepam-portal/app/admin/review/page.tsx` — add "Escalated" tab above pending queue, renders `EscalationQueue` component, visible to both ADMIN and SUPERADMIN (FR-020)
- [x] T034 [P] [US3] Write unit tests `innovatepam-portal/tests/unit/actions/resolve-escalation.test.ts` — SUPERADMIN PASS success, PASS on last stage → ACCEPTED, REJECT success, non-SUPERADMIN 403, not-escalated 409, already-resolved idea 409

---

## Phase 8 — User Story 5: Submitter Sees Stage Progress Stepper (P2)

> **Story goal**: Submitter visits `/ideas/[id]` and sees a horizontal stepper showing stage names and status badges. Reviewer identity and comments are hidden until the decision stage is finalised.
>
> **Independent test**: As a submitter, view an idea in Stage 2 — stepper shows Stage 1 ✓ and Stage 2 = In Progress; no reviewer name or comment visible. As ADMIN viewing the same idea, reviewer name + outcome + comment are visible on Stage 1.

- [x] T035 [US5] Create `innovatepam-portal/components/ideas/stage-progress-stepper.tsx` — Server Component, accepts `stageProgress[]` + viewer role, renders stage name + status badge per stage; redacts reviewer name and comment from non-admin viewers on incomplete stages (FR-018); V1 fallback: renders nothing when no `IdeaStageProgress` rows exist
- [x] T036 [US5] Modify `innovatepam-portal/app/(main)/ideas/[id]/page.tsx` and `innovatepam-portal/app/admin/review/[id]/page.tsx` — add `StageProgressStepper` below idea header when `IdeaStageProgress` rows exist; fetch stage rows with stage + pipeline data; V1 ideas remain unchanged

---

## Final Phase — Polish & Cross-Cutting Concerns

- [x] T037 [P] Write E2E test `innovatepam-portal/tests/e2e/multi-stage-review.spec.ts` — happy path: submit idea → claim Stage 1 → PASS → decision stage → ACCEPTED → verify `Idea.status`; escalation path: ESCALATE → SUPERADMIN resolves REJECT
- [x] T038 [P] Verify `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false` in `.env.local` (default for production) and add to `.env.example` documentation comment
- [x] T039 Run `npx tsc --noEmit` and fix all TypeScript errors introduced by new models and actions in `innovatepam-portal/`
- [x] T040 Run `npm run test:unit` and ensure ≥ 80% line coverage on all 4 new action files (SC-007 requirement)

---

## Dependencies (Story Completion Order)

```
Phase 1 (Setup)
  └─→ Phase 2 (Foundational)
        ├─→ Phase 3 (US6 — Feature Flag)  ← must pass before any review flow work
        │     └─→ Phase 5 (US2 — Claim + PASS)
        │               └─→ Phase 6 (US4 — Decision Stage)
        │                         └─→ Phase 7 (US3 — Escalation)
        │                                       └─→ Phase 8 (US5 — Stepper)
        └─→ Phase 4 (US1 — Pipeline Config)  ← parallel with US6 after Foundational
```

**US1 (Pipeline Config) is independent of US2–US5** and can be implemented in parallel after Phase 2.
**US5 (Stepper) depends only on IdeaStageProgress data existing**, which is created in US2.

---

## Parallel Execution Examples

### After Phase 1+2 complete — run these in parallel:

```bash
# Terminal A — Pipeline Config (US1)
implement T013 createPipeline()
implement T014 updatePipeline()
implement T015 deletePipeline()
build T016 stage-row.tsx
build T017 pipeline-config-form.tsx
build T018 review-config/page.tsx

# Terminal B — Feature Flag + Core Flow (US6 → US2)
implement T010 feature-flag branching
implement T020 claimStage() business logic
implement T021 completeStage() PASS path
build T022 stage-completion-panel.tsx
build T023 stage/[stageId]/page.tsx
```

### After US2 completes — run these in parallel:

```bash
# Terminal A — Decision Stage (US4)
implement T026 completeStage() ACCEPTED/REJECTED
implement T027 outcome-vs-stage-type validation

# Terminal B — Escalation UI (US3, partial)
build T031 escalation-queue.tsx
build T032 resolve-escalation-form.tsx
```

---

## Implementation Strategy

**MVP scope** (deliver value in one PR): Phases 1–6 = US6 + US1 + US2 + US4.
This gives a fully functional end-to-end multi-stage review (flag-gated, pipeline config, claim, PASS, decision) without escalation or submitter stepper.

**Increment 2**: Phase 7 (US3 — Escalation) — adds the ESCALATE/SUPERADMIN resolve path.

**Increment 3**: Phase 8 (US5 — Stepper) — adds submitter-facing visibility.

All increments are independently deployable behind `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false` in production.
