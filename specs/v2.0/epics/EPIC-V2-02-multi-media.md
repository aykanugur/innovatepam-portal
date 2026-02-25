# Epic: Multi-Media Support

**Epic ID**: EPIC-V2-02
**Owner**: Aykan Uğur — Admin
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Target Release**: V2.0 Phase 3 (~45 min)
**PRD Reference**: [specs/v2.0/prd-v2.0.md](../prd-v2.0.md) — Section 6

---

## 1. Summary

Replace V1's single `attachmentPath` field with a full multi-file attachment system. Employees can attach up to 10 files of varied types (PDF, images, documents, video) per idea. Files are uploaded to Vercel Blob Storage on form submission. A V1 data migration moves existing `attachmentPath` records into the new `IdeaAttachment` model. Private idea attachments are protected server-side via a proxy route. The detail page renders an attachment table with per-file download and inline image thumbnails.

---

## 2. Business Context

### 2.1 Strategic Alignment

- **Company Goal**: Increase the completeness and richness of submitted ideas in V2.0.
- **Product Vision Fit**: V1 forces submitters to pick one file or resort to external links. Multi-attachment removes that constraint and keeps all supporting evidence inside the platform.

### 2.2 Business Value

| Value Driver            | Description                                                                               | Estimated Impact                                       |
| ----------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Submission completeness | Submitters can include business case PDF + wireframe image + demo video in one submission | Reduces reviewer requests for supplementary materials  |
| Review efficiency       | All evidence in one place; reviewer does not leave the portal to find supporting files    | Saves ~3–5 min per review cycle                        |
| Platform trust          | Files are stored and access-controlled within EPAM infrastructure (Vercel Blob)           | Reduces reliance on personal drives and external links |

### 2.3 Cost of Delay

Leaving the single-attachment limit in place actively limits submission quality for complex ideas (e.g., "New Product/Service" and "Technical Innovation" categories). Submitters continue to work around the constraint via Slack links and personal drives, which breaks the platform's goal of being the single source of truth for innovation ideas.

---

## 3. Scope

### 3.1 In Scope

- `IdeaAttachment` Prisma model with `ideaId`, `blobUrl`, `fileName`, `mimeType`, `sizeBytes`, `uploadedAt`
- `attachments` relation added to the `Idea` model
- `attachmentPath` column deprecated (no longer written to; kept nullable in schema for V3.0 removal)
- V1 data migration script: reads non-null `attachmentPath` → creates `IdeaAttachment` row → nullifies `attachmentPath`
- New `AuditAction` enum values: `ATTACHMENT_ADDED`, `ATTACHMENT_DELETED`
- Upload UI on `/ideas/new`: multi-file picker + drag-and-drop; per-file thumbnail (images), file type icon, name, and size; individual file removal before submit
- Upload mechanics: files are sent to Vercel Blob on form submission (not eagerly); orphan pruning on failed submission
- Allowed types: PDF, PNG, JPG/JPEG, GIF, DOCX, XLSX, PPTX, MD, TXT, MP4, MOV
- Per-file size limit: ≤ 25 MB; total per idea: ≤ 100 MB; max files per idea: 10
- Detail page (`/ideas/[id]`): sortable attachment table (by name, size, upload date); download button per row; inline image thumbnail
- Private idea attachment protection: server-side proxy route validates session + role before streaming blob; direct blob URLs are not guessable by non-authorized users
- Feature flag: `FEATURE_MULTI_ATTACHMENT_ENABLED` (default `false`)

### 3.2 Out of Scope

