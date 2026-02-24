# Tasks: Evaluation Workflow & QA Gate

**Input**: `specs/003-evaluation-qa/` — plan.md, spec.md, research.md, data-model.md, contracts/review.md, quickstart.md
**Branch**: `003-evaluation-qa`
**Stories**: US-012 (Evaluation Workflow) · US-013 (Admin Dashboard) · US-016 (Test Suite & QA Gate) · US-015 (Profile & Settings) · US-014 (Analytics, P3 flag-gated)
**Organization**: Tasks grouped by user story — each phase is independently testable and deliverable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[US#]**: User story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema migration, proxy update, CI fix, and test-environment setup that all user stories depend on. Must complete before any story work begins.

- [x] T001 Apply Prisma schema changes in `prisma/schema.prisma`: make `IdeaReview.decision ReviewDecision?` (nullable), make `IdeaReview.comment String?` (nullable), add `IdeaReview.startedAt DateTime @default(now())`, add `IdeaReview.decidedAt DateTime?`; add three new `AuditAction` enum values: `IDEA_REVIEW_STARTED`, `IDEA_REVIEWED`, `IDEA_REVIEW_ABANDONED`; then run `npx prisma migrate dev --name epic04_evaluation_workflow` and `npx prisma generate`
- [x] T002 [P] Update `proxy.ts` (repo root) — add `/settings` to the `isProtected` path list alongside existing `/dashboard`, `/admin`, `/api/admin` entries
- [x] T003 [P] Create `.github/workflows/ci.yml` — the file does not yet exist (`.github/` contains only `agents/` and `prompts/`); add a workflow with: trigger on `push` and `pull_request` to `main`; jobs: (1) `lint` — `npm run lint`; (2) `test` — `npm run test:coverage` (NOT `test:unit` — this enforces the 80% threshold); (3) `build` — `npm run build`; use `actions/checkout@v4` + `actions/setup-node@v4` with `node-version: '20'` and `cache: 'npm'`
- [x] T004 [P] Add `DATABASE_URL_TEST` to `.env.example` with placeholder value and comment: "# Separate test DB — required for integration tests; must NOT point to dev or prod DB"; document usage in `specs/003-evaluation-qa/quickstart.md` under a new §Integration Tests section; add the env var to CI secrets documentation/comments in `.github/workflows/ci.yml`

---

## Phase 2: Foundational RED — Write Failing Tests First (Constitution §III)

**Purpose**: Write all unit tests for the state machine and validation schemas BEFORE any implementation. All tests in this phase MUST fail when run — a passing test here means the test is wrong.

**⚠️ GATE (Constitution Principle III)**: `npm run test:unit` MUST show all tests in this phase failing before Phase 3 begins. Do not proceed to GREEN until RED is confirmed.

- [x] T005 Create `__tests__/unit/state-machine.test.ts` — exhaustive Vitest tests: all 4 permitted transitions (`SUBMITTED→UNDER_REVIEW` via `START_REVIEW`/ADMIN, `UNDER_REVIEW→ACCEPTED`, `UNDER_REVIEW→REJECTED`, `UNDER_REVIEW→SUBMITTED` via `ABANDON`/SUPERADMIN); all forbidden combos throw `InvalidTransitionError`; SUBMITTER role throws `InsufficientRoleError`; ADMIN attempting `ABANDON` throws `InsufficientRoleError`; double-review guard throws `AlreadyReviewedError`; name tests after ACs: `it('SUBMITTED → UNDER_REVIEW with ADMIN role — US-012 AC-1')` etc. — ALL MUST FAIL until T008 exists
- [x] T006 [P] Create `__tests__/unit/review-validation.test.ts` — Vitest tests for `FinalizeReviewSchema`: valid ACCEPTED passes; valid REJECTED passes; missing comment rejects; comment of exactly 9 chars rejects; comment of 10 chars passes; whitespace-only comment (trimmed < 10) rejects; invalid decision string rejects; missing ideaId rejects — ALL MUST FAIL until T009 exists
- [x] T007 [P] Create `__tests__/unit/user-validation.test.ts` — Vitest tests for `DisplayNameSchema`: empty string rejects; single char passes; 50 chars passes; 51 chars rejects; whitespace-only rejects (trimmed empty); tests for `ChangePasswordSchema`: missing uppercase rejects; missing digit rejects; 7 chars rejects; 8 chars passes — ALL MUST FAIL until T010 exists

---

## Phase 3: Foundational GREEN — Implement to Pass Tests

**Purpose**: Implement the state machine and schemas. Run T005/T006/T007 after each file — all must go GREEN. No implementation may be added beyond what is needed to make the tests pass.

**Checkpoint**: Run `npm run test:unit -- __tests__/unit/state-machine.test.ts __tests__/unit/review-validation.test.ts __tests__/unit/user-validation.test.ts` → all three suites MUST pass before Phase 4 begins.

- [x] T008 Create `lib/state-machine/idea-status.ts` — export pure function `transition(current: IdeaStatus, action: ReviewAction, role: UserRole): IdeaStatus`; define `ReviewAction` union type (`START_REVIEW | ACCEPT | REJECT | ABANDON`); throw `InvalidTransitionError` for disallowed state+action combos, `InsufficientRoleError` when role lacks permission, `AlreadyReviewedError` when idea is already `ACCEPTED`/`REJECTED`; do NOT import Prisma — pure logic only; cite ACs in comments e.g. `// US-012 AC-6: self-review never reaches transition`
- [x] T009 [P] Create `lib/validations/review.ts` — `FinalizeReviewSchema`: `ideaId` (cuid), `decision` (enum: `ACCEPTED | REJECTED`), `comment` (string, trimmed, min 10 chars); export inferred `FinalizeReviewInput` type; verify the 10-char minimum matches FR-005 exactly
- [x] T010 [P] Create `lib/validations/user.ts` — `DisplayNameSchema`: string, trimmed, min 1 char, max 50 chars; `ChangePasswordSchema`: object with `currentPassword` (string), `newPassword` (string, min 8, at least 1 uppercase, 1 digit); **cross-check these constraints against the existing registration password schema** (wherever it lives in the codebase) — FR-018 requires the same policy; extract any shared constants into a reusable export rather than duplicating inline values; export inferred types

---

## Phase 4: US-012 Integration RED — Write Failing Integration Test

**Purpose**: Write the integration test file before the Server Actions exist so the RED phase is confirmed at DB level. The file must be created and run against `DATABASE_URL_TEST`; all tests must fail with "cannot find module" or similar, not pass.

**⚠️ GATE**: Run `npm run test:unit -- __tests__/integration/review-workflow.test.ts` → all tests MUST fail before Phase 5 begins.

- [x] T011 Create `__tests__/integration/review-workflow.test.ts` — **start the file with `// @vitest-environment node`** (global `vitest.config.ts` sets `environment: 'jsdom'`; integration tests must hit a real Postgres DB and require the Node environment override); use `lib/db.ts` Prisma client against `DATABASE_URL_TEST`; tests: (a) seed idea → call `startReviewAction` → verify `IdeaReview` row created + `idea.status === UNDER_REVIEW` + `AuditLog` entry `IDEA_REVIEW_STARTED` — US-012 AC-1, FR-004, FR-028; (b) call `finalizeReviewAction(ACCEPTED)` → verify `ideaReview.decision`, `decidedAt` set + `idea.status === ACCEPTED` + `AuditLog IDEA_REVIEWED` — US-012 AC-3, FR-006; (c) `abandonReviewAction` by SUPERADMIN → `ideaReview` deleted + `idea.status === SUBMITTED` + `AuditLog IDEA_REVIEW_ABANDONED` — FR-030; (d) concurrency: two concurrent `startReviewAction` calls for same `ideaId` → second throws `ALREADY_UNDER_REVIEW` — edge case spec §Edge Cases; add `afterEach` / `afterAll` that deletes all seeded rows by test-run prefix to avoid polluting `DATABASE_URL_TEST`

---

## Phase 5: US-012 GREEN — Evaluation Workflow (Priority: P1) 🎯 MVP

**Goal**: Implement Server Actions, components, and page so that T011 + the E2E review path (Phase 8 T028) both go green.

**Independent Test**: Log in as ADMIN → `/admin/review/<submittedIdeaId>` → "Start Review" → comment textarea + Accept/Reject appear → enter ≥10 char comment → "Accept" → decision card shows ACCEPTED badge, reviewer name, comment, decidedAt. Log in as SUPERADMIN → "Abandon Review" available → click → idea returns to SUBMITTED.

### Implementation

- [ ] T012 Create `lib/actions/start-review.ts` — Server Action: authenticate session → verify role is ADMIN or SUPERADMIN → self-review guard (`idea.authorId !== session.userId`, return `SELF_REVIEW_FORBIDDEN` if equal — US-012 AC-6, FR-003) → open `prisma.$transaction`: `findUnique` the IdeaReview by `ideaId` (concurrency guard — throw `ALREADY_UNDER_REVIEW` if row exists) → `ideaReview.create({ ideaId, reviewerId: session.userId, startedAt: now() })` → `idea.update({ status: UNDER_REVIEW })` → `auditLog.create({ action: IDEA_REVIEW_STARTED, ... })` → `revalidatePath('/admin')` + `revalidatePath(\`/ideas/${ideaId}\`)` _(FR-013, SC-002 — must revalidate submitter view)_
- [ ] T013 [P] Create `lib/actions/finalize-review.ts` — Server Action: authenticate session → parse + validate with `FinalizeReviewSchema` (rejects comments < 10 chars — FR-005) → self-review guard → open `prisma.$transaction`: `ideaReview.update({ decision, comment, decidedAt: now() })` → `idea.update({ status: decision === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED' })` → `auditLog.create({ action: IDEA_REVIEWED, metadata: { decision, commentSummary: comment.slice(0, 100) } })` → `revalidatePath('/admin')` + `revalidatePath(\`/ideas/${ideaId}\`)` _(same targets as T012 — FR-013, SC-002)_
- [ ] T014 [P] Create `lib/actions/abandon-review.ts` — Server Action: authenticate session → verify role is SUPERADMIN (return `FORBIDDEN_ROLE` if not — FR-030) → open `prisma.$transaction`: `ideaReview.delete({ where: { ideaId } })` → `idea.update({ status: SUBMITTED })` → `auditLog.create({ action: IDEA_REVIEW_ABANDONED, metadata: { ideaId, originalReviewerId, superadminActorId: session.userId } })` → `revalidatePath('/admin')` + `revalidatePath(\`/ideas/${ideaId}\`)`
- [ ] T015 [P] [US-012] Create `components/admin/review-action-panel.tsx` — client component; receives `idea` (with status + authorId) and `currentUser` (id + role); when `status === SUBMITTED`: renders "Start Review" button calling `startReviewAction`; when `status === UNDER_REVIEW` and `currentUser.id !== idea.authorId`: renders comment `<textarea>` (min 10 chars, live char counter) + "Accept" / "Reject" buttons calling `finalizeReviewAction`; when `currentUser.id === idea.authorId`: renders "You cannot review your own idea" notice — no action buttons (US-012 AC-6); handles loading + error state
- [ ] T016 [P] [US-012] Create `components/admin/decision-card.tsx` — server component; receives `IdeaReview` with reviewer relation; renders read-only card: decision badge (green ACCEPTED / red REJECTED), reviewer `displayName`, `comment`, formatted `decidedAt`; replaces action panel after finalization — FR-029 (admin view `/admin/review/<id>`)
- [ ] T017 [P] [US-012] Create `components/admin/abandon-review-button.tsx` — client component; SUPERADMIN-only (hidden for ADMIN — FR-030); uses Radix `<AlertDialog>` "Are you sure you want to abandon this review?"; on confirm calls `abandonReviewAction(ideaId)`; handles loading state
- [ ] T018 [US-012] Create `app/admin/review/[id]/page.tsx` — RSC; role guard (redirect to `/forbidden` if role is not ADMIN or SUPERADMIN — FR-001); fetch `idea` by `params.id` including `review` relation and `author`; 404 if not found; if `idea.status === ACCEPTED || REJECTED`: render `<DecisionCard review={idea.review} />`; if `idea.status === UNDER_REVIEW || SUBMITTED`: render `<ReviewActionPanel idea={idea} currentUser={session.user} />` + (SUPERADMIN only) `<AbandonReviewButton ideaId={idea.id} />`
- [ ] T019 Update `components/ideas/idea-detail.tsx` (existing file from Epic-03) — two changes required: (1) update the local `IdeaReviewDetail` interface: change `decision: 'ACCEPTED' | 'REJECTED'` → `decision: 'ACCEPTED' | 'REJECTED' | null` and `comment: string` → `comment: string | null` to match the now-nullable Prisma fields after T001's migration; (2) change the review card visibility guard from `{review && (` to `{review && review.decision !== null && review.comment !== null && (` so the card only renders when the decision is finalized — never during `UNDER_REVIEW` state — FR-007, SC-002; run `npm run test:unit -- __tests__/unit/` to confirm no regressions in existing idea-detail tests

---

## Phase 6: US-013 GREEN — Admin Dashboard (Priority: P1)

**Goal**: ADMIN sees live pipeline counts and oldest-first pending queue at `/admin`.

**Independent Test**: Log in as ADMIN → `/admin` → stat cards match DB counts → pending queue lists SUBMITTED ideas oldest-first with working "Review" links → zero-pending shows empty state → a SUBMITTER visiting `/admin` receives access-denied.

### Implementation

- [ ] T020 [P] [US-013] Create `components/admin/dashboard-stats.tsx` — server component; accepts `stats: { total: number; submitted: number; underReview: number; accepted: number; rejected: number }`; renders 5 stat cards with labels and counts; no client-side state needed
- [ ] T021 [P] [US-013] Create `components/admin/pending-queue.tsx` — server component; accepts `ideas: PendingSummary[]`; renders table: Title (link to `/admin/review/<id>`), Author display name, Category, relative submission time; ordered oldest-first; empty state "No ideas awaiting review. Great work!" (FR-012 exact copy) when array is empty
- [ ] T022 [US-013] Modify `app/admin/page.tsx` — full RSC dashboard: add `export const dynamic = 'force-dynamic'` (no caching — FR-013); role guard (ADMIN+, redirect to `/forbidden` — FR-014); two parallel Prisma queries: `prisma.idea.groupBy({ by: ['status'], _count: true })` → map to `stats` + `prisma.idea.findMany({ where: { status: 'SUBMITTED' }, orderBy: { createdAt: 'asc' }, include: { author: { select: { displayName: true } } } })` → pass to queue; render `<DashboardStats stats={...} />` + `<PendingQueue ideas={...} />`

---

## Phase 7: US-016 E2E Infrastructure

**Purpose**: Seed/cleanup API routes and Playwright helpers must exist before E2E specs reference them.

- [ ] T023 [P] Create `app/api/test/seed/route.ts` and `app/api/test/cleanup/route.ts` — both guarded by `if (process.env.NODE_ENV !== 'test') return NextResponse.json({ error: 'forbidden' }, { status: 403 })`; seed route accepts `{ runId: string }` body and creates users/ideas where each idea's `title` is prefixed with `[test:${runId}]` (deterministic prefix pattern — no schema field needed; cleanup deletes by `title LIKE '[test:${runId}]%'`); cleanup route deletes all records by same prefix; document the pattern in `specs/003-evaluation-qa/quickstart.md` §E2E Seed Strategy
- [ ] T024 [P] Create `__tests__/e2e/helpers/auth.ts` — shared Playwright helper `loginAs(page, role)` that navigates to `/login`, fills credentials for a pre-seeded user of the given role, submits, awaits navigation to `/ideas`; export `ADMIN_CREDS`, `SUBMITTER_CREDS` constants pointing to known seed-user credentials
- [ ] T025 [P] Create `__tests__/e2e/helpers/seed.ts` — shared Playwright helper `seedTestData(request, runId)` and `cleanupTestData(request, runId)` using Playwright `apiRequestContext` to call the routes from T023; call `cleanupTestData` in `afterEach` to ensure test isolation

---

## Phase 8: US-016 E2E RED — Write Failing E2E Specs

**Purpose**: Write all four E2E spec files before the full feature is wired. Specs should fail or be skipped when the features they test are not yet complete. Running `npm run test:e2e` at the end of this phase should show failures/skips — not passes — confirming the RED state.

- [x] T026 Create `__tests__/e2e/auth.spec.ts` — **Scope: login path only** (registration E2E is out of scope for this epic; note with `// TODO(US-016): registration E2E deferred — login-only path covers the auth gate` inline comment); navigate to `/login` → fill credentials → submit → assert redirect to `/ideas` → assert nav shows user displayName; assert `/admin` shows redirect when logged in as SUBMITTER — US-016 AC-2 path (a)
- [x] T027 [P] Create `__tests__/e2e/idea-submission.spec.ts` — E2E path (b): login as SUBMITTER → navigate to `/ideas/new` → fill title, description, category → submit → assert redirect to `/ideas/<id>` → assert title and "Submitted" badge visible — US-016 AC-2 path (b)
- [x] T028 Create `__tests__/e2e/review-workflow.spec.ts` — E2E path (c): seed idea (SUBMITTER) → login as ADMIN → open `/admin/review/<id>` → "Start Review" → assert status badge becomes "Under Review" → type 15-char comment → "Accept" → assert decision card shows "ACCEPTED", reviewer name, comment; then login as SUBMITTER → open `/ideas/<id>` → assert decision badge and reviewer info visible (validates FR-007 via T019) — US-016 AC-2 path (c)
- [x] T029 [P] Create `__tests__/e2e/rbac.spec.ts` — E2E path (d): login as SUBMITTER → attempt to navigate to `/admin` → assert redirect; attempt POST to `/admin/review/<id>` via fetch → assert 401 or 403; verify `/settings` IS accessible to SUBMITTER — US-016 AC-2 path (d)

---

## Phase 9: US-016 QA Gate

- [x] T030 Verify/add npm scripts in `package.json` — confirm `"test:e2e": "playwright test"` exists (FR-026: "A `test:e2e` command MUST be available"); confirm `"test:coverage": "vitest run --coverage"` exists (FR-025); if either is missing, add it; run both commands locally to verify they resolve without error before CI run
- [x] T031 Run `npm run test:coverage` — confirm all four Vitest metrics (lines, branches, functions, statements) ≥80%; fix any coverage gaps before marking done; this is the GA blocker per SC-004 and FR-025

---

## Phase 10: US-015 GREEN — Profile & Settings (Priority: P2)

**Goal**: Any authenticated user can update their display name and change their password from `/settings`.

**Independent Test**: Log in as SUBMITTER → `/settings` → update display name → save → nav reflects new name. Change password with correct current + valid new → success toast → old password fails on next login.

### Implementation

- [x] T032 Create `lib/actions/update-display-name.ts` — Server Action: authenticate session → parse + validate with `DisplayNameSchema` → `prisma.user.update({ where: { id: session.userId }, data: { displayName: trimmedValue } })` → return `{ success: true }`; revalidate any paths rendering the user's name
- [x] T033 [P] Create `lib/actions/update-password.ts` — Server Action: authenticate session → parse + validate with `ChangePasswordSchema` → `bcrypt.compare(currentPassword, user.hashedPassword)` → return `{ error: 'INVALID_CURRENT_PASSWORD' }` if mismatch (user-facing: "Current password is incorrect." — FR-017) → `hashPassword(newPassword)` → `prisma.user.update(hashedPassword)` → return `{ success: true }`; the `hashPassword` call MUST use the same bcrypt helper already used at registration — do not introduce a second hashing implementation
- [x] T034 [P] Create `components/settings/display-name-form.tsx` — client component; controlled input pre-filled with `session.user.displayName`; calls `updateDisplayNameAction` on submit; shows success toast on `{ success: true }`; shows inline error on failure; submit button disabled while pending
- [x] T035 [P] Create `components/settings/password-change-form.tsx` — client component; three fields: current password, new password, confirm new password; client-side validation: new === confirm before any server request (FR-019, user-facing: "Passwords do not match."); calls `updatePasswordAction`; success toast; inline error for wrong current password or policy violation; clears form fields on success
- [x] T036 Create `app/settings/page.tsx` — RSC; authenticated (any role — SUBMITTER, ADMIN, SUPERADMIN); redirect to `/login` if unauthenticated; render `<DisplayNameForm user={session.user} />` + `<PasswordChangeForm />` in a two-section layout

---

## Phase 11: US-014 GREEN — Analytics Dashboard (Priority: P3, flag-gated)

**Goal**: SUPERADMIN sees three charts at `/admin/analytics` when `FEATURE_ANALYTICS_ENABLED=true`; page returns 404 otherwise.

**Independent Test**: Flag on + SUPERADMIN → three charts render. Flag off → 404. ADMIN (not SUPERADMIN) → access denied.

### Implementation

- [x] T037 [P] [US-014] Create `components/analytics/ideas-by-category-chart.tsx` — client component; bar chart of idea counts by category; accepts `data: { category: string; count: number }[]`; empty state "No ideas submitted yet" when array is empty — FR-024
- [x] T038 [P] [US-014] Create `components/analytics/submission-trend-chart.tsx` — client component; line chart of per-day submission counts, 30-day rolling window; accepts `data: { date: string; count: number }[]`; empty state when all counts are zero — FR-024
- [x] T039 [P] [US-014] Create `components/analytics/top-contributors-table.tsx` — server component; accepts `data: { displayName: string; count: number }[]` (up to 5 rows); ranked table; fewer than 5 users → show only available rows; empty state "No submissions yet" — FR-023, FR-024
- [x] T040 Create `app/admin/analytics/page.tsx` — RSC; `if (process.env.FEATURE_ANALYTICS_ENABLED !== 'true') notFound()` (FR-021); role guard: SUPERADMIN only, redirect to `/forbidden` for ADMIN (FR-022); three parallel Prisma queries: `groupBy category` for bar chart, daily counts for trend, top-5 authors by count; render `<IdeasByCategoryChart />` + `<SubmissionTrendChart />` + `<TopContributorsTable />`

---

## Phase 12: Polish & GA Gate

**Purpose**: Seed data, type safety, lint, build, E2E run, and manual smoke confirm production readiness.

- [x] T041 Update `prisma/seed.ts` — add seed ideas with `UNDER_REVIEW`, `ACCEPTED`, and `REJECTED` statuses; add matching `IdeaReview` rows with `decision`, `comment`, `startedAt`, and `decidedAt` populated for reviewed ideas; ensures `npx prisma db seed` gives a realistic dashboard and review-page view locally
- [x] T042 [P] Run `npm run type-check` — 0 errors; fix any TypeScript errors introduced by nullable `IdeaReview.decision` / `IdeaReview.comment` fields
- [x] T043 [P] Run `npm run lint` — 0 warnings (`--max-warnings 0`); fix all lint violations
- [x] T044 Run `npm run build` — must pass with 0 errors
- [x] T045 Run `npm run test:e2e` — all four critical-path E2E specs must pass (FR-026, US-016 AC-2); fix any failures before GA
- [x] T046 Manual smoke test on Vercel preview URL after branch deploy: (a) start review → finalize → admin dashboard counts update; (b) submitter sees decision on `/ideas/<id>`; (c) `/settings` loads for SUBMITTER; (d) review page and dashboard respond within 2 seconds on a standard connection (SC-001 performance check)

---

## Dependencies

```
Phase 1  (T001–T004): No dependencies; T002+T003+T004 parallel after T001
Phase 2  (T005–T007): Depends on Phase 1; T005+T006+T007 all parallel — RED tests require migration (T001) for correct types
Phase 3  (T008–T010): Depends on Phase 2; T008+T009+T010 all parallel — GREEN after RED confirmed failing
Phase 4  (T011):      Depends on Phase 3; sequential — integration test needs state machine types
Phase 5  (T012–T019): Depends on Phase 4; T012 sequential first; T013+T014+T015+T016+T017 parallel after T012; T018 depends T015+T016+T017; T019 independent (different file) parallel with T013+
Phase 6  (T020–T022): Depends on Phase 3; T020+T021 parallel; T022 last (depends T020+T021)
Phase 7  (T023–T025): Depends on Phase 5+6; T023+T024+T025 all parallel
Phase 8  (T026–T029): Depends on Phase 7; T026+T027+T029 parallel; T028 after T026 (same flow)
Phase 9  (T030–T031): Depends on Phases 3+8; T030 first (script must exist); T031 after T030
Phase 10 (T032–T036): Depends on Phase 3 only; T032 first; T033+T034+T035 parallel; T036 last
Phase 11 (T037–T040): Depends on Phase 3 only; T037+T038+T039 parallel; T040 last
Phase 12 (T041–T046): Depends on all prior phases; T041+T042+T043 parallel; T044 after T042+T043; T045 after T044; T046 last
```

**Parallel opportunities per phase**:

| Phase | Parallelizable tasks                                                   |
| ----- | ---------------------------------------------------------------------- |
| 1     | T002 + T003 + T004 parallel after T001                                 |
| 2     | T005 + T006 + T007 all parallel                                        |
| 3     | T008 + T009 + T010 all parallel                                        |
| 4     | T011 solo                                                              |
| 5     | T013 + T014 + T015 + T016 + T017 + T019 parallel after T012; T018 last |
| 6     | T020 + T021 parallel; T022 last                                        |
| 7     | T023 + T024 + T025 all parallel                                        |
| 8     | T026 + T027 + T029 parallel; T028 after T026                           |
| 9     | T030 then T031 sequential                                              |
| 10    | T033 + T034 + T035 parallel after T032; T036 last                      |
| 11    | T037 + T038 + T039 parallel; T040 last                                 |
| 12    | T041 + T042 + T043 parallel; T044 after; T045 after T044; T046 last    |

---

## Implementation Strategy

**Mandatory workflow per story (Constitution §3)**:

1. Write failing tests (RED) → confirm they fail → implement (GREEN) → confirm they pass → refactor

**MVP scope** (deliver US-012 + US-013 end-to-end first):

1. Complete Phase 1 (`T001–T004`) — migration + env setup
2. Complete Phase 2 (`T005–T007`) — unit tests written, all FAILING ← RED confirmed
3. Complete Phase 3 (`T008–T010`) — state machine + schemas, unit tests now PASSING ← GREEN
4. Complete Phase 4 (`T011`) — integration test written, FAILING ← RED confirmed
5. Complete Phase 5 (`T012–T019`) — US-012 evaluation workflow, integration tests now PASSING ← GREEN
6. Complete Phase 6 (`T020–T022`) — US-013 admin dashboard live
7. Complete Phase 7 (`T023–T025`) — E2E infrastructure
8. Complete Phase 8 (`T026–T029`) — E2E specs written, FAILING ← RED confirmed
9. Complete Phase 9 (`T030–T031`) — npm scripts verified; coverage gate passes ← GREEN
10. Complete Phase 10 (`T032–T036`) — US-015 settings (P2)
11. Complete Phase 11 (`T037–T040`) — US-014 analytics (P3, flag-gated)
12. Complete Phase 12 (`T041–T046`) — polish + GA gate

**Total tasks**: 46 (T001–T046)

| Phase                               | Task count | Story               | TDD phase     |
| ----------------------------------- | ---------- | ------------------- | ------------- |
| Phase 1 — Setup                     | 4          | Shared              | Prerequisites |
| Phase 2 — Foundational RED          | 3          | Shared (US-012/015) | RED           |
| Phase 3 — Foundational GREEN        | 3          | Shared              | GREEN         |
| Phase 4 — Integration RED           | 1          | US-012              | RED           |
| Phase 5 — Evaluation Workflow GREEN | 8          | US-012              | GREEN         |
| Phase 6 — Admin Dashboard GREEN     | 3          | US-013              | GREEN         |
| Phase 7 — E2E Infrastructure        | 3          | US-016              | Setup         |
| Phase 8 — E2E RED                   | 4          | US-016              | RED           |
| Phase 9 — QA Gate                   | 2          | US-016              | GREEN         |
| Phase 10 — Profile & Settings GREEN | 5          | US-015              | GREEN         |
| Phase 11 — Analytics GREEN          | 4          | US-014              | GREEN         |
| Phase 12 — Polish & GA Gate         | 6          | Cross-cutting       | Verify        |
