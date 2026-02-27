# Feature Specification: Multi-Media Attachments

**Feature Branch**: `001-multi-media-attachments`
**Created**: 2026-02-26
**Status**: Draft
**Epic**: EPIC-V2-02
**Stories**: US-021, US-022, US-023, US-024, US-025

---

## Clarifications

### Session 2026-02-26

- Q: Does "editing" an idea allow submitters to add/remove attachments after submission, or only while the idea is still a draft? → A: Draft-only — submitters can add or remove files only before first submission; once an idea is submitted the upload UI is read-only for submitters.
- Q: Can an authenticated submitter who did not author an idea download its attachments if the idea is public? → A: Yes — any authenticated user may download attachments on public ideas; only attachments on non-public ideas are restricted to the author and admins.
- Q: Does the system have a persisted draft state, or is attachment add/remove only available during the initial creation form flow? → A: No draft state exists — attachment add/remove is only available during the idea creation form, before the idea record is first saved.
- Q: What is the exact accepted file type allowlist? → A: Strict named list — images (`image/*`), PDF, plain text (`.txt`), Markdown (`.md`), Word (`.doc`, `.docx`), Excel (`.xls`, `.xlsx`). No other types accepted.

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Attachment Data Model & V1 Data Preservation (Priority: P1)

The system must store attachment metadata as a first-class record so that each file can be individually tracked, retrieved, and deleted. All previously submitted ideas that already have a single file attached (V1 data) must have that file preserved under the new model without any data loss.

**Why this priority**: All other stories in this epic depend on the attachment record structure existing. Without this foundation, no other attachment feature can function. V1 data migration ensures continuity for existing users.

**Independent Test**: Apply the schema change and run the migration script. Confirm that existing ideas with attached files now have a corresponding attachment record with the correct file name, and that ideas without attachments are unaffected. Confirm that deleting an idea also removes its attachment records automatically.

**Acceptance Scenarios**:

1. **Given** the new attachment record structure is in place, **When** an idea that previously had a single attached file is inspected, **Then** an attachment record exists for it with the file name derived from the stored file path, an unknown size marker (`0`), and an unknown type marker.
2. **Given** an idea with no previously attached file, **When** the migration runs, **Then** no attachment record is created for that idea.
3. **Given** an idea with attachment records, **When** the idea is permanently deleted, **Then** all its attachment records are removed automatically.
4. **Given** the migration script is run a second time, **When** execution completes, **Then** no duplicate attachment records are created — the operation is idempotent.

---

### User Story 2 — Multi-File Upload on Idea Submission (Priority: P1)

As a submitter, I want to attach up to 10 supporting files when creating an idea, so that reviewers have all the context they need — diagrams, cost models, references — without requiring a follow-up.

**Why this priority**: Attachment upload is the primary user-facing capability of this epic. Without it, no attachments can enter the system for new ideas. Supporting evidence directly improves idea evaluation quality.

**Independent Test**: Navigate to the idea creation form with the multi-attachment feature enabled. Drop three files onto the upload area. Confirm each file appears with its name and size. Submit the form and verify the idea is created with all three files accessible on the detail page.

**Acceptance Scenarios**:

1. **Given** the multi-attachment feature is enabled, **When** I open the idea creation form, **Then** I see a file upload area labelled to indicate the limits: maximum 10 files, 25 MB per file.
2. **Given** I select or drop files within the limits, **When** the files are accepted, **Then** each file appears in a list showing its name, size, and a remove button.
3. **Given** I attempt to add an 11th file, **When** the action is triggered, **Then** the file is rejected and I see a message: "Maximum 10 attachments per idea."
4. **Given** a file exceeds 25 MB, **When** it is dropped onto the upload area, **Then** it is rejected immediately with a message naming the file and stating it exceeds the size limit.
5. **Given** the total size across all selected files exceeds 100 MB, **When** I attempt to add another file that would breach this total, **Then** I am shown a message: "Total attachment size cannot exceed 100 MB."
6. **Given** I submit the form with valid files, **When** the submission is processed, **Then** each file is stored securely and a corresponding attachment record is created — either all succeed together or none are persisted (all-or-nothing).
7. **Given** one file in a batch fails to store, **When** the submission is processed, **Then** neither the idea nor any of the attachment records are saved, and I see: "Upload failed. Please try again."
8. **Given** I submit the form with no files selected, **When** the idea is created, **Then** the idea is saved successfully with no attachments — file attachment is optional.
9. **Given** the multi-attachment feature is disabled, **When** I open the creation form, **Then** the multi-file upload area is absent and the previous single-file experience (if applicable) is shown.
10. **Given** I try to attach a file with an executable type (e.g., `.exe`, `.sh`), **When** the file is selected, **Then** it is rejected with a message indicating the file type is not permitted.