- In-browser file preview beyond image thumbnails (e.g., PDF viewer, video player)
- Virus scanning / malware detection (deferred to V3.0)
- Attachment editing after idea submission (add/remove attachments post-submit is deferred to V3.0)
- Per-file access control (all files on an idea share the idea's `PUBLIC`/`PRIVATE` visibility)
- Physical removal of the deprecated `attachmentPath` column (scheduled for V3.0)

### 3.3 Assumptions

- Vercel Blob Storage is provisioned and `BLOB_READ_WRITE_TOKEN` is available as an environment variable
- MIME type validation uses file-byte inspection (e.g., `file-type` library), not extension name
- The V1 data migration runs as a standalone script (`scripts/migrate-attachments.ts`) executed once after deployment, not as part of `prisma migrate`
- `FEATURE_MULTI_ATTACHMENT_ENABLED=false` in production until migration is verified and QA is complete

---

## 4. User Personas

| Persona          | Role          | Primary Need                                                                            |
| ---------------- | ------------- | --------------------------------------------------------------------------------------- |
| Elif (Submitter) | EPAM employee | Attach all supporting files (PDF, image, video) to one idea without workarounds         |
| Deniz (Admin)    | Innovation PM | See all attachments clearly listed on the idea review panel; download each individually |

---

## 5. Feature Breakdown

### Feature 1: `IdeaAttachment` Model & Migration — Must Have

**Description**: Add the `IdeaAttachment` Prisma model, deprecate `attachmentPath` on `Idea`, add the `attachments` relation, add new `AuditAction` enum values, run the migration.

**User Stories**:

- [ ] As a developer, I can run the Prisma migration and have the `IdeaAttachment` table created with all required columns.
- [ ] As the system, when a new file is attached to an idea, an `IdeaAttachment` record is created and `AuditAction.ATTACHMENT_ADDED` is logged.

**Acceptance Criteria**:

1. `prisma migrate dev` applies cleanly; `IdeaAttachment` table exists with columns: `id`, `ideaId`, `blobUrl`, `fileName`, `mimeType`, `sizeBytes`, `uploadedAt`
2. `Idea` model has an `attachments` relation returning `IdeaAttachment[]`
3. `attachmentPath` column remains in the `Idea` table as nullable — no existing rows are broken
4. `AuditAction` enum contains `ATTACHMENT_ADDED` and `ATTACHMENT_DELETED`
5. `IdeaAttachment` rows are cascade-deleted when the parent `Idea` is deleted

**Estimated Effort**: XS (~8 min)

---

### Feature 2: V1 Attachment Data Migration — Must Have

**Description**: Write and execute a one-time script (`scripts/migrate-attachments.ts`) that reads every `Idea` with a non-null `attachmentPath`, creates a corresponding `IdeaAttachment` record, and nullifies `attachmentPath` on that row. The script logs skipped rows and is safe to re-run.

**User Stories**:

- [ ] As a developer running the migration script, V1 ideas with an `attachmentPath` are converted to `IdeaAttachment` records without data loss.
- [ ] As a developer, if the script encounters a corrupt `attachmentPath` URL, it logs the `ideaId` and continues without aborting the entire run.

**Acceptance Criteria**:

1. After running the script, zero `Idea` rows have a non-null `attachmentPath`
2. Every previously non-null `attachmentPath` value now exists as a `blobUrl` in an `IdeaAttachment` row with the correct `ideaId`
3. `mimeType` for migrated records is set to `"application/octet-stream"` (unknown — original type was not stored in V1); `fileName` is derived from the URL's last path segment
4. Script is idempotent: re-running it on an already-migrated database produces no changes and no errors
5. All migration failures are logged to stdout with `[SKIP] ideaId=<id> reason=<reason>`

**Estimated Effort**: S (~12 min)

---

### Feature 3: Multi-File Upload UI in Submission Form — Must Have

**Description**: Replace the V1 single-file input on `/ideas/new` with a multi-file attachment section. Supports file picker and drag-and-drop. Files are staged client-side and uploaded to Vercel Blob on form submission. Files can be removed individually before submitting.

**User Stories**:

- [ ] US-V2-02-a: As a submitter, I can select multiple files at once via the file picker or drag them onto the upload zone.
- [ ] US-V2-02-b: As a submitter, each staged file shows a thumbnail (images), a file type icon (other types), file name, and file size in human-readable format (e.g., "1.2 MB").
- [ ] US-V2-02-c: As a submitter, I can remove a staged file individually before submitting the form.
- [ ] US-V2-02-d: As a submitter, if I try to add an 11th file, I see a clear error and the file is not added to the staged list.
- [ ] US-V2-02-e: As a submitter, with `FEATURE_MULTI_ATTACHMENT_ENABLED=false`, I see the V1 single-file input with no changes.

**Acceptance Criteria**:

1. File picker and drag-and-drop both add files to a staged list; staged list updates without page reload
2. Images (PNG, JPG, GIF) show a thumbnail preview using `URL.createObjectURL()`
3. Non-image files show a file type icon determined by MIME type
4. Attempting to stage an 11th file shows: "Maximum of 10 attachments per idea." — the file is not added
5. Attempting to stage a file > 25 MB shows: "File must be under 25 MB." — the file is not added
6. Attempting to stage files whose total size would exceed 100 MB shows: "Total attachment size cannot exceed 100 MB." — the exceeding file is not added
7. Files are uploaded to Vercel Blob only when the form is submitted, not on file select
8. If the Vercel Blob upload fails for any file, the form shows: "File upload failed. Please try again." — no partial `IdeaAttachment` rows are left in the DB
9. With `FEATURE_MULTI_ATTACHMENT_ENABLED=false`, the V1 single-file `<input type="file">` is rendered unchanged

**Estimated Effort**: M (~18 min)

---

### Feature 4: Attachment Table on Idea Detail Page — Must Have

**Description**: Replace the V1 single attachment link on `/ideas/[id]` with a sortable attachment table. Image files show an inline thumbnail. Each row has a download button.

**User Stories**:

- [ ] US-V2-02-f: As a submitter or admin viewing an idea, I see all attachments listed in a table with file name, type, size, and upload date.
- [ ] US-V2-02-g: As a user, I can sort the attachment table by file name, size, or upload date.
- [ ] US-V2-02-h: As a user, image attachments show an inline thumbnail (≤ 80px height) in the table row.
- [ ] US-V2-02-i: As a user, clicking "Download" on any row triggers a file download of the correct blob.

**Acceptance Criteria**:

1. Attachment table renders on `/ideas/[id]` when `attachments.length > 0`
2. Columns: thumbnail/icon | file name | MIME type | size (human-readable) | upload date | download button
3. Table is sortable client-side by file name (alpha), size (numeric), and upload date (newest first default)
4. Image files (PNG, JPG/JPEG, GIF) display an `<img>` thumbnail in the first column; non-images show a file type icon
5. Download button triggers the browser's native file download using the `blobUrl`; for `PRIVATE` ideas the request passes through the proxy route
6. When `attachments.length === 0` (and V1 `attachmentPath` is also null), the section shows: "No attachments" — no empty table is rendered
7. V1 ideas that had `attachmentPath` migrated now render via `IdeaAttachment` — no regression in attachment display

**Estimated Effort**: S (~10 min)

---

### Feature 5: Private Attachment Proxy Route — Must Have

**Description**: A Route Handler at `GET /api/attachments/[id]` validates the requester's session and role against the parent idea's visibility before streaming the blob. Direct Vercel Blob URLs for private ideas are not exposed to unauthorized users.

**User Stories**:

- [ ] US-V2-02-j: As an unauthorized user attempting to access a private idea's attachment URL, I receive `403 Forbidden`.
- [ ] US-V2-02-k: As the authorized author or an admin, clicking "Download" on a private idea's attachment streams the file correctly.

**Acceptance Criteria**:

1. `GET /api/attachments/[id]` with no valid session → `401 Unauthorized`
2. `GET /api/attachments/[id]` with a SUBMITTER session for a PRIVATE idea they don't own → `403 Forbidden`
3. `GET /api/attachments/[id]` with a valid session (idea author, ADMIN, or SUPERADMIN) → streams the file with the correct `Content-Disposition: attachment; filename="[fileName]"` header
4. `GET /api/attachments/[id]` for a PUBLIC idea with any valid session → streams the file
5. `IdeaAttachment.blobUrl` for private ideas is never returned to the client directly — the detail page passes `/api/attachments/[id]` as the download href, not the raw blob URL

**Estimated Effort**: S (~7 min)

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)

