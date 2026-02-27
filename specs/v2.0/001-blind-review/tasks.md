# Tasks: Blind Review for Idea Evaluation Pipelines

**Input**: Design documents from `specs/001-blind-review/`
**Prerequisites**: plan.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅ quickstart.md ✅

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[US1]**: US1 — Enable Blind Review toggle on a pipeline
- **[US2]**: US2 — Author identity masked during active review
- **[US3]**: US3 — Audit logs always show real author identity
- **[US4]**: US4 — Schema and data model foundation

---

## Phase 1: Setup

**Purpose**: Add the environment feature flag that gates the entire feature at runtime. Required before any call-site masking can function.

- [x] T001 Add `FEATURE_BLIND_REVIEW_ENABLED: z.string().default('false')` to `innovatepam-portal/lib/env.ts` after the `FEATURE_MULTI_STAGE_REVIEW_ENABLED` line, and add `FEATURE_BLIND_REVIEW_ENABLED=false` to `innovatepam-portal/.env.local` and `innovatepam-portal/.env.example`

**Checkpoint**: `npx tsc --noEmit` passes. `env.FEATURE_BLIND_REVIEW_ENABLED` is accessible throughout the app.

---

## Phase 2: Foundational — Schema (US4)

**Purpose**: Add the `blindReview` persistent field to `ReviewPipeline`. All other phases depend on this column existing in the database and in the generated Prisma client.

**⚠️ CRITICAL**: Phases 3–5 cannot begin until T003 is complete (`prisma generate` must have run).

**Independent Test** (US4): After migration, create or update a pipeline record with `blindReview: true` via Prisma Studio or seed script; confirm the value persists and new records default to `false`.

- [x] T002 [US4] Add `blindReview  Boolean  @default(false)` field to `model ReviewPipeline` in `innovatepam-portal/prisma/schema.prisma` with a comment `// EPIC-V2-05: when true, author identity is masked from ADMINs during UNDER_REVIEW`
- [x] T003 [US4] Run `npx prisma migrate dev --name add_blind_review_to_pipeline` then `npx prisma generate` inside `innovatepam-portal/`; confirm migration directory created under `prisma/migrations/`

**Checkpoint**: `db.reviewPipeline.findMany()` returns records with a `blindReview` boolean field. Prisma client is regenerated.

---

## Phase 3: User Story 1 — Pipeline Toggle (Priority: P1) 🎯 MVP

**Goal**: A SUPERADMIN can enable/disable blind review on any pipeline via a UI toggle. The setting is persisted, visible only to SUPERADMIN, and disabled (with tooltip) when the feature flag is off.

**Independent Test**: SUPERADMIN opens `/admin/review-config`, enables the Blind Review Switch on any pipeline, saves, reloads the page — switch is still on. ADMIN visiting the same page does not see the switch.

- [x] T004 [P] [US1] Add `blindReview: z.boolean().optional()` to `UpdatePipelineSchema` in `innovatepam-portal/lib/validations/pipeline.ts`
- [x] T005 [US1] Extend `updatePipeline()` in `innovatepam-portal/lib/actions/pipeline-crud.ts`: (a) include `blindReview` in the `db.reviewPipeline.update()` call when present in parsed data; (b) add defence-in-depth per-field SUPERADMIN guard: `if ('blindReview' in parsed.data && session.user.role !== 'SUPERADMIN') return { error: '...', code: 'FORBIDDEN' }`
- [x] T006 [US1] Update `innovatepam-portal/app/admin/review-config/page.tsx`: query active review count per pipeline (`db.idea.groupBy` by `category` where `status: 'UNDER_REVIEW'`), build `activeCountBySlug` map, read `env.FEATURE_BLIND_REVIEW_ENABLED`, and pass `featureFlagEnabled`, `blindReview`, and `hasActiveReviews` as new props to each `<PipelineConfigForm>`
- [x] T007 [US1] Update `innovatepam-portal/components/pipeline/pipeline-config-form.tsx`: add `blindReview?: boolean`, `hasActiveReviews?: boolean`, `featureFlagEnabled?: boolean`, and `userRole: string` to component props; add a `Switch` (shadcn/ui) + `Tooltip` (shadcn/ui) with `EyeOff` Lucide icon rendered only when `userRole === 'SUPERADMIN'`; disable switch and show "Blind review is not enabled in this environment" tooltip when `!featureFlagEnabled`; show amber `Alert` (shadcn/ui) when `hasActiveReviews && localBlindReview === true`; wire `blindReview` value into the `updatePipeline()` / `createPipeline()` Server Action call

**Checkpoint**: SUPERADMIN can toggle blind review and save. ADMIN cannot see toggle. Flag-off renders disabled toggle. Amber warning appears when active reviews exist.

---

## Phase 4: User Story 2 — Identity Masking at Call Sites (Priority: P1)

**Goal**: When blind review is enabled on a pipeline and an idea is UNDER_REVIEW, ADMINs see "Anonymous" instead of the author's name. SUPERADMINs and the author themselves always see the real name.

**Independent Test**: With `FEATURE_BLIND_REVIEW_ENABLED=true`, a pipeline set to `blindReview: true`, and an idea in `UNDER_REVIEW` — an ADMIN viewing the idea detail page sees "Anonymous"; a SUPERADMIN sees the real name; the author sees their own name.

