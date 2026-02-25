# Epic: Draft Management

**Epic ID**: EPIC-V2-03
**Owner**: Aykan Uğur — Admin
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Target Release**: V2.0 Phase 4 (~30 min)
**PRD Reference**: [specs/v2.0/prd-v2.0.md](../prd-v2.0.md) — Section 7

---

## 1. Summary

Add a `DRAFT` status to the idea lifecycle, allowing submitters to save an incomplete idea server-side and return to it later. Drafts are exclusively visible to their author, expire after 90 days of inactivity, and are limited to 10 per user. The `/my-ideas` page gains a dedicated "Drafts" tab. A resumed draft opens the submission form pre-populated. Clicking "Submit" on a draft triggers full validation and transitions the idea into the standard evaluation pipeline. The `IdeaStatus` state machine is extended to include `DRAFT → SUBMITTED` as the new entry transition.

---

## 2. Business Context

### 2.1 Strategic Alignment

- **Company Goal**: Reduce idea submission friction and increase the quality of submitted ideas in V2.0.
- **Product Vision Fit**: Without drafts, any interruption during form filling results in total loss. This penalises complex, high-quality submissions — exactly the ideas the platform most needs to capture.

### 2.2 Business Value

| Value Driver               | Description                                                           | Estimated Impact                                                    |
| -------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Submission recovery        | Employees interrupted mid-form can resume rather than restart         | Reduces drop-off on complex categories (e.g. "New Product/Service") |
| Submission quality         | More time to refine → richer descriptions and complete dynamic fields | Improves review efficiency downstream                               |
| Draft-to-submit conversion | V2.0 Success Metric: ≥ 60% of drafts are eventually submitted         | Tangible engagement signal for the innovation programme             |

### 2.3 Cost of Delay

Without drafts, employees with demanding schedules consistently abandon partially-written ideas. The more structured and category-specific V2.0 forms become (Phase 2), the more this problem compounds — longer forms produce more drop-off without a save mechanism.

---

## 3. Scope

### 3.1 In Scope

- `DRAFT` added to `IdeaStatus` enum (before `SUBMITTED`)
- `draftExpiresAt DateTime?` added to the `Idea` model (set to `now() + 90 days` on draft creation; null for all other statuses)
- State machine updated: `DRAFT → SUBMITTED` added as the sole new valid transition
- `domain/glossary.md` state machine diagram updated (per PRD note)
- "Save Draft" button on `/ideas/new` — saves without required-field validation; only enforces length caps to prevent abuse
- "Drafts" tab on `/my-ideas` — lists the user's `DRAFT` ideas; shows title (or "Untitled Draft" if empty), category, and last-saved date
- Resuming a draft: opens `/ideas/[id]/edit` pre-populated with all saved field values (including dynamic fields)
- Submitting a draft: full validation runs; on success, status transitions to `SUBMITTED` and idea enters review pipeline
- Draft limit: max 10 active drafts per user; "Save Draft" button is disabled at the limit with a tooltip
- Draft expiry: soft-delete at 90-day inactivity (via a cron job or Vercel Cron); "Expired Drafts" section visible only to the author; hard deletion 30 days after soft-delete
- Discarding a draft: author can permanently delete from the Drafts tab; irreversible; confirmation modal required
- `localStorage` auto-save client-side fallback (every 60 seconds) — supplements server-side save; does not replace it
- Feature flag: `FEATURE_DRAFT_ENABLED` (default `false`)

### 3.2 Out of Scope

- Admin visibility of draft ideas (deferred to V3.0)
- Server-side auto-save (periodic background server saves without user action) — only client-side `localStorage` fallback in V2.0
- Optimistic locking / conflict resolution for concurrent edits on the same draft from two browser tabs
- Draft sharing or collaboration
- Draft analytics (e.g., conversion funnel metrics) — deferred to V3.0

### 3.3 Assumptions

- The existing state machine enforcer in `lib/state-machine/` is the canonical gatekeeper for all `IdeaStatus` transitions; it must be updated as part of this epic before any draft-related Server Actions are wired
- `draftExpiresAt` is set server-side (never trusted from the client)
- Vercel Cron (or equivalent) is available for the expiry job; if not, expiry runs lazily on first request after the deadline
- `FEATURE_DRAFT_ENABLED=false` in production until QA sign-off