| Dependency                                                       | Type     | Status            | Risk                                              |
| ---------------------------------------------------------------- | -------- | ----------------- | ------------------------------------------------- |
| EPIC-01 (Foundation) — Prisma, DB, Vercel Blob env setup         | V1       | Complete          | None                                              |
| EPIC-03 (Idea Submission) — `/ideas/new` form and Server Action  | V1       | Complete          | None                                              |
| Vercel Blob Storage provisioned (`BLOB_READ_WRITE_TOKEN` in env) | External | Must be confirmed | Med — if not provisioned, upload fails at runtime |

### 6.2 Blocking (Downstream)

| Dependent Epic                  | Impact if EPIC-V2-02 is Delayed                                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| EPIC-V2-03 (Draft Management)   | Drafts may include staged attachments — the multi-attachment model should be in place before draft save/resume is built to avoid double migration work |
| EPIC-V2-04 (Multi-Stage Review) | Admin review panel must render the attachment table for each reviewed idea — depends on Feature 4 being complete                                       |

---

## 7. UX / Design

- **Upload zone**: A dashed-border drag-and-drop area with a "Browse files" button inside. Label: "Attach files (max 10 · 25 MB each · 100 MB total)". Accepted types listed below the zone in muted text.
- **Staged file list**: Horizontal card row per file — thumbnail/icon (48×48px) | name (truncated at 30 chars) | size | "×" remove button.
- **Attachment table on detail page**: Uses the existing shadcn/ui `Table` component. Default sort: newest upload first. Thumbnail column is 64px wide.
- **Error messages**: Displayed inline below the upload zone as red helper text. One message per constraint violation (count, per-file size, total size, unsupported type).
- **Empty state on detail page**: Single-line muted text "No attachments." — no empty table skeleton.
- **No new design mockup required** — follow existing shadcn/ui patterns; the upload zone can use shadcn `Card` + a `<label>` with `htmlFor` pointing to a visually hidden `<input type="file" multiple>`.

