# Tasks: Smart Submission Forms

**Input**: Design documents from `specs/001-smart-forms/`
**Branch**: `001-smart-forms`
**Generated**: 2026-02-25

**Source documents**: plan.md · spec.md · research.md · data-model.md · contracts/server-actions.md · quickstart.md

---

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]** — parallelisable: works on a different file with no dependency on another incomplete task
- **[US1/US2/US3]** — which user story this task belongs to

---

## Phase 1: Setup

**Purpose**: Shared type and environment infrastructure; no story can reference `FieldDefinition` until these exist.

- [x] T001 [P] Create `FieldDefinition` interface and `DynamicFields` type in `innovatepam-portal/types/field-template.ts`
- [x] T002 [P] Add `FEATURE_SMART_FORMS_ENABLED` env var declaration (string → boolean) to `innovatepam-portal/lib/env.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB schema, migration, seed data, and Zod validation helper — these MUST be complete before ANY user story code can run end-to-end.

**⚠️ CRITICAL**: No user story implementation can be exercised against the database until this phase is complete.

- [x] T003 Create `CATEGORY_FIELD_TEMPLATES` constant (all 5 slugs → `FieldDefinition[]`) in `innovatepam-portal/constants/field-templates.ts` (depends on T001)
- [x] T004 [P] Add `CategoryFieldTemplate` model and `dynamicFields Json?` column to `Idea` model in `innovatepam-portal/prisma/schema.prisma` (depends on T001)
- [x] T005 Run `pnpm prisma migrate dev --name smart_forms` and `pnpm prisma generate` inside `innovatepam-portal/` (depends on T004)
- [x] T006 Extend seed script with idempotent `categoryFieldTemplate.upsert` loop for all 5 templates in `innovatepam-portal/prisma/seed.ts` (depends on T003, T005)
- [x] T007 Add `buildDynamicFieldsSchema(fields: FieldDefinition[])` helper to `innovatepam-portal/lib/validations/idea.ts` (depends on T001, T003)

**Checkpoint**: Run `pnpm prisma:seed` and confirm 5 rows in `CategoryFieldTemplate` — foundation is ready.

---

## Phase 3: User Story 1 — Submitter Sees Category-Specific Fields (Priority: P1) 🎯 MVP

**Goal**: A submitter selects a category and synchronously sees the relevant dynamic fields; required fields are validated on submission; submitted values are persisted and included in the audit log.

**Independent Test**: Select "Cost Reduction" on the submission form → 2 dynamic fields appear instantly; leave a required field blank → inline error; fill both and submit → idea row in DB has correct `dynamicFields` JSON.

- [x] T008 [P] [US1] Create `DynamicFieldSection` client component (renders `text`, `textarea`, `number` as `<input type="text" inputMode="numeric">`, `select` inputs; `readOnly` mode; `initialValues` prop for draft resume per EPIC-V2-03 contract; WCAG 2.1 AA ARIA attributes) in `innovatepam-portal/components/ideas/dynamic-field-section.tsx` (depends on T001)
- [x] T009 [US1] Extend `createIdeaAction` to parse, validate (via `buildDynamicFieldsSchema`), strip unknown keys, persist `dynamicFields`, and include values in `IDEA_CREATED` audit log metadata in `innovatepam-portal/lib/actions/create-idea.ts` (depends on T005, T007)
- [x] T010 [US1] Update `IdeaForm` to accept `templates` prop, render `<DynamicFieldSection>` below the category selector, and reset only `dynamicFields` state on category change in `innovatepam-portal/components/ideas/idea-form.tsx` (depends on T008)
- [x] T011 [US1] Update new idea RSC page to fetch all 5 `CategoryFieldTemplate` rows when flag on and pass as `templates` prop to `IdeaForm` in `innovatepam-portal/app/(main)/ideas/new/page.tsx` (depends on T006, T010)
- [x] T012 [P] [US1] Write unit tests for `DynamicFieldSection` (field-type rendering, ARIA attributes, error display, reset on prop change) in `innovatepam-portal/tests/unit/dynamic-field-section.test.tsx` (depends on T008)
- [x] T013 [P] [US1] Write integration tests for the `createIdeaAction` dynamic path (required field blank → error; valid payload → correct `dynamicFields` stored; unknown keys stripped; flag-off → `dynamicFields` null) in `innovatepam-portal/tests/integration/create-idea-dynamic.test.ts` (depends on T009)

**Checkpoint**: User Story 1 is independently functional — submitters can complete a dynamic idea submission end-to-end.

---

## Phase 4: User Story 2 — Admin Reviews Structured Dynamic Fields (Priority: P2)

**Goal**: An admin on the review panel sees submitted dynamic fields as a read-only "Additional Details" section; V1 ideas without dynamic fields render cleanly with no section present.

**Independent Test**: Seed a test idea with `dynamicFields = { current_annual_cost_usd: 50000, estimated_savings_pct: 20 }`, navigate to `/admin/review/[id]` → "Additional Details" section shows both fields with correct labels; navigate to a V1 idea → no section present.

- [x] T014 [US2] Extend admin review panel to render `<DynamicFieldSection readOnly>` when idea has `dynamicFields` and flag is on in `innovatepam-portal/components/admin/decision-card.tsx` (depends on T008, T005)

**Checkpoint**: User Stories 1 and 2 are both independently functional.

---

## Phase 5: User Story 3 — Submitter Views Their Idea's Dynamic Fields (Priority: P3)

**Goal**: A submitter viewing their submitted idea on the idea detail page sees the structured dynamic field values they entered; V1 ideas render cleanly.

**Independent Test**: Submit an idea with dynamic fields (or seed one), navigate to `/ideas/[id]` → "Additional Details" section displays submitted values with correct labels; navigate to a V1 idea → no section present, no console errors.

- [x] T015 [US3] Extend idea detail page to render `<DynamicFieldSection readOnly>` when idea has `dynamicFields` and flag is on in `innovatepam-portal/components/ideas/idea-detail.tsx` (depends on T008, T005)

**Checkpoint**: All three user stories are independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T016 [P] Write Playwright E2E test suite covering: flag-on submission with required field validation, flag-off V1 form snapshot assertion (SC-005), admin review panel dynamic fields, and idea detail page display in `innovatepam-portal/tests/e2e/smart-forms.spec.ts`
- [x] T017 [P] Run TypeScript compilation check — `pnpm tsc --noEmit` in `innovatepam-portal/` — resolve any type errors across new and modified files
- [x] T018 Verify Vitest line coverage ≥ 80% on `lib/actions/create-idea.ts` — `pnpm test --coverage` in `innovatepam-portal/` (depends on T012, T013)
- [x] T019 Run quickstart.md end-to-end validation checklist — confirm seed count = 5, spot-check that the stored field definitions for all 5 templates match the field table in PRD V2.0 §5.2 (SC-001), V1 idea renders cleanly, flag-off form matches V1

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately; T001 and T002 run in parallel.
- **Phase 2 (Foundational)**: Depends on Phase 1. T003 and T004 can start in parallel after T001. T005 after T004. T006 after T003 + T005. T007 after T001 + T003. **Blocks all user story work.**
- **Phase 3 (US1)**: Depends on Phase 2 completion. T008 and T009 start in parallel; T010 after T008; T011 after T006 + T010; T012 and T013 in parallel with their implementation tasks.
- **Phase 4 (US2)**: Depends on Phase 2 + T008. Can run in parallel with Phase 3 after T008.
- **Phase 5 (US3)**: Depends on Phase 2 + T008. Can run in parallel with Phase 3/4 after T008.
- **Phase 6 (Polish)**: Depends on all prior phases.

### User Story Dependencies

| Story    | Can start after  | Blocks  |
| -------- | ---------------- | ------- |
| US1 (P1) | Phase 2 complete | Nothing |
| US2 (P2) | Phase 2 + T008   | Nothing |
| US3 (P3) | Phase 2 + T008   | Nothing |

### Parallel Opportunities Per Story

**Phase 2 (Foundational)**:

```
T003 (constants)  ──┐
T004 (schema)     ──┤─→ T005 (migrate) ──→ T006 (seed) ──→ done
T002 (env)        ──┘
T007 (zod helper) starts after T001 + T003
```

**Phase 3 (US1) — after Phase 2 complete**:

```
T008 (DynamicFieldSection) ──┬──→ T012 (unit test) [parallel]
T009 (server action)        ──┼──→ T013 (integration test) [parallel]
                              └──→ T010 (idea-form) ──→ T011 (RSC page)
```

**Phases 4 + 5 — after T008 complete**:

```
T014 (admin panel)  [parallel with US1 work if different developer]
T015 (detail page)  [parallel with T014 and US1 work]
```

---

## Summary

| Phase            | Tasks     | Parallelisable | Stories Covered |
| ---------------- | --------- | -------------- | --------------- |
| 1 — Setup        | T001–T002 | 2 of 2         | —               |
| 2 — Foundational | T003–T007 | 3 of 5         | —               |
| 3 — US1 (P1) MVP | T008–T013 | 4 of 6         | US1             |
| 4 — US2 (P2)     | T014      | 0 of 1         | US2             |
| 5 — US3 (P3)     | T015      | 0 of 1         | US3             |
| 6 — Polish       | T016–T019 | 2 of 4         | All             |
| **Total**        | **19**    | **11 of 19**   |                 |

**MVP scope**: Complete Phases 1–3 (T001–T013). Delivers US1 end-to-end: dynamic form fields on submission, server-side validation, persistence, audit log. US2 and US3 (read paths) are additive and can follow in the same sprint.
