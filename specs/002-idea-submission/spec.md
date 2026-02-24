# Feature Specification: Idea Submission & Discovery

**Feature Branch**: `002-idea-submission`  
**Epic**: EPIC-03  
**Created**: 2026-02-24  
**Status**: Draft  
**Stories**: US-008 | US-009 | US-010 | US-011  
**Input**: Epic 03 — authenticated employees submit ideas, browse the idea list, view idea details, and track their own submissions.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Submit an Idea (Priority: P1)

An authenticated employee visits the idea submission form, fills in a title, description, category, and visibility preference, and optionally attaches a supporting file. On submission the idea is saved and the employee lands on the idea's detail page to confirm it was recorded.

**Why this priority**: Idea submission is the single core value action of the portal. No other story has ideas to display without it.

**Independent Test**: A logged-in employee fills the form with valid inputs and clicks "Submit Idea." The resulting detail page shows the submitted content and a "Submitted" status badge. The idea is persisted and visible in the admin dashboard.

**Acceptance Scenarios**:

1. **Given** I am logged in and visit the idea submission page, **When** I fill all required fields and submit, **Then** a new idea is created with status "Submitted" and I am taken to that idea's detail page.
2. **Given** I leave the Title field empty and submit, **When** the form validates, **Then** I see an inline error "Title is required" and no idea is created.
3. **Given** I enter a description longer than 2,000 characters, **When** I attempt to submit, **Then** I see "Description must be under 2,000 characters" and submission is blocked.
4. **Given** I click "Submit Idea" twice in quick succession, **When** the second click fires, **Then** only one idea is created — the button is disabled after the first click.
5. **Given** file attachment is enabled and I attach an unsupported file type or a file over 5 MB, **When** I select the file, **Then** I see "Only PDF, PNG, JPG, DOCX, and MD files under 5 MB are accepted."
6. **Given** file attachment is enabled and I attach a valid file, **When** the idea is submitted, **Then** the file is stored and accessible from the idea's detail page.
7. **Given** file attachment is disabled, **When** I view the form, **Then** the file attachment field is not visible.
8. **Given** an unauthenticated user navigates to the submission page, **When** the page loads, **Then** they are redirected to the login page with the submission URL preserved as the post-login destination.

---

### User Story 2 — Browse All Public Ideas (Priority: P1)

A logged-in employee visits the idea list and sees a paginated feed of public ideas from all colleagues. They can filter by category to narrow results and click any card to read the full idea.

**Why this priority**: Discovery prevents duplicate submissions and drives cross-team collaboration. It is the primary ongoing engagement surface after the initial submission.

**Independent Test**: A logged-in employee opens the idea list. Ideas from other employees appear ordered newest-first. Selecting "Cost Reduction" in the category filter shows only matching ideas and the URL reflects the filter.

**Acceptance Scenarios**:

1. **Given** I am logged in and visit the idea list, **When** the page loads, **Then** I see all public ideas (and my own private ideas) ordered newest-first, showing at most 20 per page.
2. **Given** there are more than 20 ideas, **When** I navigate to the next page, **Then** the next 20 ideas load without a full page refresh.
3. **Given** I select a category filter, **When** the filter is applied, **Then** only ideas in that category are shown and the selected filter is reflected in the page URL.
4. **Given** no ideas match the active filter, **When** the list renders, **Then** I see "No ideas found. Be the first to submit one!" with a "Submit Idea" button.
5. **Given** an idea has been accepted, **When** it appears in the list, **Then** it shows a green "Accepted" badge.
6. **Given** I am an ADMIN or SUPERADMIN, **When** I view the list, **Then** I also see private ideas submitted by all employees.
7. **Given** an idea is private and was submitted by another employee, **When** I am a SUBMITTER viewing the list, **Then** that idea does not appear.

---

### User Story 3 — View Idea Detail (Priority: P1)

A logged-in employee clicks an idea to read its full content, see who submitted it, and — if the idea has been reviewed — read the reviewer's decision and comment.