---

## 4. User Personas

| Persona            | Role                          | Primary Need                                                                      |
| ------------------ | ----------------------------- | --------------------------------------------------------------------------------- |
| Elif (Submitter)   | EPAM employee — busy schedule | Save a partially written idea and resume it that evening without losing any work  |
| Aykan (Superadmin) | Portal owner                  | Ensure drafts never enter the admin review queue; enforce expiry to keep DB clean |

---

## 5. Feature Breakdown

### Feature 1: `IdeaStatus` Enum Extension & State Machine Update — Must Have

**Description**: Add `DRAFT` to the `IdeaStatus` Prisma enum. Add `draftExpiresAt DateTime?` to the `Idea` model. Update the state machine enforcer in `lib/state-machine/` to permit `DRAFT → SUBMITTED` and explicitly block all other transitions from `DRAFT`.

**User Stories**:

- [ ] As the system, when an idea is created with "Save Draft," its status is `DRAFT` and `draftExpiresAt` is set to 90 days from now.
- [ ] As the system, a `DRAFT` idea cannot transition to `UNDER_REVIEW`, `ACCEPTED`, or `REJECTED` — only to `SUBMITTED`.
- [ ] As the system, attempting to start a review on a `DRAFT` idea returns `400 Bad Request`: "Draft ideas cannot be reviewed."

**Acceptance Criteria**:

1. `prisma migrate dev` applies cleanly; `IdeaStatus` enum contains `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED` in that order
2. `Idea` table gains a nullable `draftExpiresAt` column; all existing rows have `NULL` for this column
3. State machine enforcer rejects `DRAFT → UNDER_REVIEW` / `ACCEPTED` / `REJECTED` with a typed error
4. State machine enforcer permits `DRAFT → SUBMITTED`
5. The admin review queue Server Action filters out `DRAFT` status at the query level (not only in the UI)
6. All existing switch statements on `IdeaStatus` in the codebase handle the new `DRAFT` case without TypeScript exhaustiveness errors

**Estimated Effort**: S (~8 min)

---

### Feature 2: "Save Draft" Action on Submission Form — Must Have

**Description**: Add a "Save Draft" secondary button to `/ideas/new` alongside the existing "Submit" button. On click, saves the current form state server-side as a `DRAFT` idea without running required-field validation. Returns the new draft's `id` to the client for future resume navigation.

**User Stories**:

- [ ] US-V2-03-a: As a submitter mid-way through filling in an idea, I click "Save Draft" and see a success toast: "Draft saved. You can continue later from My Ideas."
- [ ] US-V2-03-b: As a submitter who has already saved a draft once, saving again updates the existing `DRAFT` record in place (upsert by id).
- [ ] US-V2-03-c: As a submitter who already has 10 active drafts, the "Save Draft" button is disabled with tooltip: "You have reached the maximum of 10 drafts. Please submit or delete a draft to continue."
- [ ] US-V2-03-d: As a submitter with `FEATURE_DRAFT_ENABLED=false`, the "Save Draft" button is not visible.

**Acceptance Criteria**:

1. Clicking "Save Draft" does not run required-field validation — title may be empty
2. Title length cap: max 150 chars (to prevent abuse); exceeding this returns `422` with: "Title cannot exceed 150 characters."
3. Description length cap: max 5,000 chars; same treatment
4. A new `DRAFT` Idea row is created on first save; subsequent saves from the same form session update the existing row
5. `draftExpiresAt` is set server-side to `new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)` on creation and reset on each update
6. Server returns the draft `id`; client updates the browser URL to `/ideas/[id]/edit` (or stores id in state) to enable subsequent upserts
7. At 10 active drafts (`status=DRAFT` count for this user), the "Save Draft" button is disabled before the request is made; server also enforces the limit and returns `422` if bypassed
8. With `FEATURE_DRAFT_ENABLED=false`, the button is absent from the DOM — no fallback rendering

**Estimated Effort**: S (~10 min)

---

