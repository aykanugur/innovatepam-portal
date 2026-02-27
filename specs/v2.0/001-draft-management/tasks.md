# Tasks: Draft Management

**Input**: `specs/001-draft-management/`  
**Branch**: `001-draft-management`  
**Plan**: [plan.md](./plan.md) | **Spec**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md)  
**Contracts**: [save-draft.md](./contracts/save-draft.md) | [expire-cron.md](./contracts/expire-cron.md)  
**Quickstart**: [quickstart.md](./quickstart.md)

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Parallelisable — operates on different files, no dependency on in-progress tasks
- **[US#]**: User story label (Phase 3+)
- All paths relative to `innovatepam-portal/`

---

## Dependencies Between User Stories

```
Phase 2 (Foundational)
  └─► US1 (Save Draft)          ← must complete before US3, US4
        └─► US2 (Drafts Tab)   ← can start in parallel with US1 after Foundational
        └─► US3 (Submit)       ← requires US1 (save-draft.ts exists)
              └─► US4 (Limit)  ← UI extension of US1 form
              └─► US5 (Expiry) ← extends US2 Drafts Tab + new cron route
```

US2 and US1 can proceed in parallel once the Foundational phase is done (they touch different files). US3 depends on the `saveDraft` action existing. US4 and US5 are purely additive.

---

## Parallel Execution Guide (per story)

| Story        | Parallelisable pairs                                 |
| ------------ | ---------------------------------------------------- |
| Foundational | T006 + T007 + T008 + T009 (all different files)      |
| US1          | T011 in parallel with T012 if split across engineers |
| US2          | T015 (component) in parallel with T016 (page)        |
| US5          | T024 (cron handler) + T025 (vercel.json) in parallel |
| Polish       | T026 + T027 + T028 simultaneously                    |

---

## Phase 1: Setup

**Purpose**: Schema migration, Prisma client regeneration, and shadcn/ui Tabs installation.  
**⚠️ CRITICAL**: T001–T005 must be fully complete before any implementation task begins. Type errors from nullable fields will propagate immediately.

- [x] T001 Update `prisma/schema.prisma` — add `DRAFT` to `IdeaStatus` enum, add `DRAFT_SAVED`/`DRAFT_DELETED`/`DRAFT_SUBMITTED` to `AuditAction` enum, make `title`/`description`/`category` nullable (`String?`), add `draftExpiresAt DateTime?`, `isExpiredDraft Boolean @default(false)`, `softDeletedAt DateTime?` to `Idea` model, add two new `@@index` entries per data-model.md §1.3
- [x] T002 Create `prisma/migrations/20260226_draft_management/migration.sql` with the complete SQL block from data-model.md §2 (DO NOT skip — needed for migration history and Prisma diff tracking)
- [x] T003 Apply the SQL from T002 manually via Neon dashboard SQL editor, then run verification queries from data-model.md §2 to confirm all enum values and columns exist
- [x] T004 Run `npx prisma generate` inside `innovatepam-portal/` to regenerate the Prisma client from the updated `prisma/schema.prisma`
- [x] T005 Install shadcn/ui Tabs by running `npx shadcn@latest add tabs` inside `innovatepam-portal/` — verify `components/ui/tabs.tsx` is created

**Checkpoint**: `npx tsc --noEmit` can now be run (expect errors at callsites — they'll be fixed in Polish phase). `components/ui/tabs.tsx` exists.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that all user stories depend on.  
**⚠️ CRITICAL**: No user story phase can begin until this phase is complete. All four tasks are independent and can run in parallel (different files).

- [x] T006 [P] Extend `lib/state-machine/idea-status.ts` — add `'DRAFT'` to the `IdeaStatus` union type, add `'SUBMIT'` to the `ReviewAction` union type, add `case 'DRAFT': if (action === 'SUBMIT') return 'SUBMITTED'; throw new InvalidTransitionError(current, action)` to the `transition()` function, keep `default: satisfies never` exhaustiveness check intact (data-model.md §3)
- [x] T007 [P] Add `FEATURE_DRAFT_ENABLED: z.string().default('false')` and `CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters')` to `lib/env.ts`, then add both variables to `.env.local` (use `openssl rand -base64 32` for CRON_SECRET value)
- [x] T008 [P] Add `createDraftSaveLimiter()` factory to `lib/rate-limit.ts` using the existing `createInMemoryLimiter()` pattern — LIMIT=30, WINDOW_MS=15*60*1000 — and export a `draftSaveLimiter` singleton (research.md Decision 6; contracts/save-draft.md §7)
- [x] T009 [P] Create `lib/validations/draft.ts` with `SaveDraftSchema` — all fields optional/nullable, `title` max 150, `description` max 5000, `id` as optional cuid, `visibility` as optional enum; export `SaveDraftInput` type (data-model.md §4)

**Checkpoint**: State machine tests pass. `lib/env.ts` compiles with new vars. `draftSaveLimiter` importable. `SaveDraftSchema` importable.

---

## Phase 3: User Story 1 — Save Idea as Draft Mid-Form (Priority: P1) 🎯 MVP

**Goal**: Any authenticated user can click "Save Draft" and retrieve their partial work from the Drafts tab.  
**Independent Test**: Navigate to `/ideas/new`, fill only the title, click "Save Draft" → success toast → navigate away → `/my-ideas` Drafts tab → "Resume" → title field pre-populated.

- [x] T010 [US1] Create `lib/actions/save-draft.ts` — implement `saveDraft(input: SaveDraftInput)` Server Action with: auth check, feature flag check (`FEATURE_DRAFT_ENABLED`), rate limit check (`draftSaveLimiter`), Zod validation, 10-draft-limit check (count where `status='DRAFT' AND isExpiredDraft=false AND draftExpiresAt > now()`), upsert logic (create when no `id`, update + reset `draftExpiresAt` to `addDays(now(), 90)` when `id` present), audit log `DRAFT_SAVED`, return `{ draftId }` or typed `{ error, code }` per contracts/save-draft.md §1–§6
- [x] T011 [P] [US1] Create `lib/actions/delete-draft.ts` — implement `deleteDraft(draftId: string)` Server Action with: auth check, ownership + `status='DRAFT'` verification, `db.idea.delete()`, audit log `DRAFT_DELETED`, return `{ success: true }` or `{ error, code }` per contracts/save-draft.md §8
- [x] T012 [US1] Modify `components/ideas/idea-form.tsx` — add "Save Draft" button that calls `saveDraft()`, disables with "Saving…" text during in-flight request, re-enables on completion, shows success toast on `{ draftId }` and error toast on `{ error }`, receives `draftId?: string` prop (undefined = new, string = editing existing)
- [x] T013 [US1] Add 60-second localStorage auto-save to `components/ideas/idea-form.tsx` — `useEffect` with `setInterval(60000)` writing `{ ...fields, timestamp: Date.now() }` to key `draft_autosave_{userId}_{draftId}` (only when `draftId` is available after first save); do NOT auto-save until a draft exists server-side
- [x] T014 [US1] Create `app/(main)/ideas/[id]/edit/page.tsx` — Server Component: fetch idea by id, verify `session.user.id === idea.authorId && idea.status === 'DRAFT'`, call `notFound()` otherwise, pass all draft fields to `idea-form.tsx`; read `localStorage` key on client to detect newer local snapshot and show inline restore banner ("We found unsaved changes. Restore them?" with Yes/No buttons — NOT a toast, does not auto-apply)

**Checkpoint**: US1 complete — save-resume cycle works end-to-end.

---

## Phase 4: User Story 2 — Drafts Tab on My Ideas (Priority: P2)

**Goal**: `/my-ideas` has a "Submitted" tab and a "Drafts" tab; users see draft metadata and can Resume or Delete.  
**Independent Test**: With one saved draft, visit `/my-ideas`, see the Drafts tab with count badge, verify row shows title/category/relative time, Resume navigates to edit form, Delete opens confirmation modal.

- [x] T015 [US2] Create `components/ideas/drafts-tab.tsx` — renders list of active drafts (props: `drafts: DraftRow[]`); each row shows: title (or "Untitled Draft" when null/empty), category (or "No category"), relative last-saved time (`formatDistanceToNow` from `date-fns`); "Resume" button navigates to `/ideas/{id}/edit`; "Delete" button opens `AlertDialog` with exact strings: title "Delete Draft?" body "This action cannot be undone." buttons "Cancel" (outline) / "Delete" (destructive); on confirm calls `deleteDraft()`, removes row, clears `localStorage` key `draft_autosave_{userId}_{id}`; empty state message per spec US2 scenario 3; badge hidden when count is 0, `aria-label="{N} active drafts"` when > 0
- [x] T016 [US2] Redesign `app/(main)/my-ideas/page.tsx` — replace flat list with shadcn/ui `<Tabs>` layout; "Submitted" tab renders existing ideas list; "Drafts" tab renders `<DraftsTab>`; fetch submitted ideas + active drafts in parallel (`Promise.all`); active drafts query: `status='DRAFT' AND isExpiredDraft=false AND draftExpiresAt > now()` ordered by `updatedAt desc`; pass feature flag value to `DraftsTab` for read-only mode; page is a Server Component (async)

**Checkpoint**: US2 complete — `/my-ideas` has working tabs, badge, resume, and delete.

---

## Phase 5: User Story 3 — Submit a Draft as a Real Idea (Priority: P2)

**Goal**: Author fills all required fields on the draft edit form and submits it into the standard review pipeline.  
**Independent Test**: Resume a draft with all required fields filled, click "Submit", verify idea appears in submitted list and no longer appears on Drafts tab.

- [x] T017 [US3] Create `lib/actions/submit-draft.ts` — implement `submitDraft(draftId: string, formData: SubmitIdeaInput)` Server Action: auth check, ownership + `status='DRAFT'` check (lazy expiry: reject if `draftExpiresAt < now()`), full required-field Zod validation (title, description, category required), `db.idea.update({ status: 'SUBMITTED', draftExpiresAt: null })` using `transition()` from state machine, audit log `DRAFT_SUBMITTED`, return `{ ideaId }` on success; attachment records remain via existing FK — no extra action (contracts/save-draft.md §9)
- [x] T018 [US3] Add "Submit" button to `app/(main)/ideas/[id]/edit/page.tsx` — calls `submitDraft()`, shows full Zod validation errors inline on failure, redirects to `/ideas/[id]` with success toast on `{ ideaId }`; "Submit" button absent when feature flag is off (read-only mode condition from FR-014)

**Checkpoint**: US3 complete — draft-to-submitted flow works end-to-end; submitted idea visible in admin queue.

---

## Phase 6: User Story 4 — Draft Limit Enforcement (Priority: P3)

**Goal**: Users at the 10-draft limit see the "Save Draft" button disabled with explanatory tooltip; server-side enforcement is already in `saveDraft()`.  
**Independent Test**: With exactly 10 active drafts, visit `/ideas/new` — "Save Draft" button is visually disabled with tooltip text matching FR-003.

- [x] T019 [US4] Fetch active draft count for the current user in `app/(main)/ideas/new/page.tsx` (or equivalent new-idea page) and pass it as a prop to `components/ideas/idea-form.tsx`; query: `count where status='DRAFT' AND isExpiredDraft=false AND draftExpiresAt > now() AND authorId=userId`
- [x] T020 [US4] Add client-side disabled state to the "Save Draft" button in `components/ideas/idea-form.tsx` — when `draftCount >= 10`, disable button and render tooltip (shadcn `Tooltip`): "You have reached the maximum of 10 drafts. Please submit or delete a draft to continue." (exact text from FR-003)

**Checkpoint**: US4 complete — limit enforced both in UI (disabled button) and server (T010's pre-condition check in `saveDraft()`).

---

## Phase 7: User Story 5 — Draft Expiry (Priority: P3)

**Goal**: Expired drafts appear in a read-only "Expired Drafts" section; daily cron soft-deletes and then hard-deletes them.  
**Independent Test**: Set `draftExpiresAt` to a past date on a test draft, refresh Drafts tab — draft moves to "Expired Drafts" section; Resume button absent. Call cron endpoint with valid `CRON_SECRET` — returns `{ softDeleted, hardDeleted, durationMs }`.

- [x] T022 [US5] Add "Expired Drafts" collapsed section to `components/ideas/drafts-tab.tsx` — fetch expired drafts (separate prop: `expiredDrafts: DraftRow[]`; sorted by `draftExpiresAt` asc per FR-004); collapsible with shadcn `Collapsible`; rows are read-only (no Resume/Submit button); "Delete" button still available (FR-006); empty state hides the section entirely
- [x] T023 [US5] Add expiry warning banner to `app/(main)/ideas/[id]/edit/page.tsx` — when `draftExpiresAt - now() < 7 days`, show inline banner: "This draft will expire on {formatted date}. Submit it to keep it permanently." (FR-012); use `date-fns` `format` for the date
- [x] T024 [US5] Create `app/api/cron/expire-drafts/route.ts` — full GET handler per contracts/expire-cron.md §6: Bearer token auth against `env.CRON_SECRET`, soft-delete (`updateMany` where `status='DRAFT' AND isExpiredDraft=false AND draftExpiresAt < now()`), hard-delete (`deleteMany` where `isExpiredDraft=true AND softDeletedAt < now()-30d`), structured `console.log` on every run (even when counts are 0), return `{ softDeleted, hardDeleted, durationMs }` on 200, `{ error: 'Unauthorized' }` on 401, `{ error: 'Internal server error' }` on 500 (contracts/expire-cron.md)
- [x] T025 [P] [US5] Create or update `vercel.json` at `innovatepam-portal/vercel.json` — add `"crons": [{ "path": "/api/cron/expire-drafts", "schedule": "0 2 * * *" }]`; merge with existing content if file already exists

**Checkpoint**: US5 complete — expired drafts are displayed as read-only; cron endpoint callable; `vercel.json` schedules nightly run.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: TypeScript correctness, admin queue exclusion, accessibility, regression verification.

- [x] T026 [P] Fix all nullable `title`/`description`/`category` TypeScript callsites surfaced by `npx tsc --noEmit` — add `?? 'Untitled Draft'`, `?? ''`, `?? 'No category'` fallbacks in: `components/ideas/idea-card.tsx`, `components/admin/decision-card.tsx`, `components/admin/pending-queue.tsx`, and any other files listed in data-model.md §7; aim for zero `tsc` errors
- [x] T027 [P] Add `'DRAFT'` case to `constants/status-badges.ts` and any other status switch / map in the codebase (`grep -r "IdeaStatus\|SUBMITTED\|UNDER_REVIEW" --include="*.ts" --include="*.tsx"`) — ensure no `default: satisfies never` path is hit at runtime with a DRAFT-status idea
- [x] T028 [P] Add ARIA labels and keyboard navigation for FR-018 — `aria-label="{N} active drafts"` on the Drafts tab count badge in `components/ideas/drafts-tab.tsx`; verify Tab/Enter/Escape keyboard navigation through Tabs, Resume button, Delete button, confirm dialog; ensure focus returns to Drafts tab trigger after a draft is deleted
- [x] T029 Verify admin review queue DB queries in `app/api/admin/` and `app/admin/` explicitly exclude `status = 'DRAFT'` at the Prisma query level (FR-013 defence-in-depth) — add `status: { not: 'DRAFT' }` or `status: { in: ['SUBMITTED', 'UNDER_REVIEW'] }` clause where missing; do NOT rely on application-layer filtering only
- [x] T030 Run full test suite — `pnpm test:unit` (Vitest) and `pnpm test:e2e` (Playwright) — fix any regressions introduced by nullable fields, new enum values, or my-ideas page redesign; confirm SC-007 (state machine rejects all invalid DRAFT transitions) and SC-008 (zero regressions on existing workflows)

**Final checkpoint**: `npx tsc --noEmit` exits 0. All tests pass. Cron endpoint returns 200. Firefox/Chrome keyboard navigation on Drafts tab works.

---

## Implementation Strategy

**Suggested MVP scope (deliver first)**: Phase 1 + Phase 2 + Phase 3 (T001–T014).

This gives a fully working save-and-resume cycle. Phases 4–7 are additive and independently testable.

**Incremental delivery order**:

1. T001–T005 (no code merged until DB is migrated and client regenerated)
2. T006–T009 in parallel (pure infrastructure — no UI)
3. T010–T014 (US1 — core value proposition)
4. T015–T016 (US2 — must complete before US3 is visible)
5. T017–T018 (US3)
6. T019–T020 (US4)
7. T022–T025 (US5)
8. T026–T030 (Polish — run at end of each story if possible)

---

## Summary

| Metric               | Value                  |
| -------------------- | ---------------------- |
| Total tasks          | 30                     |
| Setup tasks          | 5 (T001–T005)          |
| Foundational tasks   | 4 (T006–T009)          |
| US1 tasks            | 5 (T010–T014)          |
| US2 tasks            | 2 (T015–T016)          |
| US3 tasks            | 2 (T017–T018)          |
| US4 tasks            | 2 (T019–T020)          |
| US5 tasks            | 4 (T022–T025)          |
| Polish tasks         | 5 (T026–T030)          |
| Parallelisable tasks | 15 marked `[P]`        |
| Suggested MVP        | Phases 1–3 (T001–T014) |