---

### User Story 3 — Attachment List on Idea Detail Page (Priority: P1)

As a submitter or admin viewing an idea, I want to see a list of all attached files with download links on the idea detail page, so that I can access supporting documents without leaving the idea view.

**Why this priority**: Attachments are only valuable if they are accessible at the point of evaluation. Without this story, uploaded files cannot be reached by reviewers. The upload capability is meaningless without a way to view and download the resulting files.

**Independent Test**: Open an idea that has three attached files. Confirm the detail page shows an "Attachments" section listing all three files with names, sizes, and upload dates. Click a download link and confirm the file downloads correctly. Open an idea with no attachments and confirm no "Attachments" section appears.

**Acceptance Scenarios**:

1. **Given** an idea has one or more attachments, **When** the idea detail page loads, **Then** an "Attachments" section is shown with one row per file displaying: file name (as a download link), human-readable file size, and upload date.
2. **Given** an idea has no attachments, **When** the idea detail page loads, **Then** no "Attachments" section is shown — not an empty section or a "no files" placeholder.
3. **Given** a download link is clicked, **When** the browser follows the link, **Then** the file is served through a secure route — the underlying private storage URL is never exposed to the browser.
4. **Given** an attachment was migrated from V1 with no recorded file size, **When** the attachment list is shown, **Then** the size column displays "—" rather than "0 B".
5. **Given** a file name is very long, **When** it is displayed in the list, **Then** it is truncated with an ellipsis and the full name is visible on hover.
6. **Given** the multi-attachment feature is disabled, **When** the idea detail page loads, **Then** the new "Attachments" section is absent.

---

### User Story 4 — Secure Private Attachment Download (Priority: P1)

As an authenticated user with permission to view an idea, I want attachment downloads to be served through a protected server route, so that private files are never directly accessible to unauthenticated users or users without the right to view the idea.

**Why this priority**: Security is non-negotiable. If attachments can be accessed by unauthenticated users or users without view rights, the privacy of submitted ideas is compromised. This story is required before the download links from User Story 3 can be safely used.

**Independent Test**: Log out and attempt to access a direct attachment download URL. Confirm a 401 response is returned. Log in as a submitter who did not author the idea and attempt to download an attachment for a non-public idea. Confirm a 403 response is returned.

**Acceptance Scenarios**:

1. **Given** an authenticated user who has the right to view an idea, **When** they request to download an attachment for that idea, **Then** the file is served with correct content type and as a named download — no raw storage URL is exposed.
2. **Given** a user who is not logged in, **When** they attempt to download any attachment, **Then** they receive a "401 Unauthorized" response.
3. **Given** an authenticated submitter who did not create the idea, **When** the idea is public and they attempt to download an attachment, **Then** the download is permitted.
4. **Given** an authenticated submitter who did not create the idea, **When** the idea is non-public and they attempt to download an attachment, **Then** they receive a "403 Forbidden" response.
5. **Given** an admin or superadmin, **When** they attempt to download any attachment, **Then** the download is permitted regardless of idea ownership.
6. **Given** an attachment ID that does not exist, **When** a download is requested, **Then** a "404 Not Found" response is returned.
7. **Given** the underlying file has been removed from storage but the attachment record still exists, **When** a download is requested, **Then** a "502 Bad Gateway" response is returned with the message "File is no longer available."
8. **Given** the multi-attachment feature is disabled, **When** an attachment download is requested via the secure route, **Then** a "404 Not Found" response is returned.

---

### User Story 5 — Admin Delete Individual Attachment (Priority: P2)

As an admin, I want to delete individual attachments from an idea via the review panel, so that I can remove inappropriate or incorrect files without deleting the entire idea or asking the submitter to resubmit.

**Why this priority**: Admins occasionally encounter ideas with incorrect, sensitive, or problematic files. Without targeted deletion, the only remediation is to reject the entire idea. This capability gives admins surgical control. It is P2 because it improves admin workflow but does not block the core attachment feature.

**Independent Test**: Log in as an admin and open an idea with two attachments. Click the delete icon on one attachment, confirm the dialog, and verify: only that attachment is removed from the list, the other attachment remains, and the idea itself is unchanged.

