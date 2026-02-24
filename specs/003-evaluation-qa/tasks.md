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

**Purpose**: Schema migration, proxy update, and CI fix that all user stories depend on. Must complete before any story work begins.

- [ ] T001 Apply Prisma schema changes in `prisma/schema.prisma`: make `IdeaReview.decision ReviewDecision?` (nullable), make `IdeaReview.comment String?` (nullable), add `IdeaReview.startedAt DateTime @default(now())`, add `IdeaReview.decidedAt DateTime?`; add three new `AuditAction` enum values: `IDEA_REVIEW_STARTED`, `IDEA_REVIEWED`, `IDEA_REVIEW_ABANDONED`; then run `npx prisma migrate dev --name epic04_evaluation_workflow` and `npx prisma generate`
- [ ] T002 [P] Update `proxy.ts` (repo root) — add `/settings` to the `isProtected` path list alongside existing `/dashboard`, `/admin`, `/api/admin` entries
- [ ] T003 [P] Update `.github/workflows/ci.yml` — change `npm run test:unit` to `npm run test:coverage` so the CI gate enforces the 80% threshold configured in `vitest.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: State machine and shared validation schemas that every US-012 Server Action depends on. Must complete before Phase 3–4 work begins.

**⚠️ CRITICAL**: No review Server Action can be implemented until T004–T006 are complete.

- [ ] T004 Create `lib/state-machine/idea-status.ts` — export pure function `transition(current: IdeaStatus, action: ReviewAction, role: UserRole): IdeaStatus`; define `ReviewAction` union type (`START_REVIEW | ACCEPT | REJECT | ABANDON`); throw `InvalidTransitionError` for disallowed state+action combos, `InsufficientRoleError` when role lacks permission, `AlreadyReviewedError` when idea is already `ACCEPTED`/`REJECTED`; do NOT import Prisma — pure logic only
- [ ] T005 [P] Create `lib/validations/review.ts` — `FinalizeReviewSchema`: `ideaId` (cuid), `decision` (enum: `ACCEPTED | REJECTED`), `comment` (string, trimmed, min 10 chars); export inferred `FinalizeReviewInput` type
- [ ] T006 [P] Create `lib/validations/user.ts` — `DisplayNameSchema`: string, trimmed, min 1 char, max 50 chars; `ChangePasswordSchema`: object with `currentPassword` (string), `newPassword` (string, min 8, at least 1 uppercase, 1 digit); export inferred types

**Checkpoint**: Migration applied and Prisma client regenerated (T001); state machine + schemas ready — story implementation can begin.

---

## Phase 3: User Story 1 — Evaluation Workflow (Priority: P1) 🎯 MVP

**Goal**: An ADMIN/SUPERADMIN starts a review, accepts or rejects with a mandatory comment, and the idea's status transitions correctly with a full audit trail.

**Independent Test**: Log in as ADMIN → open `/admin/review/<submittedIdeaId>` → click "Start Review" → page re-renders showing comment textarea and Accept/Reject buttons. Enter ≥10 char comment → click "Accept" → page shows decision card with ACCEPTED badge, reviewer name, comment, decidedAt. Log in as SUPERADMIN → page shows "Abandon Review" button; click it → idea returns to SUBMITTED, action panel re-appears.

### Implementation

- [ ] T007 Create `lib/actions/start-review.ts` — Server Action: authenticate session → verify role is ADMIN or SUPERADMIN → check `ideaId !== session.user.ideaId` (self-review guard) → open `prisma.$transaction`: `findUnique` the IdeaReview by `ideaId` (concurrency guard — throw if already exists) → `ideaReview.create({ ideaId, reviewerId: session.userId, startedAt: now() })` → `idea.update({ status: UNDER_REVIEW })` → `auditLog.create({ action: IDEA_REVIEW_STARTED, userId: session.userId, metadata: { ideaId } })` → end transaction → `revalidatePath('/admin')` + `revalidatePath('/admin/review/[id]')`
- [ ] T008 [P] Create `lib/actions/finalize-review.ts` — Server Action: authenticate session → parse + validate with `FinalizeReviewSchema` → self-review guard → open `prisma.$transaction`: `ideaReview.update({ decision, comment, decidedAt: now() })` → `idea.update({ status: decision === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED' })` → `auditLog.create({ action: IDEA_REVIEWED, ... })` → `revalidatePath('/admin')` + `revalidatePath('/admin/review/[id]')`
- [ ] T009 [P] Create `lib/actions/abandon-review.ts` — Server Action: authenticate session → verify role is SUPERADMIN (return error if not) → open `prisma.$transaction`: `ideaReview.delete({ where: { ideaId } })` → `idea.update({ status: SUBMITTED })` → `auditLog.create({ action: IDEA_REVIEW_ABANDONED, ... })` → `revalidatePath('/admin')` + `revalidatePath('/admin/review/[id]')`
- [ ] T010 [P] [US1] Create `components/admin/review-action-panel.tsx` — client component; receives `idea` (with status + authorId) and `currentUser` (id + role); when `status === SUBMITTED`: renders "Start Review" button that calls `startReviewAction`; when `status === UNDER_REVIEW` and `currentUser.id !== idea.authorId`: renders comment `<textarea>` (min 10 chars, live char counter) + "Accept" / "Reject" buttons that call `finalizeReviewAction`; when `currentUser.id === idea.authorId`: renders "You cannot review your own idea" notice instead of action buttons; handles loading + error state
- [ ] T011 [P] [US1] Create `components/admin/decision-card.tsx` — server component; receives `IdeaReview` with reviewer relation; renders read-only card showing: decision badge (green ACCEPTED / red REJECTED), reviewer `displayName`, `comment`, formatted `decidedAt`; shown in place of action panel after finalization
- [ ] T012 [P] [US1] Create `components/admin/abandon-review-button.tsx` — client component; SUPERADMIN-only (hidden for ADMIN); uses Radix `<AlertDialog>` with "Are you sure you want to abandon this review?" confirmation copy; on confirm calls `abandonReviewAction(ideaId)`; handles loading state
- [ ] T013 [US1] Create `app/admin/review/[id]/page.tsx` — RSC; role guard (redirect to `/forbidden` if role is not ADMIN or SUPERADMIN); fetch `idea` by `params.id` including `review` relation and `author`; 404 if not found; if `idea.status === ACCEPTED || REJECTED`: render `<DecisionCard review={idea.review} />`; if `idea.status === UNDER_REVIEW || SUBMITTED`: render `<ReviewActionPanel idea={idea} currentUser={session.user} />` + (SUPERADMIN only) `<AbandonReviewButton ideaId={idea.id} />`

---

## Phase 4: User Story 2 — Admin Dashboard (Priority: P1)

**Goal**: An ADMIN/SUPERADMIN opens `/admin` and sees live counts across all statuses plus a queue of SUBMITTED ideas oldest-first with direct links to review pages.

**Independent Test**: Log in as ADMIN → open `/admin` → stat cards show correct counts matching DB. Submit a new idea as another user → refresh admin page → "Submitted" count increments and the new idea appears at the bottom of the pending queue. When zero pending ideas exist, an empty-state message appears in the queue section.

### Implementation

- [ ] T014 [P] [US2] Create `components/admin/dashboard-stats.tsx` — server component; accepts `stats: { total: number; submitted: number; underReview: number; accepted: number; rejected: number }`; renders 5 stat cards with labels and counts; no client-side state needed
- [ ] T015 [P] [US2] Create `components/admin/pending-queue.tsx` — server component; accepts `ideas: PendingSummary[]`; renders a table with columns: Title (link to `/admin/review/<id>`), Author display name, Category, relative submission time; ordered oldest-first; empty state "No pending ideas — all caught up!" when array is empty
- [ ] T016 [US2] Modify `app/admin/page.tsx` — full RSC dashboard: add `export const dynamic = 'force-dynamic'` (no caching); role guard (ADMIN+, redirect to `/forbidden`); run two Prisma queries in parallel: `prisma.idea.groupBy({ by: ['status'], _count: true })` for stat counts + `prisma.idea.findMany({ where: { status: 'SUBMITTED' }, orderBy: { createdAt: 'asc' }, include: { author: { select: { displayName } } } })` for queue; render `<DashboardStats stats={...} />` + `<PendingQueue ideas={...} />`

---

## Phase 5: User Story 3 — Test Suite & QA Gate (Priority: P1)

**Goal**: Unit tests cover all state machine transitions and validation schema edge cases; integration tests verify database-level review workflow; E2E tests cover the four critical user paths; CI gate enforces ≥80% coverage.

**Independent Test**: Run `npm run test:coverage` → all suites pass, all four metrics (lines, branches, functions, statements) ≥80%. Run `npx playwright test` → all four E2E specs pass against a running dev server.

### Unit Tests

- [ ] T017 Create `__tests__/unit/state-machine.test.ts` — exhaustive Vitest tests for `lib/state-machine/idea-status.ts`: all 4 permitted transitions (SUBMITTED→UNDER_REVIEW via START_REVIEW/ADMIN, UNDER_REVIEW→ACCEPTED, UNDER_REVIEW→REJECTED, UNDER_REVIEW→SUBMITTED via ABANDON/SUPERADMIN); all forbidden combos throw `InvalidTransitionError`; SUBMITTER role throws `InsufficientRoleError`; ADMIN trying ABANDON throws `InsufficientRoleError`; double-review guard for `AlreadyReviewedError`
- [ ] T018 [P] Create `__tests__/unit/review-validation.test.ts` — Vitest tests for `FinalizeReviewSchema`: valid ACCEPTED + valid REJECTED pass; missing comment rejects; comment of exactly 9 chars rejects; comment of 10 chars passes; whitespace-only comment (trimmed < 10) rejects; invalid decision string rejects; missing ideaId rejects
- [ ] T019 [P] Create `__tests__/unit/user-validation.test.ts` — Vitest tests for `DisplayNameSchema`: empty string rejects; single char passes; 50 chars passes; 51 chars rejects; untrimmed spaces with valid content passes (trimmed); tests for `ChangePasswordSchema`: missing uppercase rejects; missing digit rejects; 7 chars rejects; 8 chars passes

### Integration Tests

- [ ] T020 Create `__tests__/integration/review-workflow.test.ts` — Vitest integration tests using `lib/db.ts` Prisma client against a test DB: seed idea → call `startReviewAction` → verify `IdeaReview` row created + `idea.status === UNDER_REVIEW` + `AuditLog` entry `IDEA_REVIEW_STARTED`; then call `finalizeReviewAction(ACCEPTED)` → verify `ideaReview.decision`, `decidedAt` set + `idea.status === ACCEPTED` + `AuditLog` `IDEA_REVIEWED`; separate test: `abandonReviewAction` by SUPERADMIN → `ideaReview` deleted + `idea.status === SUBMITTED` + `AuditLog` `IDEA_REVIEW_ABANDONED`; concurrency test: two concurrent `startReviewAction` calls for same idea → second throws (unique constraint)

### E2E Infrastructure

- [ ] T021 [P] Create `app/api/test/seed/route.ts` and `app/api/test/cleanup/route.ts` — both guarded by `if (process.env.NODE_ENV !== 'test') return NextResponse.json({ error: 'forbidden' }, { status: 403 })`; seed route accepts `{ runId }` body, creates deterministic users and ideas tagged with `runId` in a metadata field; cleanup route deletes all records tagged with `runId`
- [ ] T022 [P] Create `__tests__/e2e/helpers/auth.ts` — shared Playwright helper `loginAs(page, role)` that navigates to `/login`, fills credentials for a pre-seeded user of the given role, submits, awaits navigation to `/ideas`; export `ADMIN_CREDS`, `SUBMITTER_CREDS` constants
- [ ] T023 [P] Create `__tests__/e2e/helpers/seed.ts` — shared Playwright helper `seedTestData(request, runId)` and `cleanupTestData(request, runId)` using `apiRequestContext` to call the seed/cleanup routes from T021

### E2E Specs

- [ ] T024 Create `__tests__/e2e/auth.spec.ts` — E2E path (a): navigate to `/login` → fill credentials → submit → assert redirect to `/ideas` → assert nav shows user displayName; assert `/admin` shows 403/redirect when logged in as SUBMITTER
- [ ] T025 [P] Create `__tests__/e2e/idea-submission.spec.ts` — E2E path (b): login as SUBMITTER → navigate to `/ideas/new` → fill title, description, category → submit → assert redirect to `/ideas/<id>` → assert title and "Submitted" badge visible
- [ ] T026 Create `__tests__/e2e/review-workflow.spec.ts` — E2E path (c): seed idea (SUBMITTER) → login as ADMIN → open `/admin/review/<id>` → click "Start Review" → assert status badge becomes "Under Review" → type 15-char comment → click "Accept" → assert decision card shows "ACCEPTED", reviewer name, comment; then login as SUBMITTER → open `/ideas/<id>` → assert decision badge and reviewer info visible
- [ ] T027 [P] Create `__tests__/e2e/rbac.spec.ts` — E2E path (d): login as SUBMITTER → attempt to navigate to `/admin` → assert redirect to `/` or `/forbidden`; attempt POST to `/admin/review/<id>` via fetch → assert 401 or 403 response; verify `/settings` page IS accessible to SUBMITTER
- [ ] T028 Run `npm run test:coverage` and confirm output shows all four metrics (lines, branches, functions, statements) ≥80%; fix any gaps before marking done

---

## Phase 6: User Story 4 — Profile & Settings (Priority: P2)

**Goal**: Any authenticated user can update their display name and change their password from `/settings`.

**Independent Test**: Log in as any SUBMITTER → navigate to `/settings` → update display name → save → nav immediately reflects new name. Change password with valid current password and compliant new password → success toast → old password no longer works on next login attempt.

### Implementation

- [ ] T029 Create `lib/actions/update-display-name.ts` — Server Action: authenticate session → parse + validate with `DisplayNameSchema` → `prisma.user.update({ where: { id: session.userId }, data: { displayName: trimmedValue } })` → return `{ success: true }`; revalidate session/path if needed
- [ ] T030 [P] Create `lib/actions/update-password.ts` — Server Action: authenticate session → parse + validate with `ChangePasswordSchema` → `bcrypt.compare(currentPassword, user.hashedPassword)` → throw `InvalidCurrentPasswordError` if mismatch → `hashPassword(newPassword)` → `prisma.user.update(hashedPassword)` → return `{ success: true }`
- [ ] T031 [P] Create `components/settings/display-name-form.tsx` — client component; controlled input pre-filled with `session.user.displayName`; calls `updateDisplayNameAction` on submit; shows success toast on `{ success: true }`; shows inline error on failure; submit button disabled while pending
- [ ] T032 [P] Create `components/settings/password-change-form.tsx` — client component; three fields: current password, new password, confirm new password; client-side validation: new === confirm (else inline error before submit); calls `updatePasswordAction`; success toast; inline error for wrong current password or policy violation; clears form on success
- [ ] T033 Create `app/settings/page.tsx` — RSC; authenticated (any role — SUBMITTER, ADMIN, SUPERADMIN); role guard: redirect to `/login` if unauthenticated; render `<DisplayNameForm user={session.user} />` + `<PasswordChangeForm />` in a two-section layout

---

## Phase 7: User Story 5 — Analytics Dashboard (Priority: P3, flag-gated)

**Goal**: A SUPERADMIN with `FEATURE_ANALYTICS_ENABLED=true` can view charts showing category breakdowns, submission trends, and top contributors.

**Independent Test**: Set `FEATURE_ANALYTICS_ENABLED=true` → log in as SUPERADMIN → `/admin/analytics` loads with all three charts populated. Set flag to `false` → same URL returns 404. Log in as ADMIN (not SUPERADMIN) → `/admin/analytics` redirects to `/forbidden`.

### Implementation

- [ ] T034 [P] [US5] Create `components/analytics/ideas-by-category-chart.tsx` — client component using a charting library already in the stack; renders a bar chart of idea counts grouped by category; accepts `data: { category: string; count: number }[]`; empty state "No ideas submitted yet" when array is empty
- [ ] T035 [P] [US5] Create `components/analytics/submission-trend-chart.tsx` — client component; line chart of per-day submission counts for the rolling 30-day window; accepts `data: { date: string; count: number }[]`; empty state when all counts are zero
- [ ] T036 [P] [US5] Create `components/analytics/top-contributors-table.tsx` — server component; accepts `data: { displayName: string; count: number }[]` (up to 5 rows); renders a ranked table; when fewer than 5 users exist, renders only available rows; empty state "No submissions yet"
- [ ] T037 Create `app/admin/analytics/page.tsx` — RSC; check `process.env.FEATURE_ANALYTICS_ENABLED !== 'true'` → call `notFound()`; role guard: SUPERADMIN only (redirect to `/forbidden` for ADMIN); three parallel Prisma queries: `groupBy status+category` for bar chart, daily counts for trend, top-5 authors by count; render the three analytics components

---

## Phase 8: Polish & GA Gate

**Purpose**: Seed data, type safety, lint, build, and manual smoke — confirms the feature is production-ready.

- [ ] T038 Update `prisma/seed.ts` — add seed ideas with `UNDER_REVIEW`, `ACCEPTED`, and `REJECTED` statuses; add matching `IdeaReview` rows with `decision`, `comment`, `startedAt`, and `decidedAt` populated for the reviewed ideas; ensures local `npx prisma db seed` gives a realistic dashboard view
- [ ] T039 [P] Run `npm run type-check` — 0 TypeScript errors; fix any type errors introduced by nullable `IdeaReview.decision` / `IdeaReview.comment` fields before marking done
- [ ] T040 [P] Run `npm run lint` — 0 warnings (`--max-warnings 0`); fix any lint violations before marking done
- [ ] T041 Run `npm run build` — must pass with 0 errors; fix any build-time issues (e.g., missing env vars in `next.config`) before marking done
- [ ] T042 Manual smoke test on Vercel preview URL after branch deploy: start review → finalize → check admin dashboard counts updated → check `/settings` page loads for SUBMITTER role

---

## Dependencies

```
Phase 1 (T001–T003): No dependencies; T002 + T003 parallel after T001
Phase 2 (T004–T006): Depends on Phase 1 (T001 migration must be applied); T005 + T006 parallel with T004
Phase 3 (T007–T013): Depends on Phase 2; T007 sequential first; T008+T009+T010+T011+T012 parallel after T007; T013 last (depends on T010+T011+T012)
Phase 4 (T014–T016): Depends on Phase 2; T014+T015 parallel; T016 last (depends T014+T015)
Phase 5 (T017–T028): T017 depends on T004; T018+T019 parallel after T005+T006; T020 depends on T007+T008+T009; T021+T022+T023 parallel after Phase 3; T024 after T022+T023; T025+T027 parallel with T024; T026 after T024; T028 last (all tests must exist)
Phase 6 (T029–T033): Depends on Phase 2 only; T029 first; T030+T031+T032 parallel; T033 last
Phase 7 (T034–T037): Depends on Phase 2 only; T034+T035+T036 parallel; T037 last
Phase 8 (T038–T042): Depends on all prior phases; T038+T039+T040 parallel; T041 after T039+T040; T042 last
```

**Parallel opportunities per phase**:

| Phase | Parallelizable tasks                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------ |
| 1     | T002 + T003 parallel after T001                                                                        |
| 2     | T004 + T005 + T006 all parallel                                                                        |
| 3     | T008 + T009 + T010 + T011 + T012 parallel after T007; T013 sequential last                             |
| 4     | T014 + T015 parallel; T016 sequential last                                                             |
| 5     | T017 + T018 + T019 parallel; T021 + T022 + T023 parallel; T024 + T025 + T027 parallel; T026 after T024 |
| 6     | T030 + T031 + T032 parallel after T029; T033 sequential last                                           |
| 7     | T034 + T035 + T036 parallel; T037 sequential last                                                      |
| 8     | T038 + T039 + T040 parallel; T041 after; T042 last                                                     |

---

## Implementation Strategy

**MVP scope** (deliver US-012 + US-013 end-to-end first):

1. Complete Phase 1 + Phase 2 (`T001–T006`) — migration + state machine + schemas
2. Complete Phase 3 (`T007–T013`) — US-012 evaluation workflow end-to-end
3. Complete Phase 4 (`T014–T016`) — US-013 admin dashboard live
4. Complete Phase 5 (`T017–T028`) — US-016 test suite + CI gate enforced
5. Complete Phase 6 (`T029–T033`) — US-015 settings (P2)
6. Complete Phase 7 (`T034–T037`) — US-014 analytics (P3, flag-gated)
7. Complete Phase 8 (`T038–T042`) — polish + GA gate

**Total tasks**: 42 (T001–T042)

| Phase                          | Task count | Story         |
| ------------------------------ | ---------- | ------------- |
| Phase 1 — Setup                | 3          | Shared        |
| Phase 2 — Foundational         | 3          | Shared        |
| Phase 3 — Evaluation Workflow  | 7          | US-012        |
| Phase 4 — Admin Dashboard      | 3          | US-013        |
| Phase 5 — Test Suite & QA Gate | 12         | US-016        |
| Phase 6 — Profile & Settings   | 5          | US-015        |
| Phase 7 — Analytics            | 4          | US-014        |
| Phase 8 — Polish & GA Gate     | 5          | Cross-cutting |