### Feature 3: Drafts Tab on `/my-ideas` — Must Have

**Description**: Add a "Drafts" tab to the `/my-ideas` page showing the authenticated user's `DRAFT` ideas. Each row shows the title (or "Untitled Draft"), category (or "No category"), and last-saved date. Actions: "Resume" (opens edit form) and "Delete" (with confirmation modal).

**User Stories**:

- [ ] US-V2-03-e: As a submitter visiting `/my-ideas`, I see a "Drafts" tab with a count badge showing my active draft count.
- [ ] US-V2-03-f: As a submitter on the Drafts tab, I see each draft listed with its title (or "Untitled Draft"), category, and how long ago it was last saved.
- [ ] US-V2-03-g: As a submitter, I click "Resume" on a draft and am taken to `/ideas/[id]/edit` with all previously saved values pre-populated.
- [ ] US-V2-03-h: As a submitter, I click "Delete" on a draft, see a confirmation modal: "Are you sure you want to permanently delete this draft? This cannot be undone." and on confirm, the draft is removed.
- [ ] US-V2-03-i: As a submitter with no active drafts, the Drafts tab shows: "No drafts saved. Start a new idea and save it as a draft to see it here."

**Acceptance Criteria**:

1. Drafts tab renders only `DRAFT` ideas belonging to the authenticated user — no other users' drafts are ever returned
2. Tab count badge reflects the exact number of active (non-expired) drafts
3. Draft rows are sorted by `updatedAt` descending (most recently saved first)
4. "Untitled Draft" is shown when `title` is null or empty string
5. "No category" is shown when `category` is null or empty string
6. Expired drafts (soft-deleted) are shown in a collapsible "Expired Drafts" section below the active list, not mixed in
7. "Delete" action opens a modal; on confirm, calls the delete Server Action; on cancel, no change occurs
8. After deletion, the Drafts tab list updates without a full page reload (optimistic remove or revalidation)

**Estimated Effort**: S (~7 min)

---

### Feature 4: Resume Draft — Edit Form Pre-population — Must Have

**Description**: `GET /ideas/[id]/edit` renders the submission form pre-populated with all saved field values from the `DRAFT` idea: title, description, category, visibility, dynamic fields (if Feature 1 of EPIC-V2-01 is enabled), and staged attachment references (if EPIC-V2-02 is enabled).

**User Stories**:

- [ ] US-V2-03-j: As a submitter opening a resumed draft, every field I previously saved appears pre-filled in the form.
- [ ] US-V2-03-k: As a non-author attempting to navigate to `/ideas/[id]/edit` for another user's draft, I receive `404 Not Found` (not `403` — prevents enumeration).
- [ ] US-V2-03-l: As a submitter opening an expired draft, I see: "This draft has expired and can no longer be edited." and the form is read-only.

**Acceptance Criteria**:

1. `/ideas/[id]/edit` is only accessible to the authenticated author of the draft — any other session returns `404`
2. All previously saved field values are pre-populated in the controlled form state on load
3. Dynamic fields pre-populate based on the saved `dynamicFields` JSON object and the category's field template
4. Submitting from the edit form runs full validation; on success, status transitions from `DRAFT → SUBMITTED`; user is redirected to `/ideas/[id]` with a toast: "Idea submitted successfully."
5. An expired draft renders a read-only view with the expiry message; "Save Draft" and "Submit" buttons are absent
6. A non-existent `id` or wrong-owner `id` returns `404` — server does not distinguish between "not found" and "not your draft"

**Estimated Effort**: S (~8 min)

---

### Feature 5: Draft Expiry & Cleanup — Should Have

**Description**: Implement draft expiry: soft-delete `DRAFT` ideas where `draftExpiresAt < now()`, surface expired drafts to the author in a collapsed section, and hard-delete those that have been soft-deleted for > 30 days. Expiry runs via a Vercel Cron job (or lazily on first request).

**User Stories**:

- [ ] US-V2-03-m: As a submitter whose draft has passed its 90-day expiry, I see it moved to the "Expired Drafts" section on the Drafts tab — it is no longer active and cannot be submitted.
- [ ] US-V2-03-n: As the system, 30 days after a draft is soft-deleted (expired), it is permanently removed from the database.