**Acceptance Scenarios**:

1. **Given** an admin views the attachments section on an idea and the feature is enabled, **When** the section loads, **Then** a delete icon appears next to each attachment row.
2. **Given** an admin clicks the delete icon, **When** the confirmation dialog is accepted, **Then** the attachment record is removed from the system and the file is removed from storage. The attachment disappears from the list without a full page reload.
3. **Given** the storage delete operation fails, **When** the deletion is processed, **Then** the attachment record is still removed from the system, the file link disappears from the list, and the admin sees a warning: "Attachment record removed but the file could not be deleted from storage."
4. **Given** a submitter attempts to delete an attachment after submission, **When** the delete action is attempted, **Then** the request is rejected with "403 Forbidden" — post-submission deletion is admin-only.
5. **Given** an admin deletes the last attachment on an idea, **When** the deletion is confirmed, **Then** the "Attachments" section disappears from the idea detail page.
6. **Given** two admins simultaneously attempt to delete the same attachment, **When** the second delete arrives after the record is already gone, **Then** the response is treated as a successful delete — the operation is idempotent.

---

### Edge Cases

- What happens when a user drops a mix of valid and invalid file types at the same time? Valid files are accepted; invalid files are rejected individually with per-file error messages.
- How does the system handle a network interruption mid-upload? The all-or-nothing transaction ensures no partial state is persisted; the user sees a generic retry message.
- What happens when an idea is permanently deleted? All attachment records for that idea are removed automatically via cascading delete.
- What happens if the feature flag is toggled off after attachments have already been uploaded? Existing attachment records remain in the database; they are simply not displayed or accessible until the flag is re-enabled.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST maintain a dedicated attachment record for each uploaded file, storing: file name, file size in bytes, MIME type, storage URL, the idea it belongs to, the user who uploaded it, and the upload timestamp.
- **FR-002**: The system MUST cascade-delete all attachment records when their parent idea is deleted.
- **FR-003**: The system MUST preserve all previously uploaded single-file attachments from V1 ideas as attachment records, without data loss, via a one-time migration.
- **FR-004**: The migration MUST be idempotent — running it multiple times MUST NOT create duplicate records.
- **FR-005**: The system MUST allow submitters to attach up to 10 files during the idea creation flow, before the idea record is first saved. The system has no persisted draft state; the attachment upload and removal controls exist only on the creation form.
- **FR-006**: Each individual file MUST NOT exceed 25 MB.
- **FR-007**: The total combined size of all attachments per submission MUST NOT exceed 100 MB.
- **FR-008**: The system MUST enforce a strict file type allowlist on both the client and server: images (`image/*`), PDF (`application/pdf`), plain text (`text/plain`), Markdown (`text/markdown` / `.md`), Word (`.doc`, `.docx`), and Excel (`.xls`, `.xlsx`). All other file types, including executables and scripts, MUST be rejected.
- **FR-009**: All files in a submission batch MUST be stored and their records created atomically — either all succeed or none are persisted.
- **FR-010**: The system MUST serve attachment downloads through a secure authenticated route — raw storage URLs MUST NOT be exposed to the browser.
- **FR-011**: Unauthenticated users MUST receive a 401 response when attempting to download any attachment.
- **FR-012**: Any authenticated user MAY download attachments for public ideas. A submitter MUST NOT be able to download attachments for non-public ideas they did not author — only the idea's author and admins/superadmins may access those.
- **FR-013**: Admins and superadmins MUST be able to download any attachment regardless of idea ownership or visibility.
- **FR-014**: The idea detail page MUST display all attachment records for an idea in a scannable list with file name (as a download link), size, and upload date.
- **FR-015**: The attachments section MUST be absent (not empty) when an idea has no attachments.
- **FR-016**: Admins MUST be able to delete individual attachments from any idea via the review panel.
- **FR-017**: When an attachment is deleted, both the attachment record and the underlying stored file MUST be removed. If only the storage delete fails, the record MUST still be removed and the admin MUST be notified.
- **FR-018**: Submitters MUST NOT be able to add or delete attachments once an idea has been submitted (i.e., idea status is no longer draft). The pre-submission remove button (×) in the upload UI is the only self-service removal mechanism available to submitters.
- **FR-019**: All attachment functionality MUST be gated behind a `FEATURE_MULTI_ATTACHMENT_ENABLED` feature flag. When the flag is off, no attachment upload, display, or download capabilities are accessible.
- **FR-020**: Each deletion event performed by an admin MUST be recorded in the system audit log.

