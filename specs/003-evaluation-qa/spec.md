# Feature Specification: Evaluation Workflow, Admin Tools & Quality Gate

**Feature Branch**: `003-evaluation-qa`  
**Epic**: EPIC-04  
**Created**: 2026-02-24  
**Status**: Draft  
**Stories**: US-012, US-013, US-014, US-015, US-016

---

## Overview

This feature closes the innovation feedback loop by giving admins a structured workflow to review, accept, or reject submitted ideas — and giving submitters visibility into the outcome. It also delivers an admin dashboard for pipeline oversight, an optional analytics page, a user settings page, a mandatory ≥ 80% test coverage quality gate, and the final production deployment.

---

## Clarifications

### Session 2026-02-24

- Q: Should review state transitions be recorded in the AuditLog? → A: Log both — `IDEA_REVIEW_STARTED` (on Start Review) and `IDEA_REVIEWED` (on Accept/Reject, with decision and comment summary in metadata).
- Q: Is a comment required on Accept as well as Reject? → A: Comment required on both Accept and Reject (minimum 10 characters).
- Q: When is the IdeaReview record created? → A: Two-step — create the IdeaReview row at "Start Review" (reviewer identity + start timestamp, no decision yet); update it in-place at finalization. Concurrency guard = check whether a row already exists.
- Q: Where is the admin taken after finalizing a review decision? → A: Stay on the review page — the action panel transitions to a read-only decision card showing the recorded outcome; no redirect.
- Q: What happens when an admin starts a review but never finalizes it (stuck UNDER_REVIEW)? → A: A SUPERADMIN can explicitly perform an "Abandon Review" action that resets the idea from `UNDER_REVIEW` back to `SUBMITTED` and creates an `IDEA_REVIEW_ABANDONED` audit entry. No automatic timeout. Only the initiating admin or a SUPERADMIN can finalize; other admins cannot take over.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Idea Evaluation Workflow (Priority: P1)

**Story ID**: US-012

An admin visits the review page for a submitted idea and progresses it through the state machine: first marking it "Under Review", then issuing a final Accept or Reject decision with a mandatory comment. The submitter immediately sees the outcome on the idea's detail page.

**Why this priority**: This is the core value of the portal. Without it, the submission box has no feedback loop and admins cannot process any ideas. Every other story in this epic depends on ideas having final statuses.

**Independent Test**: Can be fully tested by logging in as an admin, navigating to `/admin/review/<ideaId>`, clicking "Start Review", then "Accept" or "Reject" with a comment, and verifying the idea's detail page shows the correct decision badge, reviewer name, and comment.

**Acceptance Scenarios**:

1. **Given** I am ADMIN and visit `/admin/review/<ideaId>` for a `SUBMITTED` idea, **When** the page loads, **Then** I see the full idea detail and a "Start Review" button; the "Accept" and "Reject" buttons are not yet visible.
2. **Given** I click "Start Review", **When** the action completes, **Then** the idea status changes to `UNDER_REVIEW` and the "Start Review" button is replaced by "Accept" and "Reject" buttons.
3. **Given** the idea is `UNDER_REVIEW` and I click "Accept" with a comment of at least 10 characters, **When** the action completes, **Then** the idea status is `ACCEPTED`, a review record is persisted with the comment and reviewer identity, the action panel on the review page is replaced by a read-only decision card showing the outcome, and the submitter's idea detail page displays the decision.
4. **Given** I click "Reject" and leave the comment field empty, **When** I try to submit, **Then** I see: "A comment is required (minimum 10 characters)."
5. **Given** I click "Accept" and leave the comment field empty or enter fewer than 10 characters, **When** I try to submit, **Then** I see: "A comment is required (minimum 10 characters)."
6. **Given** the idea was originally submitted by me (admin is also the author), **When** I visit the review page, **Then** the action buttons are hidden and any direct API attempt returns a "You cannot review your own idea." error.
7. **Given** the idea is already `ACCEPTED` or `REJECTED`, **When** any user attempts a state transition, **Then** the system rejects it with "This idea has already been reviewed."