---

## 8. Technical Notes

- Use the `@vercel/blob` SDK (`put()` for upload, `del()` for pruning orphaned blobs on failed submission).
- MIME type validation must inspect file bytes, not just the file extension. Use the `file-type` npm package (ESM-compatible). Validate server-side in the Route Handler or Server Action that processes the upload.
- The proxy route (`/api/attachments/[id]`) fetches the blob via `fetch(blobUrl)` server-side and pipes the response body to the client using `ReadableStream`. Do not redirect the client to the blob URL for private ideas.
- The migration script (`scripts/migrate-attachments.ts`) must be run via `tsx scripts/migrate-attachments.ts` after the Prisma migration is applied. Add it to the deployment runbook.
- When `FEATURE_MULTI_ATTACHMENT_ENABLED=false`, the submission form continues to use the V1 `attachmentPath` single-file input. Both code paths must work simultaneously during the feature flag rollout window.

---

## 9. Milestones & Timeline

| Milestone             | Features Included | Target                           | Exit Criteria                                                                                                               |
| --------------------- | ----------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| M1 — DB & Migration   | Features 1 & 2    | Phase 3 start                    | Prisma migration applied; migration script runs on staging data without errors                                              |
| M2 — Upload UI        | Feature 3         | Phase 3 mid                      | Multi-file upload works end-to-end on `/ideas/new`; all size/count constraints enforced                                     |
| M3 — Display & Access | Features 4 & 5    | Phase 3 complete (~45 min total) | Attachment table renders on detail page; proxy route enforces private visibility; V1 migrated attachments display correctly |

---

## 10. Success Metrics

| Metric                        | Target                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------ |
| V1 migration completeness     | Zero non-null `attachmentPath` rows after migration script                     |
| File count enforcement        | Server rejects attempt to upload an 11th file with `422`                       |
| MIME type spoofing blocked    | A `.pdf`-renamed `.exe` is rejected server-side                                |
| Private attachment protection | Non-authorized `GET /api/attachments/[id]` returns `403`                       |
| V1 regression                 | All pre-Phase 3 ideas display their migrated attachment without errors         |
| Test coverage                 | ≥ 80% line coverage on upload Server Action, proxy route, and migration script |

---

## 11. Risks & Mitigations

| #   | Risk                                                                                                             | Likelihood | Impact | Mitigation                                                                                                                                                         |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Vercel Blob `BLOB_READ_WRITE_TOKEN` not provisioned before deployment                                            | Med        | High   | Block deployment of this epic behind env var check at startup; throw at build-time if flag is enabled and token is missing                                         |
| 2   | Partial upload leaves orphaned blobs in Vercel Blob Storage if the form submission fails mid-way                 | Med        | Low    | Collect all blob URLs from successful uploads in memory; on any Server Action error, call `del()` on each URL before throwing                                      |
| 3   | V1 migration script corrupts data by nullifying `attachmentPath` before confirming `IdeaAttachment` row creation | Low        | High   | Wrap each row's migration in a Prisma transaction: create `IdeaAttachment` first, then nullify `attachmentPath`. If either step fails, the transaction rolls back. |
| 4   | `file-type` package adds non-trivial bundle size in a serverless function                                        | Low        | Low    | Import `file-type` only in the server-side upload handler (Route Handler / Server Action). Tree-shaking and server-only import prevents client bundle impact.      |

---

## 12. Open Questions

| #   | Question                                                                                                                                                                                                        | Owner      | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1   | Should the attachment table on the detail page be paginated if an idea has > 5 attachments, or always show all 10? (Recommendation: show all — 10 rows is not performance-critical for a detail page)           | Aykan Uğur | Open   |
| 2   | Should attachment deletion by the idea author be supported post-submission in V2.0, or only before submission? (PRD says deferred to V3.0 — confirm this is still the intent)                                   | Aykan Uğur | Open   |
| 3   | For the V1 migration, how should `fileName` be derived from a Vercel Blob URL that may not have a meaningful last path segment? (Recommendation: fall back to `"attachment"` if the segment is a UUID or empty) | Aykan Uğur | Open   |

---

## Appendix: Revision History

| Version | Date       | Author     | Changes                                                           |
| ------- | ---------- | ---------- | ----------------------------------------------------------------- |
| 0.1     | 2026-02-25 | Aykan Uğur | Initial draft — all sections complete based on PRD V2.0 Section 6 |
