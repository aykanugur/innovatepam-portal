# Feature Specification: Draft Management

**Feature Branch**: `001-draft-management`  
**Created**: 2026-02-26  
**Status**: Draft  
**Epic Reference**: EPIC-V2-03  
**Input**: EPIC-V2-03 Draft Management: Add DRAFT status to idea lifecycle, save-draft action, drafts tab on my-ideas, resume draft with pre-populated edit form, draft expiry cron at 90 days, auto-save localStorage fallback, 10-draft limit per user

## Clarifications

### Session 2026-02-26

- Q: Which user roles can create and save drafts — SUBMITTER only, all authenticated roles, or all non-admin roles? → A: All authenticated roles (SUBMITTER, REVIEWER, ADMIN) can create and save drafts.
- Q: Should uploaded attachment files be deleted when a draft is hard-deleted or user-deleted? → A: Retain attachment files — no storage cleanup on draft deletion (test environment; deferred to production hardening).
- Q: When the feature flag is off, should the Drafts tab remain visible (read-only) or disappear entirely? → A: Drafts tab remains visible in read-only mode; flag suppresses new draft creation and editing only.
- Q: Should the save-draft endpoint have its own rate limit, share the submission limit, or have no limit? → A: Separate relaxed limit — 30 saves per 15 minutes per user, independent of the submission rate limiter.
- Q: What observability is required for the draft expiry cron job? → A: Structured log on every run — rows soft-deleted, rows hard-deleted, execution duration, and any errors captured.
- Finding (CHK038): The existing `/my-ideas` page has NO tab-based layout — it renders a plain idea list. The Drafts tab requires building a full tab navigation component as part of this feature; the assumption of "no full redesign" needed is incorrect and has been removed.

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Save Idea as Draft Mid-Form (Priority: P1)

Any authenticated user (regardless of role) is half-way through filling in a new idea and needs to step away. They click "Save Draft" and receive confirmation that their partial work is safely stored server-side. The next day they return to `/my-ideas`, find their draft, and resume exactly where they left off.

**Why this priority**: This is the core value proposition of the entire feature. Without the save-and-retrieve cycle working end-to-end, no other story delivers meaningful value.

**Independent Test**: Navigate to `/ideas/new`, fill in only a title, click "Save Draft", see success toast, navigate away, visit `/my-ideas` → Drafts tab, click "Resume" — the title field is pre-populated. Delivers full save-resume cycle.

**Acceptance Scenarios**:

1. **Given** a submitter is on `/ideas/new` with only the title filled, **When** they click "Save Draft", **Then** a success notification appears and they can resume the draft from the Drafts tab with the title preserved.
2. **Given** a submitter has already saved a draft once during the current session, **When** they click "Save Draft" again after editing, **Then** the existing draft is updated — no duplicate record is created.
3. **Given** a submitter's form is completely empty (no title, no description), **When** they click "Save Draft", **Then** the draft is saved and listed as "Untitled Draft" in the Drafts tab.
4. **Given** a submitter has the feature flag for drafts disabled on their account, **When** they visit `/ideas/new`, **Then** the "Save Draft" button is not present anywhere on the page.

---

### User Story 2 — Drafts Tab on My Ideas (Priority: P2)

A submitter wants to see all their in-progress work in one place. The `/my-ideas` page gains a dedicated "Drafts" tab showing all their active drafts with title, category and last-saved time. They can resume or delete from this tab.

**Why this priority**: The Drafts tab is the primary surface for discovering and acting on saved drafts. Without it, users have no way to return to their work even if saving works.

**Independent Test**: With at least one draft saved, navigate to `/my-ideas` and verify the Drafts tab is visible with a count badge, the draft row shows correct metadata, and both "Resume" and "Delete" actions work. Delivers full draft management surface.

**Acceptance Scenarios**:

1. **Given** a submitter has 3 active drafts, **When** they open `/my-ideas`, **Then** a "Drafts" tab is visible with a badge showing "3".
2. **Given** a submitter is on the Drafts tab, **When** they view a draft row, **Then** they see the title (or "Untitled Draft"), category (or "No category"), and a relative time since last save (e.g. "2 hours ago").
3. **Given** a submitter has no active drafts, **When** they visit the Drafts tab, **Then** an empty-state message is shown: "No drafts saved. Start a new idea and save it as a draft to see it here."
4. **Given** a submitter clicks "Delete" on a draft row, **When** the confirmation dialog appears and they confirm, **Then** the draft is permanently removed and the list updates without a full page reload.
5. **Given** a submitter clicks "Delete" on a draft row, **When** the confirmation dialog appears and they click "Cancel", **Then** no change occurs.

---

### User Story 3 — Submit a Draft as a Real Idea (Priority: P2)

A submitter resumes their saved draft, finishes filling in all required fields, and clicks "Submit". The draft undergoes full validation and, if valid, enters the standard evaluation pipeline — becoming visible to admins for review.

**Why this priority**: The ultimate goal of saving a draft is to submit it. Without this story, drafts are a dead-end collection of permanent junk data.

**Independent Test**: Resume a draft with all required fields filled, click "Submit", verify the idea appears in the submitted ideas list and is no longer on the Drafts tab.

**Acceptance Scenarios**:

1. **Given** a submitter is editing a resumed draft with all required fields complete, **When** they click "Submit", **Then** the idea is validated, transitions to submitted status, and the user is redirected to the idea detail page with a success notification.
2. **Given** a submitter tries to submit a draft with a missing required field (e.g. category), **When** they click "Submit", **Then** validation errors are shown and the idea remains a draft.
3. **Given** a submitted idea was previously a draft, **When** an admin views the idea queue, **Then** the idea appears normally — no indication it started as a draft, no draft-only fields visible.

---

### User Story 4 — Draft Limit Enforcement (Priority: P3)

A submitter who already has 10 active drafts attempts to save an eleventh. The system prevents this gracefully, with the "Save Draft" button disabled and a clear explanation directing them to delete or submit an existing draft.

**Why this priority**: Limit enforcement protects database integrity and encourages intentional use. It is important but does not block basic functionality.

**Independent Test**: With exactly 10 active drafts, navigate to `/ideas/new` and verify "Save Draft" is disabled with the limit tooltip visible.

**Acceptance Scenarios**:

1. **Given** a submitter already has 10 active drafts, **When** they visit `/ideas/new`, **Then** the "Save Draft" button is visually disabled with a tooltip: "You have reached the maximum of 10 drafts. Please submit or delete a draft to continue."
2. **Given** a submitter has 10 active drafts and bypasses the UI to send a save request directly, **When** the server processes the request, **Then** it rejects the request with an appropriate error message and no new draft is created.
3. **Given** a submitter with 10 drafts deletes one, **When** they return to `/ideas/new`, **Then** the "Save Draft" button is re-enabled.

---

### User Story 5 — Draft Expiry (Priority: P3)

A submitter who saved a draft 90 days ago and never returned to it finds it listed in a collapsed "Expired Drafts" section on the Drafts tab. The draft can no longer be submitted or edited. It will be permanently deleted 30 days after expiry.

**Why this priority**: Expiry keeps the platform clean and prevents indefinite accumulation of abandoned data. Important for platform health but not user-facing MVP.

**Independent Test**: Simulate expiry by setting `draftExpiresAt` to a past date on a test draft, refresh the Drafts tab, and verify the draft moves to the "Expired Drafts" section and "Resume" is no longer available.

**Acceptance Scenarios**:

1. **Given** a draft has passed its 90-day expiry, **When** a submitter visits the Drafts tab, **Then** the draft appears in a collapsed "Expired Drafts" section — not in the active list.
2. **Given** an expired draft, **When** the author navigates to its edit URL, **Then** they see a read-only view with the message "This draft has expired and can no longer be edited." and submit/save buttons are absent.
3. **Given** a draft is being actively worked on, **When** the submitter saves it, **Then** the expiry clock resets to 90 days from the save time.
4. **Given** a draft that was soft-deleted by expiry 30 days ago, **When** the daily cleanup runs, **Then** the draft is permanently removed from the database.