---

### User Story 2 — Admin Dashboard (Priority: P1)

**Story ID**: US-013

An admin visits `/admin` and sees a live count of ideas grouped by status, plus a prioritized queue of ideas waiting for review. From this single page they can jump directly to any pending idea's review page.

**Why this priority**: Without a dashboard, admins must page through the browse list to find pending ideas. The dashboard is the operational hub for the review SLA. It is P1 because evaluation (US-012) is near-useless without discoverability.

**Independent Test**: Can be tested independently by navigating to `/admin` as an admin and verifying stat cards show correct counts and the pending queue lists `SUBMITTED` ideas oldest-first, each with a working "Review" link. An attempt to visit `/admin` as a SUBMITTER must return an access-denied response.

**Acceptance Scenarios**:

1. **Given** I am ADMIN and visit `/admin`, **When** the page loads, **Then** I see stat cards for: Total Ideas, Submitted, Under Review, Accepted, and Rejected — each showing the correct live count.
2. **Given** ideas with `status=SUBMITTED` exist, **When** the dashboard loads, **Then** a "Pending Review" queue lists them ordered oldest-first, showing title, author, category, and relative submission time.
3. **Given** no ideas have `status=SUBMITTED`, **When** the dashboard loads, **Then** the "Pending Review" section shows: "No ideas awaiting review. Great work!"
4. **Given** I click the "Review" action on a pending idea, **When** navigating, **Then** I am taken to `/admin/review/<ideaId>`.
5. **Given** an admin completes a review action, **When** I return to the dashboard, **Then** the stat counts and queue reflect the updated state without a manual page reload.
6. **Given** I am a SUBMITTER and navigate to `/admin`, **When** the page is requested, **Then** I receive an access-denied response.

---

### User Story 3 — Profile & Settings (Priority: P2)

**Story ID**: US-015

Any logged-in employee visits `/settings` to update their display name or change their password. Changes are reflected immediately across the portal.

**Why this priority**: P2 — delivers a complete user experience. The platform functions without it, but it is XS effort and expected by users of any portal. Marked cut-first if the timeline is at risk.

**Independent Test**: Can be fully tested by visiting `/settings` as any logged-in user, updating the display name, reloading any page showing the user's name, and verifying it reflects the change. Password change can be tested by logging out and logging back in with the new password.

**Acceptance Scenarios**:

1. **Given** I am logged in and visit `/settings`, **When** the page loads, **Then** I see my current display name pre-filled in a text field and a password change form.
2. **Given** I change my display name and save, **When** the action completes, **Then** my display name is updated everywhere in the portal and a success message confirms the change.
3. **Given** I submit a password change with the correct current password and a valid new password, **When** the action completes, **Then** my password is updated and a success message is shown.
4. **Given** I submit a password change with an incorrect current password, **When** the action runs, **Then** I see: "Current password is incorrect."
5. **Given** the new password and confirm-new-password fields do not match, **When** I try to submit, **Then** a client-side error "Passwords do not match." appears before any server request is made.

---

### User Story 4 — Analytics Page (Priority: P3)

**Story ID**: US-014

A SUPERADMIN visits `/admin/analytics` to view charts summarizing the innovation pipeline: ideas by category, submission trend over time, and top contributors. The page is gated behind `FEATURE_ANALYTICS_ENABLED`.

**Why this priority**: P3 (Could) — a cut-first candidate. Does not affect core evaluation or dashboard functionality. Only built if P1/P2 stories are complete with time remaining.

**Independent Test**: Can be tested with `FEATURE_ANALYTICS_ENABLED=true` by visiting `/admin/analytics` as a SUPERADMIN and verifying three charts render with correct data. An ADMIN (not SUPERADMIN) visiting the same URL must receive an access-denied response.

**Acceptance Scenarios**:

1. **Given** `FEATURE_ANALYTICS_ENABLED=true` and I am SUPERADMIN, **When** I visit `/admin/analytics`, **Then** I see: a bar chart of ideas by category, a line chart of ideas submitted per day over the last 30 days, and a leaderboard of the top 5 contributors by idea count.
2. **Given** `FEATURE_ANALYTICS_ENABLED=false`, **When** any user visits `/admin/analytics`, **Then** the page returns a "Not Found" response.
3. **Given** I am ADMIN (not SUPERADMIN) and `FEATURE_ANALYTICS_ENABLED=true`, **When** I visit `/admin/analytics`, **Then** I receive an access-denied response.
4. **Given** no ideas exist in the system, **When** the analytics page loads, **Then** all charts render empty/zero states with labels — no blank white or crashed charts.

---

### User Story 5 — Test Suite & Quality Gate (Priority: P1)

**Story ID**: US-016

The full test suite — unit tests for state machine logic and validation, integration tests for database operations, and four E2E critical-path tests — is written and passing. The `npm run test:coverage` command reports ≥ 80% line coverage. No failing tests are present before the GA deployment.

**Why this priority**: P1 — non-negotiable PRD requirement. The quality gate is the exit criterion for the entire project. GA is blocked until it passes.

**Independent Test**: Can be verified independently by running `npm run test:coverage` and confirming the output reports ≥ 80% line coverage, then running `npm run test:e2e` and confirming all four paths pass.

**Acceptance Scenarios**:

1. **Given** the test suite is run, **When** `npm run test:coverage` completes, **Then** the line coverage report shows ≥ 80% across all source files.
2. **Given** the E2E suite is run, **When** `npm run test:e2e` completes, **Then** all four critical paths pass: (a) register → login → land on `/ideas`; (b) submit idea → appears in idea list; (c) admin starts review → accepts idea → submitter sees decision; (d) submitter attempts admin action → receives access-denied response.
3. **Given** any test in the suite is failing, **When** the GA deployment is attempted, **Then** CI must block the deployment until all tests pass.

---

### Edge Cases

- Two admins attempt to start reviewing the same idea simultaneously — the system checks for an existing `IdeaReview` row before creating one; first write wins and creates the row; second attempt finds the row already exists and returns "This idea is already under review by another admin."
- Admin attempts to accept an idea that is already in `ACCEPTED` or `REJECTED` state — rejected with "This idea has already been reviewed."
- A review comment of only whitespace submitted on Accept or Reject — trimmed length is 0, treated as empty; validation error "A comment is required (minimum 10 characters)" shown.
- Display name updated to an all-whitespace string — trimmed and rejected as empty.
- Analytics page rendered when the database has ideas from only one user — leaderboard shows that single user at rank #1; other positions are empty.
- Stat counts on the admin dashboard becoming stale after a review action — counts must reflect the latest state without requiring a manual reload.
- An idea is stuck in `UNDER_REVIEW` (e.g., the reviewing admin leaves the portal without finalizing) — only a SUPERADMIN can reset it to `SUBMITTED` via the Abandon Review action; no automatic timeout is applied; the "Pending Review" queue MUST NOT list `UNDER_REVIEW` ideas, so the stuck idea is invisible to regular admins until it is abandoned.

---

## Requirements _(mandatory)_

### Functional Requirements

**Evaluation Workflow (US-012)**