- [x] T008 [US2] Create `innovatepam-portal/lib/blind-review.ts`: export `maskAuthorIfBlind({ authorId, authorDisplayName, requesterId, requesterRole, pipelineBlindReview, ideaStatus, featureFlagEnabled }): string` — returns `'Anonymous'` only when all 5 conditions are true (flag enabled AND pipeline.blindReview AND status === 'UNDER_REVIEW' AND role === 'ADMIN' AND requesterId !== authorId); otherwise returns `authorDisplayName ?? 'Unknown'`; mark file with `// Server-side only — never import from client components`
- [x] T009 [P] [US2] Update `innovatepam-portal/app/(main)/ideas/[id]/page.tsx`: after fetching `idea`, add `db.reviewPipeline.findFirst({ where: { categorySlug: idea.category ?? '' }, select: { blindReview: true } })` to get pipeline; call `maskAuthorIfBlind(...)` and pass the resolved name to `authorName={...}` prop of `<IdeaDetail>`
- [x] T010 [P] [US2] Update `innovatepam-portal/app/api/ideas/[id]/route.ts` (GET handler): after fetching `idea`, add pipeline lookup; call `maskAuthorIfBlind(...)` and use the resolved name for `authorName` in the JSON response body
- [x] T011 [P] [US2] Update `innovatepam-portal/app/admin/review/[id]/page.tsx`: after fetching `idea`, add pipeline lookup; call `maskAuthorIfBlind(...)` and replace `idea.author.displayName` in JSX with the resolved name; also add inline comment above the `auditLog` include in the DB query: `// Blind review masking intentionally NOT applied to audit log entries — audit traceability supersedes objectivity. See PRD V2.0 Section 9.`
- [x] T012 [P] [US2] Update `innovatepam-portal/app/admin/review/[id]/stage/[stageId]/page.tsx`: same pattern as T011 — pipeline fetch, `maskAuthorIfBlind(...)` on the author display, and audit log exemption comment

**Checkpoint**: With flag on and pipeline.blindReview true, ADMIN sees "Anonymous" on page and in API. SUPERADMIN and author see real name. No masking when status is not UNDER_REVIEW.

---

## Phase 5: User Story 3 — Audit Log Exemption Verification (Priority: P1)

**Goal**: Confirm (for tracking purposes) that FR-011 audit log exemption comments are present at all audit-log include/write sites. T011 and T012 already add the comment to the two read-path admin pages; this phase addresses the write-path audit log calls.

**Independent Test**: Grep the codebase — every `db.auditLog` create or include in review pages has the policy comment. Audit log entries always show real names (verified by reading DB records directly or checking admin review page audit trail).

- [x] T013 [P] [US3] Verify `innovatepam-portal/app/api/ideas/[id]/route.ts`: confirm the `db.auditLog.create()` call (DELETE handler, line ~100) has a comment `// Blind review masking not applied — audit writes record actor identity, not idea author`; add if missing
- [x] T014 [P] [US3] Verify `innovatepam-portal/app/api/ideas/route.ts`: confirm the `db.auditLog.create()` call (line ~193) has the same exemption comment; add if missing

**Checkpoint**: All 4 audit log call sites (`app/api/ideas/route.ts`, `app/api/ideas/[id]/route.ts`, admin review pages) are documented as intentionally exempt from blind review masking.

---

## Phase 6: Polish & Verification

**Purpose**: Unit tests for the pure masking function, coverage configuration, and final green-bar check.

- [x] T015 [P] Create `innovatepam-portal/tests/unit/lib/blind-review.test.ts` with Vitest: test all 5 masking conditions individually (each toggled off), confirm masking when all 5 true, post-decision unmask (ACCEPTED/REJECTED status), self-view unmask (requesterId === authorId), SUPERADMIN unmask, null displayName fallback — minimum 8 test cases
- [x] T016 Add `'lib/blind-review.ts'` to the `include` array in `innovatepam-portal/vitest.config.ts` coverage configuration
- [x] T017 Run `npx tsc --noEmit` inside `innovatepam-portal/`; fix any TypeScript errors introduced by new props or imports
- [x] T018 Run `npm run test:unit -- --coverage` inside `innovatepam-portal/`; confirm all tests pass and overall coverage stays ≥ 80% statements / branches / functions

**Checkpoint**: 0 TypeScript errors. All unit tests green. Coverage thresholds met.

---

## Dependencies

```
T001 (feature flag) ──────────────────────────────────────────┐
T002 (schema field) → T003 (migrate + generate) ──────────────┤
                                                               ↓
                      T004, T005, T006, T007 (US1 toggle) ────┤
                      T008 (masking function) ─────────────────┤
                      T008 → T009, T010, T011, T012 (parallel) ┤
                      T013, T014 (audit comments, parallel) ───┤
                      T015, T016 (tests, parallel) ────────────┘
                                                               ↓
                                                    T017 → T018 (verify)
```

**Key sequencing rule**: T003 (prisma generate) must complete before any file that imports from `@/lib/generated/prisma` is modified, otherwise TypeScript will error on the missing `blindReview` field.

## Parallel Execution Per Story

**US1** (after T003): T004 (validation schema) can start while T005 (server action) is in progress — different files.

**US2** (after T008): T009, T010, T011, T012 are all parallelisable — different call-site files with no inter-dependencies.

**US3** (after US2): T013, T014 are parallelisable — different API route files.

**Polish** (after US2/US3): T015 and T016 are parallelisable — test file and config file.

## Task Count

| Phase            | Story | Tasks  |
| ---------------- | ----- | ------ |
| Phase 1: Setup   | —     | 1      |
| Phase 2: Schema  | US4   | 2      |
| Phase 3: Toggle  | US1   | 4      |
| Phase 4: Masking | US2   | 5      |
| Phase 5: Audit   | US3   | 2      |
| Phase 6: Polish  | —     | 4      |
| **Total**        |       | **18** |

**MVP scope**: T001–T007 (Phases 1–3) deliver a working pipeline toggle that persists `blindReview` end-to-end — US1 + US4 complete, independently demonstrable.