---

### Edge Cases

- What happens when a submitter opens the same draft in two browser tabs and saves from both? The second save overwrites the first — last write wins; no merge conflict resolution. This is an accepted data-loss risk.
- What happens when a draft title exceeds 150 characters on save? The save is rejected with a clear validation error; the draft is not created or updated.
- What happens when a non-owner navigates directly to `/ideas/[id]/edit` for another user's draft? The page returns a styled "not found" response consistent with the app's 404 page — no information is revealed about the draft's existence.
- What happens when the feature flag is toggled off after users have existing drafts? The Drafts tab remains visible and all existing drafts are displayed in read-only mode. The "Save Draft" button, draft edit form, and new draft creation are suppressed. Users can still delete their existing drafts from the read-only tab.
- What happens when the feature flag is off and a user attempts to submit a draft? The draft edit form is inaccessible (redirect on load); there is no Submit button in the read-only Drafts tab. Submitting a draft while the flag is off is therefore not possible through the UI. Any direct API call to submit is rejected server-side.
- What happens when a submitter's browser localStorage contains newer auto-saved changes than the server? On form load, the user is prompted to choose between the server version and the local version — localStorage state is never silently applied.
- What happens when the expiry cron job fails or does not run? Expiry is also enforced lazily: any server request to edit or submit a draft where `draftExpiresAt < now()` treats it as expired regardless of cron status.
- What happens when a save request arrives while the draft's `draftExpiresAt` has just passed (race condition)? The lazy expiry check runs server-side before the update. If the draft is found to be expired at request time, the save is rejected with a "draft has expired" error — the write does not reset the clock on an expired draft.
- What happens when a user saves a draft more than 30 times in 15 minutes? The save-draft rate limit is hit; the server returns an error; a toast notification informs the user. Browser localStorage auto-save continues to function locally during the cooldown period.
- What happens when a draft is resumed and then the user closes the form without saving or submitting? The server-side `draftExpiresAt` is unchanged (opening the form does not reset expiry). The browser localStorage auto-save fires every 60 seconds while the form is open, preserving local state.
- What happens when a user deletes a draft while the expiry cron is simultaneously soft-deleting it? The user-triggered delete results in a hard delete of the record. If the cron soft-delete runs first, the user delete simply removes an already `isExpiredDraft=true` record. Both paths are safe and idempotent — no double-delete error is expected.
- What happens when a draft is resumed and its saved category no longer exists or has been renamed? The resume form displays the raw saved category value as plain text (not a valid select option). The user must re-select a valid category before the idea can be submitted. Saving the draft again without changing category is allowed (aborts required-field validation).
- What happens for an ADMIN-role user's drafts? ADMIN users can create, save, resume, and manage their own drafts via the Drafts tab on `/my-ideas` — identical experience to SUBMITTER users. Their draft ideas are still excluded from the admin review queue (FR-013) since they remain in DRAFT status.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST allow any authenticated user (all roles: SUBMITTER, REVIEWER, ADMIN) to save a partially completed idea form as a draft without running required-field validation, subject only to character length caps (title ≤ 150 chars, description ≤ 5,000 chars). All saveable fields are: title, description, category, visibility, dynamicFields (JSON), and staged attachment reference URLs. The "Save Draft" button MUST enter a "Saving…" disabled loading state during the in-flight request and re-enable on completion.
- **FR-002**: The system MUST assign a 90-day expiry timestamp server-side to each draft on creation, and reset it to 90 days from the current time on every explicit "Save Draft" server action. Opening the edit form without saving or browser localStorage auto-saves do NOT reset the server-side expiry.
- **FR-003**: The system MUST limit each user to a maximum of 10 active drafts (see "Active Draft" definition in Key Entities); attempts to exceed this limit MUST be rejected. The exact error message shown to the user is: "You have reached the maximum of 10 drafts. Please submit or delete a draft to continue."
- **FR-004**: The system MUST add a "Drafts" tab to the `/my-ideas` page for all authenticated users, listing that user's active drafts sorted by `updatedAt` descending (most recently saved first). The required fields shown per row: title (or "Untitled Draft" when null/empty), category (or "No category" when null/empty), relative last-saved time (e.g. "2 hours ago"). The tab count badge MUST be hidden entirely when the active draft count is 0 — it MUST NOT render "0". The Expired Drafts section within the tab MUST be sorted by `draftExpiresAt` ascending (soonest-expired first).
- **FR-005**: The system MUST provide a "Resume" action on each draft row that navigates (same browser tab, standard page navigation) to `/ideas/[id]/edit` pre-populated with all previously saved field values: title, description, category, visibility, dynamicFields, and attachment references. If `dynamicFields` is null (e.g. EPIC-V2-01 not merged at save time), the dynamic fields section renders empty, driven by the category's current field template. If the saved category no longer exists or has been renamed, resume shows the raw saved category value as unselected text and requires the user to re-select a valid category before submitting. Attachment references saved in the draft remain associated and displayed in the upload zone on resume.
- **FR-006**: The system MUST provide a "Delete" action on each draft row (active and expired) that opens a confirmation dialog before permanently removing the database record. Exact dialog strings — Title: "Delete Draft?" Body: "This action cannot be undone." Buttons: "Cancel" (outline) and "Delete" (destructive). On confirmation, the database record is removed and the localStorage auto-save key for that draft (`draft_autosave_{userId}_{ideaId}`) MUST be cleared from the browser to prevent spurious restore prompts. Associated uploaded attachment files are NOT deleted from storage (test environment; deferred).
- **FR-007**: Submitting from the edit form on a draft MUST run full required-field validation (same fields and rules as a fresh idea submission). On success: the idea status transitions from DRAFT to submitted status; the idea enters the standard review pipeline identically to a freshly submitted idea; the user is redirected to `/ideas/[id]` with a success notification; attachment records remain associated with the idea after the transition. No indication that the idea originated as a draft is shown in the UI (audit log metadata is not in scope for this feature).
- **FR-008**: The system MUST restrict access to a draft's edit URL (`/ideas/[id]/edit`) to the authenticated author only. Any other session (unauthenticated or a different user) MUST receive a styled "not found" response consistent with the application's existing 404 page — no error distinguishes "not found" from "not your draft".
- **FR-009**: Expired drafts (where `draftExpiresAt < now()` OR `isExpiredDraft = true`) MUST be excluded from the active draft list, shown in a collapsed "Expired Drafts" section sorted by `draftExpiresAt` ascending, rendered read-only (no Save Draft or Submit buttons), and permanently removed from the database 30 days after soft-deletion.
- **FR-010**: A daily cron job MUST be invoked via a Route Handler at `GET /api/cron/expire-drafts`, authenticated by a `CRON_SECRET` header. It MUST: (1) soft-delete all DRAFT records where `draftExpiresAt < now()` by setting `isExpiredDraft = true`; (2) hard-delete all records where `isExpiredDraft = true` AND the soft-delete timestamp is more than 30 days ago. The endpoint MUST return HTTP 200 with a JSON body: `{ softDeleted: N, hardDeleted: N, durationMs: N }` on success; HTTP 500 with `{ error: "..." }` on failure.
- **FR-011**: The browser MUST auto-save draft form state to localStorage every 60 seconds using the key `draft_autosave_{userId}_{ideaId}`, storing the timestamp alongside field values. On resuming a draft, if `localStorage.timestamp > idea.updatedAt`, the user MUST be prompted: "We found unsaved changes. Restore them?" with a yes/no choice — localStorage state is NEVER silently applied. When a draft is deleted (by user action or navigating away after delete), the corresponding localStorage key MUST be cleared.
- **FR-012**: When `draftExpiresAt - now() < 7 × 24 × 60 × 60 × 1000 ms` (strictly less than 7 full days), the edit form MUST display a warning banner: "This draft will expire on [formatted date]. Submit it to keep it permanently."
- **FR-013**: Draft ideas (status = `DRAFT`) MUST be excluded from all admin review queue queries at the database query level — not filtered in application or UI code only. This is intentional defence-in-depth alongside FR-015's state machine enforcement.
- **FR-014**: All draft _creation and editing_ functionality MUST be gated behind the `FEATURE_DRAFT_ENABLED` feature flag. When the flag is off: the "Save Draft" button is absent from the DOM, new draft creation is blocked server-side, and the draft edit form returns a redirect. The Drafts tab on `/my-ideas` MUST remain visible and show existing drafts in read-only mode (no Save Draft, no Submit buttons). Users can still delete existing drafts from the read-only Drafts tab regardless of flag state.
- **FR-015**: The idea status model MUST be extended to include a `DRAFT` state. The only valid transition from `DRAFT` is to submitted status. All other transitions from `DRAFT` (e.g. to UNDER_REVIEW, ACCEPTED, REJECTED) MUST be rejected by the state machine enforcer. This is intentional defence-in-depth alongside FR-013's query-level exclusion.
- **FR-016**: The save-draft endpoint MUST enforce a dedicated rate limit of 30 requests per 15 minutes per user, independent of the existing idea-submission rate limiter. When the limit is exceeded, the server MUST return an appropriate error response AND the client MUST display a toast notification informing the user that saving is temporarily unavailable. Browser localStorage auto-save continues to function locally during the rate-limit cooldown.
- **FR-017**: The cron handler MUST emit a structured log entry (via `console.log` or equivalent) on every execution regardless of whether rows were affected, containing: `softDeleted`, `hardDeleted`, `durationMs`, and any caught error messages. Response format: HTTP 200 `{ softDeleted: N, hardDeleted: N, durationMs: N }` on success; HTTP 401 when `CRON_SECRET` header is missing or invalid; HTTP 500 `{ error: "..." }` on unhandled errors.
- **FR-018**: All interactive elements on the Drafts tab (tab trigger, resume button, delete button, confirmation dialog) MUST be keyboard-navigable. The Drafts tab count badge MUST have an accessible label (e.g. `aria-label="3 active drafts"`). Focus MUST return to the tab area after a draft is deleted.
- **FR-019**: The `/my-ideas` page MUST be redesigned to include a tab-based layout (using the existing shadcn/ui `Tabs` component) with at minimum two tabs: "Submitted" (existing ideas list) and "Drafts" (new). The tab layout MUST be responsive and function correctly on mobile viewports using the same responsive patterns applied elsewhere in the application.