- **FR-001**: Only users with ADMIN or SUPERADMIN roles MUST be able to access the idea review page or perform state transition actions.
- **FR-002**: The idea state machine MUST enforce the sequence: `SUBMITTED → UNDER_REVIEW → ACCEPTED` or `SUBMITTED → UNDER_REVIEW → REJECTED`. A SUPERADMIN may additionally trigger `UNDER_REVIEW → SUBMITTED` via the "Abandon Review" action. No other transitions are permitted.
- **FR-003**: An admin MUST NOT be able to review an idea they authored; the system MUST reject such attempts with a clear error.
- **FR-004**: When "Start Review" is triggered, the system MUST create an `IdeaReview` record containing the reviewer identity and a start timestamp, and update `Idea.status` to `UNDER_REVIEW` atomically. The review record exists from this point with no decision yet.
- **FR-005**: To finalize a decision (Accept or Reject), the reviewer MUST provide a comment of at least 10 characters. Both Accept and Reject are subject to the same minimum; an attempt to finalize with a missing or too-short comment MUST be rejected with the message "A comment is required (minimum 10 characters)."
- **FR-006**: When a decision is finalized, the system MUST atomically update the existing `IdeaReview` record (adding decision, comment, and decision timestamp) and update `Idea.status` to `ACCEPTED` or `REJECTED`.
- **FR-007**: The submitter's idea detail page MUST display the final decision, reviewer display name, comment, and the date the decision was made.
- **FR-008**: An idea that has already been reviewed MUST NOT be transitionable to any new state; any attempt MUST return an error.
- **FR-029**: After a decision is finalized, the review page MUST replace the action panel with a read-only decision card displaying: the decision (ACCEPTED or REJECTED), the reviewer's display name, the comment, and the decision timestamp. No redirect occurs.
- **FR-030**: A SUPERADMIN MUST be able to perform an "Abandon Review" action on any idea in `UNDER_REVIEW` state, atomically resetting `Idea.status` to `SUBMITTED`, deleting the in-progress `IdeaReview` record, and writing an `IDEA_REVIEW_ABANDONED` audit entry containing the idea ID, original reviewer ID, and SUPERADMIN actor ID. Non-SUPERADMIN roles MUST NOT be able to trigger this action.

**Admin Dashboard (US-013)**

- **FR-009**: The admin dashboard MUST display live counts for: Total Ideas, Submitted, Under Review, Accepted, and Rejected.
- **FR-010**: The dashboard MUST show a "Pending Review" queue listing all `SUBMITTED` ideas ordered oldest-first, with each row showing: title, author name, category, and relative submission time.
- **FR-011**: Each row in the "Pending Review" queue MUST include a direct navigation link to the review page for that idea.
- **FR-012**: When no ideas are in `SUBMITTED` status, the "Pending Review" section MUST display an empty-state message acknowledging the clear queue.
- **FR-013**: Stat counts and the pending queue MUST reflect the current state after any review action completes — stale cached data MUST NOT persist.
- **FR-014**: The admin dashboard MUST be accessible only to ADMIN and SUPERADMIN roles; all other authenticated users MUST receive an access-denied response.

**Profile & Settings (US-015)**

- **FR-015**: Any authenticated user MUST be able to update their display name (required, maximum 50 characters, non-empty after trimming whitespace).
- **FR-016**: Any authenticated user MUST be able to change their password by providing their current password, a new password, and a confirmation of the new password.
- **FR-017**: The system MUST verify the current password before accepting a password change; an incorrect current password MUST result in the error "Current password is incorrect."
- **FR-018**: The new password MUST meet the same complexity requirements as registration (minimum 8 characters, at least one uppercase letter, at least one number).
- **FR-019**: A client-side check MUST catch new-password / confirm-password mismatches before any server request is made.
- **FR-020**: A success message MUST be shown after each successful save (display name update and password change are separate actions).

**Analytics Page (US-014)**

- **FR-021**: The analytics page MUST be gated behind the `FEATURE_ANALYTICS_ENABLED` flag; when the flag is `false` the page MUST return a Not Found response.
- **FR-022**: The analytics page MUST be accessible only to SUPERADMIN role; ADMIN and SUBMITTER roles MUST receive an access-denied response.
- **FR-023**: The analytics page MUST display: a bar chart of idea counts by category, a line chart of ideas submitted per day over the last 30 days, and a leaderboard of the top 5 contributors by idea count.
- **FR-024**: All charts MUST render gracefully when there is no data — empty/zero states with labels rather than blank or broken layouts.

**Test Suite & Quality Gate (US-016)**