**Acceptance Criteria**:

1. A Vercel Cron job (or equivalent) runs at least once daily; it sets `status = EXPIRED` (or a soft-delete flag) on all `DRAFT` ideas where `draftExpiresAt < now()`
2. Expired drafts appear in a collapsible "Expired Drafts" section on `/my-ideas` — they cannot be resumed or submitted
3. Expired drafts are hard-deleted 30 days after expiry via the same cron job
4. `draftExpiresAt` is reset to `now() + 90 days` each time the draft is saved — activity resets the clock
5. If Vercel Cron is unavailable, expiry is enforced lazily: the edit form and save Server Action check `draftExpiresAt` on each request and treat the draft as expired if the date has passed

**Estimated Effort**: S (~5 min)

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)

| Dependency                                                                              | Type | Status   | Risk                                                                         |
| --------------------------------------------------------------------------------------- | ---- | -------- | ---------------------------------------------------------------------------- |
| EPIC-01 (Foundation) — Prisma, DB, state machine infrastructure in `lib/state-machine/` | V1   | Complete | None                                                                         |
| EPIC-03 (Idea Submission) — `/ideas/new` form, Server Action, and `/my-ideas` page      | V1   | Complete | None                                                                         |
| EPIC-V2-01 (Smart Forms) — `dynamicFields` on `Idea`                                    | V2.0 | Parallel | Low — draft can save `dynamicFields` as null if EPIC-V2-01 is not yet merged |

### 6.2 Blocking (Downstream)

| Dependent Epic                  | Impact if EPIC-V2-03 is Delayed                                      |
| ------------------------------- | -------------------------------------------------------------------- |
| EPIC-V2-04 (Multi-Stage Review) | No hard dependency; review pipeline only processes `SUBMITTED` ideas |
| EPIC-V2-05 (Blind Review)       | No dependency                                                        |
| EPIC-V2-06 (Scoring)            | No dependency                                                        |

---

## 7. UX / Design

- **"Save Draft" button placement**: Secondary outlined button to the left of the primary "Submit" button in the form footer. Label: "Save Draft". Loading state: "Saving…". Disabled state (at limit): greyed out with a tooltip.
- **Success toast**: "Draft saved. You can continue later from My Ideas." — dismisses after 4 seconds.
- **Drafts tab badge**: A small grey count badge on the tab label (e.g., "Drafts · 3"); does not render if count is 0.
- **Draft list row**: `[Title or "Untitled Draft"] · [Category or "No category"] · Saved [relative time, e.g. "2 hours ago"]` — two action buttons: "Resume" (primary outline) and "Delete" (destructive ghost).
- **Expiry warning**: On the edit form, if `draftExpiresAt` is within 7 days, show a warning banner: "This draft will expire on [date]. Submit it to keep it permanently."
- **Expired Drafts section**: Collapsible `<details>` element below the active list. Header: "Expired Drafts ([count])". Rows are read-only with no actions beyond "Delete permanently."
- **Confirmation modal**: Uses the existing shadcn/ui `AlertDialog` component. Title: "Delete Draft?" Body: "This action cannot be undone." Buttons: "Cancel" (outline) and "Delete" (destructive).

---

## 8. Technical Notes

- The `IdeaStatus` enum change requires auditing every `switch (idea.status)` and `if (status === ...)` statement in the codebase. Use `grep -r "IdeaStatus\|SUBMITTED\|UNDER_REVIEW\|ACCEPTED\|REJECTED"` to find all locations before deploying. TypeScript exhaustiveness checks (`never` in switch default cases) will surface any missed cases at compile time.
- The state machine enforcer (`lib/state-machine/`) must export a `canTransition(from: IdeaStatus, to: IdeaStatus): boolean` function. Add a unit test for every valid and invalid transition, including all `DRAFT` transitions.
- Draft expiry cron: define in `vercel.json` under `"crons"` with a daily schedule. The cron endpoint is a Route Handler at `GET /api/cron/expire-drafts` protected by `CRON_SECRET` header validation.
- `localStorage` auto-save key format: `draft_autosave_[userId]_[ideaId]`. On load of the edit form, check for a newer `localStorage` timestamp vs. the server's `updatedAt`; if local is newer, prompt: "We found unsaved changes. Restore them?" — yes/no choice.
- Do not store sensitive fields (e.g., `authorId`, `status`) in `localStorage` — only form field values (title, description, category, visibility, dynamicFields).