### Key Entities

- **Draft Idea**: An idea record with `isExpiredDraft = false` and status `DRAFT`, owned exclusively by its author (any role), with an expiry timestamp and all standard idea fields optionally populated. Limited to 10 per user. Transitions to submitted status only when explicitly submitted by the author.
- **Active Draft**: A draft where `isExpiredDraft = false` AND `draftExpiresAt > now()`. During the lazy-expiry window (cron has not yet run), a draft whose `draftExpiresAt` has passed but whose `isExpiredDraft` flag has not yet been set is still treated as expired on any server request — it does NOT count toward the 10-draft limit and CANNOT be edited or submitted.
- **Expiry Timestamp**: A server-set date 90 days from creation or last explicit Save Draft action, after which the draft becomes read-only and ineligible for submission. Reset only on explicit server-side save — opening the edit form without saving does NOT reset the clock. localStorage auto-save does NOT reset server-side expiry.
- **Soft-Delete**: Setting `isExpiredDraft = true` on a draft record. The record remains in the database but is excluded from the active list. Performed by the daily cron job for drafts where `draftExpiresAt < now()`.
- **Hard-Delete**: Permanent removal of a draft record from the database. Performed 30 days after soft-delete by the same cron job.
- **Draft Limit**: A per-user count of records where `status = DRAFT` AND `isExpiredDraft = false` AND `draftExpiresAt > now()`. Enforced both in the UI (button disabled state) and server-side (request rejection).
- **Auto-Save State**: A browser-local snapshot of the current form values, keyed as `draft_autosave_{userId}_{ideaId}`, storing only form field values (title, description, category, visibility, dynamicFields). Never stores server-side fields (authorId, status, draftExpiresAt). Used only as a restore prompt when `localStorage.timestamp > idea.updatedAt` — never silently applied as truth.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: At least 60% of drafts created are eventually submitted — measured over a 30-day cohort window. **Note**: No analytics system is in scope for this feature; this metric is aspirational and will require a V3 analytics pass to measure. Implementation must not be blocked on tracking infrastructure.
- **SC-002**: Zero draft ideas appear in the admin review queue under any circumstances. Enforced at two independent layers (FR-013 query-level exclusion AND FR-015 state machine rejection) as intentional defence-in-depth.
- **SC-003**: The draft save action completes and the user sees a confirmation within 3 seconds under normal network conditions.
- **SC-004**: A user with 10 active drafts receives a clear, actionable error before any network request is made — no failed server round-trips for limit enforcement in the standard path.
- **SC-005**: Drafts older than 90 days do not appear in the active drafts list. Expired drafts are surfaced in the separate section within 24 hours of passing their expiry date, via either the daily cron run or lazy enforcement on the next server request from the draft's author (whichever occurs first).
- **SC-006**: The resume flow fully restores all previously saved field values — title, description, category, visibility, dynamicFields, and attachment references — for all field types defined in the current form schema. Categories that no longer exist are surfaced as raw text requiring re-selection; null dynamicFields renders from the category's current template.
- **SC-007**: The state machine enforcer correctly blocks all non-submission transitions from DRAFT status, with 100% enforcement verified by automated unit tests covering every invalid transition path.
- **SC-008**: All existing submitted, in-review, accepted, and rejected ideas are unaffected by the introduction of the DRAFT status — zero regressions in existing idea workflows.