- **FR-025**: A `test:coverage` command MUST be available and MUST report ≥ 80% line coverage across all source files before any GA deployment.
- **FR-026**: An `test:e2e` command MUST be available and MUST run the four critical-path scenarios end-to-end without any failure.
- **FR-027**: All tests MUST pass (zero failures) before the GA deployment proceeds; CI MUST block deployment if any test fails.
- **FR-028**: The system MUST write an `IDEA_REVIEW_STARTED` audit log entry when an idea is moved to `UNDER_REVIEW`, and an `IDEA_REVIEWED` audit log entry when a final decision (ACCEPTED or REJECTED) is recorded — both entries MUST include the actor ID, target idea ID, and relevant metadata (decision and comment summary for the final event).

### Key Entities

- **IdeaReview**: Represents the admin's evaluation of a single idea. Created in two steps: first at "Start Review" (reviewer identity, start timestamp, no decision); then updated in-place at finalization (decision — ACCEPTED or REJECTED, mandatory comment ≥ 10 characters, decision timestamp). Linked one-to-one with the idea. The presence of an `IdeaReview` row with no decision serves as the concurrency guard — a second admin attempting to start review on the same idea will find the row already exists and receive "This idea is already under review by another admin."
- **State machine**: A pure, side-effect-free function that takes the current idea status and a requested action and returns either the new valid status or an error. Enforces all permitted and forbidden transitions without touching persistence logic.
- **AuditLog (review events)**: Three new `AuditAction` enum values — `IDEA_REVIEW_STARTED`, `IDEA_REVIEWED`, and `IDEA_REVIEW_ABANDONED` — extend the existing audit log table. `IDEA_REVIEW_STARTED` metadata contains the idea ID and reviewer ID. `IDEA_REVIEWED` metadata additionally contains the decision (`ACCEPTED`/`REJECTED`) and a truncated comment summary. `IDEA_REVIEW_ABANDONED` metadata contains the idea ID, the original reviewer ID, and the SUPERADMIN actor ID.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An admin can complete the full review cycle (start review → finalize decision with comment) in under 2 minutes on a standard connection.
- **SC-002**: A submitter sees the decision on their idea detail page within one page load after the review is finalized — no additional action required on their part.
- **SC-003**: The admin dashboard stat counts accurately reflect the true state of all ideas; no stale count persists beyond the completion of a review action.
- **SC-004**: `npm run test:coverage` reports ≥ 80% line coverage across all source files before the GA deployment.
- **SC-005**: All four E2E critical paths pass without error on every CI run.
- **SC-006**: The GA deployment produces zero build errors and passes the manual smoke test for all P1 user stories on the production URL.
- **SC-007**: An admin cannot review their own submitted idea under any circumstances — this rule holds across UI, server actions, and direct API calls.

---

## Assumptions

1. EPICs 01–03 are fully merged and working in production before this epic begins implementation.
2. The `IdeaReview` model already exists in the Prisma schema (created in EPIC-03/US-002 database foundation work) with the `idea` relation set to cascade on delete.
3. Vitest is the test runner for unit and integration tests; Playwright is used for E2E tests.
4. A `DATABASE_URL_TEST` environment variable points to a separate test database for integration tests; it must not share data with the development or production database.
5. US-014 (Analytics) and US-015 (Profile & Settings) are cut-first candidates — they are out of scope for the primary delivery timeline and will only be built if all P1 stories are complete with time remaining.
6. The `FEATURE_ANALYTICS_ENABLED` flag defaults to `false`; turning it off cleanly suppresses the analytics page without breaking anything else.
7. Average review time on the analytics page excludes ideas still in `SUBMITTED` status (i.e., only ideas with a final decision are counted).
8. Password complexity validation reuses the same Zod schema applied at registration — no separate policy is defined.

---

## Out of Scope

- Multi-stage or blind review processes (Phase 2)
- Scoring or rating systems for ideas (Phase 2)
- Email or push notifications triggered by status changes (Phase 2)
- Commenting between employees on ideas (PRD anti-goal)
- Changing a user's email address on the settings page
- Admins being able to edit an idea's content after submission