---

## 9. Milestones & Timeline

| Milestone               | Features Included | Target                           | Exit Criteria                                                                          |
| ----------------------- | ----------------- | -------------------------------- | -------------------------------------------------------------------------------------- |
| M1 — DB & State Machine | Feature 1         | Phase 4 start                    | Migration applied; state machine updated; all TypeScript exhaustiveness checks pass    |
| M2 — Save & Resume      | Features 2, 3, 4  | Phase 4 mid                      | Save Draft works end-to-end; Drafts tab renders; Resume pre-populates form             |
| M3 — Expiry             | Feature 5         | Phase 4 complete (~30 min total) | Cron job or lazy expiry enforced; expired drafts surfaced in UI; hard delete confirmed |

---

## 10. Success Metrics

| Metric                  | Target                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------- |
| Draft limit enforced    | Server returns `422` when user attempts an 11th draft                                             |
| State machine integrity | `DRAFT → UNDER_REVIEW` returns `400`; `DRAFT → SUBMITTED` succeeds                                |
| V1 regression           | All existing `SUBMITTED`/`UNDER_REVIEW`/`ACCEPTED`/`REJECTED` ideas unaffected by enum addition   |
| Expiry enforcement      | Drafts older than 90 days do not appear in the active list                                        |
| Test coverage           | ≥ 80% line coverage on state machine additions, Save Draft Server Action, and expiry cron handler |

---

## 11. Risks & Mitigations

| #   | Risk                                                                                     | Likelihood | Impact | Mitigation                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Missed `IdeaStatus` switch cases in V1 code cause runtime errors after adding `DRAFT`    | High       | High   | Enable TypeScript `noImplicitReturns` + exhaustive switch pattern (`default: satisfies never`). Run `tsc --noEmit` and full test suite before merging.                            |
| 2   | Draft expiry cron fails silently (Vercel Cron misconfiguration)                          | Med        | Low    | Add a health-check log at the start of the cron handler. Alert on zero-execution via Vercel monitoring. Implement lazy expiry as a fallback (checked on each Server Action call). |
| 3   | `localStorage` auto-save conflicts with server state on draft resume (stale local cache) | Med        | Med    | Always use server state as the source of truth on form load. `localStorage` is only offered as a restore prompt — never silently applied.                                         |
| 4   | User accumulates 10 drafts and cannot save any more — blocks new idea entry              | Low        | Med    | The "Save Draft" limit is per-user, not global. UI clearly shows the count and provides a direct "Go to Drafts" link so users can delete stale drafts quickly.                    |

---

## 12. Open Questions

| #   | Question                                                                                                                                                                                                                                                                                           | Owner      | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1   | Should `EXPIRED` be a sixth `IdeaStatus` enum value, or should expiry be tracked via a separate boolean column (`isExpired`)? PRD uses soft-delete language without specifying. (Recommendation: separate boolean column `isExpiredDraft` — avoids adding another value to a widely-switched enum) | Aykan Uğur | Open   |
| 2   | Should the 90-day expiry clock reset only on explicit "Save Draft" actions, or also on "Resume" (opening the form)? (Recommendation: reset only on save — opening without editing should not extend the expiry)                                                                                    | Aykan Uğur | Open   |
| 3   | If `FEATURE_DRAFT_ENABLED` is toggled off after users have created drafts, should existing drafts become inaccessible or remain visible? (Recommendation: remain visible but read-only — flag controls creation and editing, not access to existing data)                                          | Aykan Uğur | Open   |

---

## Appendix: Revision History

| Version | Date       | Author     | Changes                                                           |
| ------- | ---------- | ---------- | ----------------------------------------------------------------- |
| 0.1     | 2026-02-25 | Aykan Uğur | Initial draft — all sections complete based on PRD V2.0 Section 7 |
