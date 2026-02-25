# User Story: Multi-File Upload UI

**Story ID**: US-022
**Epic**: EPIC-V2-02 — Multi-Media Attachments
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: M
**Sprint**: Phase 3 — Step 2
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** submitter,
**I want to** drag-and-drop or browse to select up to 10 files when submitting or editing an idea,
**so that** I can attach supporting documents, images, or data files that give reviewers the full context for my proposal.

---

## Context & Motivation

Evidence-backed ideas are evaluated more thoroughly. A multi-file upload component (with clear size limits, file type display, and per-file removal) makes the submission process feel professional and lowers the barrier for attaching supporting material. V1's single-file input was insufficient for complex ideas that include diagrams, cost models, and references.

---

## Acceptance Criteria

1. **Given** `FEATURE_MULTI_ATTACHMENT_ENABLED=true`,
   **When** I open the idea submission form,
   **Then** I see a drag-and-drop drop zone labelled "Drag files here or click to browse — max 10 files, 25 MB each".

2. **Given** I drop or select files,
   **When** the files are accepted,
   **Then** each file appears in a list below the drop zone showing: file icon (by MIME type), file name, file size, and a remove button (×).

3. **Given** I try to add an 11th file,
   **When** the add action is triggered,
   **Then** the drop zone rejects the file and shows a toast: "Maximum 10 attachments per idea."

4. **Given** a file exceeds 25 MB,
   **When** the file is dropped,
   **Then** it is rejected client-side with an inline error: "[filename] exceeds the 25 MB limit."

5. **Given** I submit the form with valid files,
   **When** the Server Action processes the submission,
   **Then** each file is uploaded to Vercel Blob using `put()` and a corresponding `IdeaAttachment` record is created inside the same `$transaction` as the `Idea` record.

6. **Given** `FEATURE_MULTI_ATTACHMENT_ENABLED=false`,
   **When** I open the submission form,
   **Then** the V1 single-file input is shown (or no file input if `attachmentPath` is also deprecated) — the multi-file drop zone is absent.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                           | Expected Behavior                                                                                                                             |
| --- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | User drops a file with a `.exe` or `.sh` extension                 | Client-side MIME check rejects executable file types; server also validates MIME type against an allowlist                                    |
| 2   | One file in a batch fails to upload to Vercel Blob mid-transaction | The `$transaction` rolls back — no `Idea` record and no `IdeaAttachment` records are persisted; user sees: "Upload failed. Please try again." |
| 3   | Total batch size across all files exceeds 100 MB                   | Client-side check: sum all file sizes before upload; reject with "Total attachment size cannot exceed 100 MB."                                |
| 4   | User removes all selected files and submits                        | Submission proceeds with no attachments — `attachments` is an empty array; this is valid                                                      |

---

## UI / UX Notes

- Route: `/ideas/new` and `/ideas/[id]/edit`
- Drop zone: shadcn/ui `Card` styled as a dashed-border area, full-width, 120px min-height
- File type icons: Lucide icons — `FileText` (PDF/doc), `Image` (image types), `File` (other)
- Upload progress: per-file `Progress` bar (shadcn/ui) shown during active upload
- Remove button: `X` icon; only shown before form submission (cannot remove already-saved attachments from this component — deletion is done via US-025)
- Accepted MIME types: `image/*`, `application/pdf`, `text/plain`, `application/vnd.openxmlformats-officedocument.*`, `application/msword`, `application/vnd.ms-excel`

---

## Technical Notes

- Upload mechanism: each file is sent to a `POST /api/ideas/upload` Route Handler which calls `@vercel/blob`'s `put(filename, body, { access: 'private' })` and returns the blob URL.
- The form collects blob URLs client-side and passes the array to the `createIdea` Server Action as `attachmentUrls: string[]`.
- `createIdea` Server Action creates `IdeaAttachment` rows inside `prisma.$transaction`.
- File size enforcement: both client-side (`File.size`) and server-side (`Content-Length` header + Zod `maxSize` check).
- MIME type allowlist: defined in `constants/allowed-mime-types.ts` — used in both the client drop zone and the server Route Handler.
- **Feature Flag**: `FEATURE_MULTI_ATTACHMENT_ENABLED`.

---

## Dependencies

| Dependency                                           | Type  | Status                   | Blocker? |
| ---------------------------------------------------- | ----- | ------------------------ | -------- |
| US-021 — `IdeaAttachment` model                      | Story | Must be done first       | Yes      |
| `BLOB_READ_WRITE_TOKEN` env var configured in Vercel | Infra | Required for Vercel Blob | Yes      |
| US-023 — Attachment display on detail page           | Story | Must follow this story   | No       |

---

## Test Plan

### Manual Testing

- [ ] Drop 3 valid files → all appear in the list with names/sizes/remove buttons
- [ ] Drop 11th file → rejection toast "Maximum 10 attachments"
- [ ] Drop 30 MB file → inline error with filename
- [ ] Total batch > 100 MB → rejection message before upload attempt
- [ ] Submit form with files → idea created, each file appears on detail page
- [ ] Drop `.exe` file → rejected with error

### Automated Testing

- [ ] Unit: `validateFiles()` rejects files over 25 MB and `.exe` MIME types
- [ ] Unit: total size check rejects batch over 100 MB
- [ ] Integration: `POST /api/ideas/upload` returns blob URL for valid file
- [ ] Integration: `createIdea` with 3 attachment URLs creates 3 `IdeaAttachment` rows
- [ ] E2E: attach 2 files → submit → both attachments visible on idea detail page

---

## Definition of Done

- [ ] Drop zone renders on submission form
- [ ] Per-file validation (size, MIME, count) works client and server-side
- [ ] Files uploaded to Vercel Blob; `IdeaAttachment` rows created atomically
- [ ] Feature flag disables multi-upload cleanly
- [ ] `git commit: feat(media): multi-file upload UI and upload route`