**Why this priority**: The detail page is the canonical view for any idea. It is the post-submission landing page (US-008 redirects here) and the primary view for the evaluation workflow (EPIC-04).

**Independent Test**: A logged-in employee navigates to a public idea's detail URL directly. All fields display correctly. If a review decision has been recorded, the decision card (outcome + reviewer + comment) is visible.

**Acceptance Scenarios**:

1. **Given** I visit the detail page of a public idea, **When** the page loads, **Then** I see the full title, description, author name, category, visibility, status badge, and submission date.
2. **Given** the idea has been reviewed, **When** I view the detail page, **Then** I see a review card with the decision (Accepted / Rejected), the reviewer's name, review date, and their written comment.
3. **Given** file attachment is enabled and the idea has an attachment, **When** I view the detail page, **Then** I see a "Download Attachment" link for the file.
4. **Given** I am the author of a submitted (not yet reviewed) idea, **When** I view its detail page, **Then** I see a "Delete" button; clicking it removes the idea after a confirmation prompt.
5. **Given** I visit the detail page of a private idea that belongs to another employee and I am not an admin, **When** the page loads, **Then** I receive a "Not Found" response.
6. **Given** the idea ID does not exist, **When** I navigate to its URL, **Then** I receive a "Not Found" response.

---

### User Story 4 — Track My Own Submissions (Priority: P1)

A logged-in employee visits their personal ideas page to see only their own submissions — both public and private — along with each idea's current status.

**Why this priority**: Employees need a focused personal view separate from the global list to monitor their submissions' review progress.

**Independent Test**: A logged-in employee opens "My Ideas." Only their own submissions appear, including private ones. Another employee's ideas are absent. An employee with no ideas sees the empty state with a submission CTA.

**Acceptance Scenarios**:

1. **Given** I visit my ideas page while logged in, **When** the page loads, **Then** I see only ideas I submitted, ordered newest-first with status badges.
2. **Given** I have submitted both public and private ideas, **When** I view my ideas page, **Then** both appear — visibility is not filtered on this personal view.
3. **Given** I have never submitted any ideas, **When** my ideas page loads, **Then** I see "You haven't submitted any ideas yet." with a "Submit Your First Idea" button.
4. **Given** I click an idea card on my ideas page, **When** navigating, **Then** I am taken to that idea's detail page.

---

### Edge Cases

- A file attachment upload fails mid-submission — the idea is saved without an attachment and the employee sees a non-blocking warning: "File upload failed. Idea saved without attachment."
- An employee submits the form while their session has expired — they are redirected to login; on returning the form state is lost (no draft persistence in P1 scope).
- A page number typed manually in the URL exceeds the total pages — the system shows an empty state rather than an error.
- An admin deletes a reviewed idea — the review record is removed together with the idea.
- Attachment link in blob storage becomes unavailable — the detail page shows "Attachment unavailable" instead of a broken link.

---

## Requirements _(mandatory)_

### Functional Requirements

**Idea Submission (US-008)**

- **FR-001**: Only authenticated employees may access the idea submission form; unauthenticated visitors are redirected to login.
- **FR-002**: The submission form MUST include Title (required, max 100 characters), Description (required, max 2,000 characters), Category (required, one of: Process Improvement, New Product/Service, Cost Reduction, Employee Experience, Technical Innovation), and Visibility (required: Public or Private).
- **FR-003**: Character counters MUST be shown for Title and Description fields so employees can see remaining capacity.
- **FR-004**: The submit button MUST be disabled after the first click to prevent duplicate submissions.
- **FR-005**: When `FEATURE_FILE_ATTACHMENT_ENABLED=true`, an optional file attachment field MUST be presented; accepted formats are PDF, PNG, JPG, DOCX, and MD; maximum file size is 5 MB.
- **FR-006**: When `FEATURE_FILE_ATTACHMENT_ENABLED=false`, the attachment field MUST NOT be rendered.
- **FR-007**: On successful submission, the idea MUST be created with status "Submitted" and the employee MUST be redirected to the idea's detail page.
- **FR-008**: All validation errors MUST be shown inline beside the relevant field before any network request is made.