---

## Assumptions

- The existing idea state machine in `lib/state-machine/` is the single enforcer for all status transitions and will be updated as part of this feature.
- The `/my-ideas` page currently has NO tab-based layout (verified 2026-02-26). Building the tab navigation component (shadcn/ui `Tabs`) is in scope for this feature and is NOT a minor addition — it requires redesigning the page.
- The `dynamicFields` column is available on the Idea model (delivered by EPIC-V2-01 Smart Forms); if not merged at implementation time, dynamic fields are stored as null — no blocking dependency. On resume when `dynamicFields` is null, the form renders the category's current field template with empty values.
- Attachment references saved in a draft will be preserved on resume (EPIC-V2-02 Multi-Media Attachments is already merged). Attachment records remain associated with the idea after the DRAFT → SUBMITTED transition.
- Uploaded attachment files are NOT deleted when a draft is hard-deleted (via expiry cron or user action) — this is a test environment and storage cleanup is deferred to a future production-hardening pass.
- Vercel Cron or an equivalent scheduling mechanism is available in the deployment environment; if unavailable, lazy expiry enforcement acts as the fallback.
- The `isExpiredDraft` boolean column approach is preferred over adding an `EXPIRED` value to the status enum, to avoid widening a widely-switched enum with a non-submission state.
- The feature flag `FEATURE_DRAFT_ENABLED` defaults to `false` in all environments until QA sign-off.
- The expiry clock resets only on explicit Save Draft server actions — opening the edit form without saving and browser localStorage auto-saves do NOT reset server-side `draftExpiresAt`.
- When the feature flag is disabled after drafts have been created, existing drafts remain visible in read-only mode on the Drafts tab; new draft creation and the draft edit form are blocked. Users can delete their existing drafts from the read-only tab.
- `CRON_SECRET` is a new environment variable that does not exist in the current codebase. It must be provisioned as a new secret in all deployment environments where the expiry cron runs.

---

## Dependencies

- **EPIC-V2-01 (Smart Forms)**: `dynamicFields` column on Idea. Low risk — draft can save null if not merged; non-blocking.
- **EPIC-V2-02 (Multi-Media Attachments)**: Attachment references in draft. Already merged — no blocking dependency.
- **EPIC-01 Foundation**: State machine infrastructure in `lib/state-machine/` and `/my-ideas` page. Complete — no risk.
- **EPIC-03 Idea Submission**: `/ideas/new` form and Server Action. Complete — no risk.
