# Tasks: Idea Submission & Discovery

**Input**: `specs/002-idea-submission/` — plan.md, spec.md, research.md, data-model.md, contracts/ideas.md
**Branch**: `002-idea-submission`
**Stories**: US-008 (Submit Idea) · US-009 (Browse Ideas) · US-010 (Idea Detail) · US-011 (My Ideas)
**Organization**: Tasks grouped by user story — each phase is independently testable and deliverable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete-task dependencies)
- **[US#]**: User story this task belongs to
- **[Gap]**: Addresses a spec gap identified in the checklist

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies, configure env vars, and create the shared constants/validation layer that all user stories depend on.

- [ ] T001 Install `@vercel/blob` dependency in package.json
- [ ] T002 [P] Add `BLOB_READ_WRITE_TOKEN` env var to `.env.example` (with comment: required only when `FEATURE_FILE_ATTACHMENT_ENABLED=true`)
- [ ] T003 [P] Create `constants/categories.ts` — `CATEGORIES` array with `slug` + `label` pairs and `CategorySlug` type per data-model.md
- [ ] T004 [P] Create `constants/status-badges.ts` — status → Tailwind color-class map (`SUBMITTED=gray`, `UNDER_REVIEW=yellow`, `ACCEPTED=green`, `REJECTED=red`) per FR-015
- [ ] T031 Add `app/(main)/layout.tsx` if not already present — authenticated route group layout; wraps all idea pages with session check using the same pattern as the existing `(auth)` group; provides shared nav with links to `/ideas`, `/ideas/new`, `/my-ideas` _(prerequisite for T010, T019, T022, T029)_

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Database migration and shared infrastructure MUST be complete before any user story's API handlers or components can be built.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [ ] T005 Add `AuditLog` model, `AuditAction` enum, and `auditLogs` relation on `User` to `prisma/schema.prisma` per data-model.md
- [ ] T006 Run `npm run db:generate && npm run db:migrate --name add-idea-audit-log` to apply schema changes
- [ ] T007 [P] Create `lib/validations/idea.ts` — `CreateIdeaSchema`, `IdeaListQuerySchema`, and `CategorySlug` type per data-model.md §Zod Validation Schemas
- [ ] T008 Extend `lib/rate-limit.ts` with exported `ideaSubmitRateLimiter` factory using `Ratelimit.slidingWindow(1, '60 s')`, prefix `innovatepam:idea-submit`, in-memory fallback per research.md §R-003
- [ ] T032 [P] Add `lib/api-error.ts` — exports `apiError(status, message, extras?)` returning `NextResponse.json({ error, ...extras }, { status })`; used consistently across all idea route handlers _(prerequisite for T011, T017, T021, T024, T028)_

**Checkpoint**: Migration applied, Zod schemas + rate limiter ready, auth layout (T031) + error helper (T032) in place — user story implementation can now begin.

---

## Phase 3: User Story 1 — Submit an Idea (Priority: P1) 🎯 MVP

**Goal**: An authenticated employee fills the submission form and lands on the new idea's detail page with status "Submitted".

**Independent Test**: Log in as a SUBMITTER → navigate to `/ideas/new` → submit a valid form → verified redirect to `/ideas/<new-id>` showing correct title, category, "Submitted" badge. Second submit within 60 s returns a 429 error.

### Implementation

- [ ] T009 [P] [US1] Create `components/ideas/idea-form.tsx` — controlled form with Title (max 100, char counter), Description (max 2,000, char counter), Category (select from `CATEGORIES`), Visibility (Public/Private radio); submit button disabled after first click (FR-004); all validation inline per FR-008 using `CreateIdeaSchema`
- [ ] T010 [P] [US1] Create `app/(main)/ideas/new/page.tsx` — auth-guarded server component that renders `<IdeaForm />`; unauthenticated visitors redirected to login with `callbackUrl` preserved (FR-001)
- [ ] T011 [US1] Create `app/api/ideas/route.ts` — `POST` handler: authenticate session → check `ideaSubmitRateLimiter` (return 429 with `retryAfter` on fail) → parse + validate body with `CreateIdeaSchema` → create `Idea` record in DB → write `AuditLog` (`IDEA_CREATED`) → return `201` with `IdeaDetail` per contracts/ideas.md
- [ ] T012 [US1] Create `lib/actions/create-idea.ts` — Server Action wrapping `POST /api/ideas`; handles `application/json` path (flag off) and `multipart/form-data` path (flag on); on success returns `{ id }` for client-side redirect to `/ideas/<id>`
- [ ] T013 [US1] Extend `components/ideas/idea-form.tsx` with conditional file attachment field (rendered only when `FEATURE_FILE_ATTACHMENT_ENABLED=true`): accepts PDF, PNG, JPG, DOCX, MD; max 5 MB; client-side type + size validation with inline error per FR-005/FR-006/FR-008
- [ ] T014 [US1] Extend `app/api/ideas/route.ts` `POST` handler: when `FEATURE_FILE_ATTACHMENT_ENABLED=true` and `attachment` field present — upload to Vercel Blob via `put()`, store returned `url` in `Idea.attachmentPath`; on Blob upload failure save idea without attachment and include warning in response per edge case in spec §Edge Cases (FR-007)

---

## Phase 4: User Story 2 — Browse All Public Ideas (Priority: P1)

**Goal**: A logged-in employee sees a paginated newest-first feed of public ideas, filterable by category, with URL-reflected state.

**Independent Test**: Log in as SUBMITTER → open `/ideas` → ideas appear newest-first. Select "Cost Reduction" category filter → URL updates to `?category=cost-reduction` → only matching ideas shown. Navigate to page 2 → next 20 ideas load without full-page refresh. Empty filter state shows CTA.

### Implementation

- [ ] T015 [P] [US2] Create `components/ideas/idea-card.tsx` — renders title, author display name, category label, color-coded status badge (from `constants/status-badges.ts`), relative submission time ("2 hours ago" / date after 24 h); links to `/ideas/<id>` per FR-012
- [ ] T016 [P] [US2] Create `components/ideas/category-filter.tsx` — `<select>` populated from `CATEGORIES`; on change updates `?category=slug` in URL via `useRouter` (client component) per FR-013/R-007
- [ ] T017 [US2] Extend `app/api/ideas/route.ts` with `GET` handler: authenticate session → parse + validate `IdeaListQuerySchema` → apply visibility rules per role (SUBMITTER sees PUBLIC + own PRIVATE; ADMIN/SUPERADMIN see all) → filter by `category` if present → order by `createdAt DESC` → paginate with `skip`/`take` → return `{ data, meta }` per contracts/ideas.md §GET `/api/ideas`
- [ ] T018 [P] [US2] Create `components/ideas/idea-list.tsx` — renders grid of `<IdeaCard />` components; "Previous / Page X of Y / Next" pagination controls (disabled when at boundaries); empty state "No ideas found. Be the first to submit one!" with "Submit Idea" button per FR-014
- [ ] T019 [US2] Create `app/(main)/ideas/page.tsx` — server component; reads `page` and `category` from `searchParams`; fetches from `GET /api/ideas`; renders `<CategoryFilter />` + `<IdeaList />`; out-of-bounds page shows empty state (not 404) per R-006 + spec §Edge Cases

---

## Phase 5: User Story 3 — View Idea Detail (Priority: P1)

**Goal**: A logged-in employee can read a full idea, see its review outcome if reviewed, download an attachment if present, and (as author of a Submitted idea) delete it via a name-match safety modal.

**Independent Test**: Navigate directly to a public idea URL → all fields render. Navigate to a private idea as a non-owner SUBMITTER → 404. As the author of a SUBMITTED idea, open the delete modal, type wrong name → button stays disabled, type correct `displayName` → button enables, confirm → redirected to `/my-ideas`, idea gone.

### Implementation

- [ ] T020 [P] [US3] Create `components/ideas/idea-detail.tsx` — renders full idea fields (title, description, author, category, visibility, status badge, submission date); review card section (decision, reviewer name, date, comment) shown when `review !== null`; "Download Attachment" link shown when `attachmentUrl` present and flag on; "Attachment unavailable" fallback when URL exists but flag is off or URL is broken per FR-016/FR-017/FR-018
- [ ] T021 [US3] Create `app/api/ideas/[id]/route.ts` — `GET` handler: authenticate session → fetch idea by `id` → enforce visibility (PRIVATE + non-owner SUBMITTER → 404; non-existent → 404) → return `IdeaDetail` with nested `review` per contracts/ideas.md §GET `/api/ideas/[id]`
- [ ] T022 [US3] Create `app/(main)/ideas/[id]/page.tsx` — server component; fetches idea detail; renders `<IdeaDetail />`; passes current session user to component for delete affordance logic
- [ ] T023 [P] [US3] Create `components/ideas/delete-idea-modal.tsx` — Radix `<Dialog>`; text input with instructional copy "Type your display name to confirm"; "Confirm Delete" button stays disabled until input value === `session.user.displayName` (case-sensitive, trimmed); on confirm calls `deleteIdea` server action; handles loading + error state; Escape key closes; focus trap enforced by Radix per FR-019/R-001
- [ ] T024 [US3] Create `app/api/ideas/[id]/route.ts` — `DELETE` handler: authenticate → fetch idea → authorize (SUBMITTER: must be author AND `status=SUBMITTED`; ADMIN/SUPERADMIN: any idea) → `prisma.idea.delete()` (cascades to `IdeaReview`) → write `AuditLog` (`IDEA_DELETED`, metadata includes `ideaTitle`, `deletedByRole`) → do NOT delete blob → return `{ deleted: true, id }` per contracts/ideas.md §DELETE + FR-028
- [ ] T025 [US3] Create `lib/actions/delete-idea.ts` — Server Action wrapping `DELETE /api/ideas/[id]`; on success calls `redirect('/my-ideas')`; propagates 403/404 errors to caller per R-005
- [ ] T026 [P] [US3] Create `components/ideas/admin-delete-button.tsx` — Radix `<AlertDialog>` with "Delete Idea" trigger + "Are you sure?" body + "Delete" / "Cancel" actions for ADMIN/SUPERADMIN role (no name-match required) per R-005
- [ ] T027 [US3] Wire delete affordances into `components/ideas/idea-detail.tsx`: render `<DeleteIdeaModal />` when `isAuthor && status === 'SUBMITTED'`; render `<AdminDeleteButton />` when role is ADMIN/SUPERADMIN; hide delete entirely for author when status ≠ SUBMITTED per FR-019/FR-020

---

## Phase 6: User Story 4 — Track My Own Submissions (Priority: P1)

**Goal**: A logged-in employee sees only their own ideas (public and private) at `/my-ideas`, ordered newest-first, with empty state when none exist.

**Independent Test**: Log in as employee A → open `/my-ideas` → only A's ideas appear (both public and private). Log in as employee B → B's ideas show; A's ideas absent. Employee with zero submissions sees empty state with "Submit Your First Idea" CTA.

### Implementation

- [ ] T028 [US4] Create `app/api/ideas/mine/route.ts` — `GET` handler: authenticate session → fetch all `Idea` records where `authorId === session.userId` → order by `createdAt DESC` → no pagination → return `{ data: IdeaSummary[] }` per contracts/ideas.md §GET `/api/ideas/mine`; enforce auth (FR-027)
- [ ] T029 [P] [US4] Create `app/(main)/my-ideas/page.tsx` — server component; fetches from `GET /api/ideas/mine`; renders list of `<IdeaCard />` components; empty state "You haven't submitted any ideas yet." with "Submit Your First Idea" button linking to `/ideas/new` per FR-023/FR-024/FR-025

---

## Phase 7: Polish & Cross-cutting Concerns

**Purpose**: Wires up remaining edge cases, accessible defaults, and developer ergonomics.

- [ ] T030 [P] Update `prisma/seed.ts` — add seed ideas with varied statuses (`SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`), categories, and visibilities (`PUBLIC`, `PRIVATE`) for local development

---

## Dependencies

```
Phase 1 (T001–T004, T031): No dependencies — T002/T003/T004/T031 parallel after T001
Phase 2 (T005–T008, T032): Depends on Phase 1; T032 parallel with T007+T008 after T006
Phase 3 (T009–T014): Depends on Phase 2; T013 depends on T009 (same file — not parallel); T011 depends on T032 (error helper)
Phase 4 (T015–T019): Depends on Phase 2; T015 depends on T004; T017 depends on T011 (same route.ts file)
Phase 5 (T020–T027): Depends on Phase 2; T027 depends on T022 + T023 + T026
Phase 6 (T028–T029): Depends on Phase 2 only (no Phase 3–5 dependency)
Phase 7 (T030): Can run any time after Phase 2
```

**Parallel opportunities per phase**:

| Phase | Parallelizable tasks                                                                            |
| ----- | ----------------------------------------------------------------------------------------------- |
| 1     | T002, T003, T004, T031 all parallel after T001                                                  |
| 2     | T007 + T008 + T032 in parallel after T006                                                       |
| 3     | T009 + T010 parallel; T013 after T009 (sequential — same file); T011 then T012                  |
| 4     | T015 + T016 + T018 parallel; T017 after T011 (same file); T019 after T017                       |
| 5     | T020 + T023 + T026 parallel; T021 then T022; T024 then T025; T027 last (depends T022+T023+T026) |
| 6     | T028 + T029 parallel                                                                            |
| 7     | T030 solo                                                                                       |

---

## Implementation Strategy

**MVP scope** (deliver US1 end-to-end first):

1. Complete Phase 1 + Phase 2 (`T001–T008`)
2. Complete Phase 3 (`T009–T014`) — US-008 fully functional
3. Complete Phase 4 (`T015–T019`) — US-009 fully functional; ideas can be browsed
4. Complete Phase 5 (`T020–T027`) — US-010 fully functional; detail + delete work
5. Complete Phase 6 (`T028–T029`) — US-011 fully functional; personal view works
6. Complete Phase 7 (`T030`) — seed data polish

**Total tasks**: 32 (T001–T032)

| Phase                  | Task count | Story         |
| ---------------------- | ---------- | ------------- |
| Phase 1 — Setup        | 5          | Shared        |
| Phase 2 — Foundational | 5          | Shared        |
| Phase 3 — Submit Idea  | 6          | US-008        |
| Phase 4 — Browse Ideas | 5          | US-009        |
| Phase 5 — Idea Detail  | 8          | US-010        |
| Phase 6 — My Ideas     | 2          | US-011        |
| Phase 7 — Polish       | 1          | Cross-cutting |