### Key Entities

- **IdeaAttachment**: Represents a single uploaded file associated with an idea. Key attributes: unique identifier, reference to the idea, stored file URL, original file name, file size in bytes, MIME type, reference to the uploading user, upload timestamp. An idea can have zero or many attachments.
- **Idea** (extended): An existing entity that now has a relationship to zero or many `IdeaAttachment` records. The legacy single-file field remains but is no longer written by new submissions.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A submitter can attach up to 10 files to an idea in a single submission without more than 3 user interactions: (1) selecting or dropping files — drag-and-drop counts as a single interaction (the drop event); (2) reviewing the pending file list (passive — no additional click required); (3) submitting the form.
- **SC-002**: Files outside the accepted type list or above the size limit are rejected before any upload attempt begins — zero invalid files reach the server.
- **SC-003**: 100% of V1 ideas with an existing single attachment have a corresponding attachment record after the migration script completes.
- **SC-004**: Attachment downloads are unavailable to unauthenticated users — 100% of unauthenticated download attempts return a 401 response.
- **SC-005**: An admin can delete an individual attachment from an idea in under 10 seconds from first click to confirmation.
- **SC-006**: If a batch upload fails mid-way, 0% of partial data (incomplete idea records or orphan attachment records) remain in the system.
- **SC-007**: The idea detail page with 10 attachments loads in under 3 seconds (LCP, p95 on a standard broadband connection), matching the existing idea detail page baseline. Verified manually during the Phase 8 quickstart validation (T018).

---

## Assumptions

- Accepted file types are a strict named allowlist: images (`image/*`), PDF, plain text (`.txt`), Markdown (`.md`), Word (`.doc`, `.docx`), and Excel (`.xls`, `.xlsx`). All other types — including executables and scripts — are rejected.
- File storage is handled by a private blob storage service already integrated with the project (`BLOB_READ_WRITE_TOKEN` environment variable is available).
- The system has no persisted draft idea state. Ideas are created and saved in a single form submission. Attachment add/remove controls are therefore only present on the creation form — not on any post-submission edit page.
- Submitters cannot add or delete attachments after an idea has been submitted — only admins can delete post-submission. The remove (×) button in the creation form upload UI is the only self-service removal mechanism available to submitters.
- The feature flag `FEATURE_MULTI_ATTACHMENT_ENABLED` controls all five stories in this epic. When disabled, the system behaves as V1 (single-file input or no input).
- The V1 migration script is run once by a developer during deployment; it is not an automated pipeline step.
- No notification is sent to the idea submitter when an admin deletes one of their attachments. Admin attachment deletion is a moderation action; only the admin sees the confirmation.
- File sizes are displayed using binary units: below 1 KB → "< 1 KB"; below 1 MB → "X.X KB" (one decimal place); 1 MB or more → "X.X MB" (one decimal place). A V1-migrated row with `fileSize === 0` displays "—".
- Upload dates are displayed in the browser's local timezone using short-date format (e.g., "25 Feb 2026") via `toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })`.
- Long filenames are truncated with CSS `text-overflow: ellipsis`; the full filename is available on hover via the HTML `title` attribute.
- The `attachmentPath` column on `Idea` is retained indefinitely as a soft-deprecated read-only field. No column removal is planned in this epic.
- Deleting an attachment removes the row from the UI after the server responds successfully. No optimistic removal is used; the row shows a loading/disabled state while the delete request is in flight.
- `FEATURE_MULTI_ATTACHMENT_ENABLED` gates only user-facing upload, download, and delete capabilities. The V1 migration script (`scripts/migrate-v1-attachments.ts`) is a developer CLI tool and runs regardless of the feature flag value.
- V1 `attachmentPath` values are assumed to be valid Vercel Blob URLs. Non-URL or relative path values are migrated as-is and will return a 502 on download, matching the behaviour for a deleted blob.
- The V1 migration script is safe to run against a live production database while the application is serving traffic. All operations are idempotent `upsert` calls; no rows are locked for extended periods.
- Zero-byte files are rejected by the drop-zone component client-side ("File is empty.") and by the upload Route Handler server-side with 400 `{ error: 'File is empty.' }`.
- Admins may delete attachments regardless of the parent idea's status (SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED).
- The drop-zone upload component supports keyboard interaction: the file-browse trigger is focusable and activatable via Enter/Space. When a file is added or removed from the pending list, an `aria-live` region announces the change for screen readers.