**Idea List (US-009)**

- **FR-009**: The idea list MUST display public ideas from all employees plus the viewing employee's own private ideas, ordered newest-first.
- **FR-010**: ADMIN and SUPERADMIN users MUST see all ideas regardless of visibility.
- **FR-011**: The list MUST display at most 20 ideas per page with "Previous / Page X of Y / Next" pagination controls.
- **FR-012**: Each idea card MUST show: title, author name, category, status badge (color-coded), and relative submission time.
- **FR-013**: A category filter MUST be available; applying it narrows results to matching ideas and updates the page URL with the selected filter.
- **FR-014**: When no ideas match the active filter, an empty state MUST be shown with a "Submit Idea" call-to-action.
- **FR-015**: Status badge colors MUST follow: Submitted=gray, Under Review=yellow, Accepted=green, Rejected=red.

**Idea Detail (US-010)**

- **FR-016**: The detail page MUST display: title, full description, author display name, category, visibility, status badge, and submission date.
- **FR-017**: When the idea has a review record, the detail page MUST display the review decision, reviewer name, review date, and the reviewer's written comment.
- **FR-018**: When `FEATURE_FILE_ATTACHMENT_ENABLED=true` and the idea has an attachment, a "Download Attachment" link MUST be shown.
- **FR-019**: An employee viewing their own idea with status "Submitted" MUST see a "Delete" button; deletion MUST require a confirmation step.
- **FR-020**: ADMIN and SUPERADMIN users MUST be able to delete any idea.
- **FR-021**: Private ideas belonging to other employees MUST return "Not Found" to SUBMITTER-role viewers.
- **FR-022**: Non-existent idea IDs MUST return "Not Found."

**My Ideas (US-011)**

- **FR-023**: The personal ideas page MUST show only the authenticated employee's own submissions — both public and private — ordered newest-first.
- **FR-024**: When the employee has no submissions, an empty state with a "Submit Your First Idea" button MUST be displayed.
- **FR-025**: Each card on the personal list MUST navigate to the idea's detail page on click.

**Cross-cutting**

- **FR-026**: All mutations (create, delete) MUST be logged as structured events for audit purposes.
- **FR-027**: No unauthenticated request may read or write idea data.

---

### Key Entities

- **Idea**: The core record of an employee's submission. Attributes: title, description, category, visibility (Public/Private), status (Submitted / Under Review / Accepted / Rejected), optional attachment reference, author, timestamps.
- **IdeaReview**: The outcome of a reviewer's evaluation of an idea. Attributes: decision (Accepted/Rejected), mandatory written comment, reviewer identity, review date. One review per idea maximum.
- **File Attachment**: An optional binary asset linked to an idea. Stored externally; the Idea record holds only a reference URL. Governed by the `FEATURE_FILE_ATTACHMENT_ENABLED` flag.

---

## Assumptions

- Draft auto-save is out of scope for this epic (P3 nice-to-have).
- Inline search across idea titles/descriptions is out of scope (stretch goal for a later sprint).
- Editing a submitted idea is out of scope; employees may delete and re-submit.
- Pagination is server-side with URL-based state; no infinite scroll in P1.
- The five category values listed in FR-002 are fixed for this release.
- "Private" visibility means visible only to the author and all admin roles.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An employee can complete the idea submission form and reach the confirmation detail page in under 2 minutes under normal conditions.
- **SC-002**: The idea list page loads and displays content for a returning employee in under 3 seconds on a standard connection.
- **SC-003**: 95% of form submissions succeed on the first attempt (validation errors are caught client-side before any network request).
- **SC-004**: An employee can locate a specific idea using the category filter without needing to paginate through more than one page.
- **SC-005**: Zero ideas submitted by Employee A appear on Employee B's "My Ideas" page — personal view isolation is absolute.
- **SC-006**: Private ideas owned by other employees appear in zero SUBMITTER-role page loads — visibility enforcement has no exceptions.
