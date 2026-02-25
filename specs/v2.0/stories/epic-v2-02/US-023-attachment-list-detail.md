# User Story: Attachment List on Idea Detail Page

**Story ID**: US-023
**Epic**: EPIC-V2-02 — Multi-Media Attachments
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 3 — Step 3
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** submitter or admin viewing an idea,
**I want to** see a list of all attachments on the idea detail page with download links,
**so that** I can access the supporting files without navigating away from the idea.

---

## Context & Motivation

Attachments are only valuable if they are easily accessible at the point of evaluation. This story surfaces all `IdeaAttachment` records for an idea in a clean, scannable table on the detail page, with download links routed through the secure proxy (US-024) to enforce access control.

---

## Acceptance Criteria

1. **Given** an idea with `n` attachments,
   **When** the idea detail page loads,
   **Then** an "Attachments" section shows a table with `n` rows: file icon, file name (as a download link), file size (human-readable, e.g., "2.3 MB"), and upload date.

2. **Given** an idea with no attachments,
   **When** the idea detail page loads,
   **Then** the "Attachments" section is absent — not an empty table, not a "No attachments" row.

3. **Given** the download link for a file is clicked,
   **When** the browser follows the link,
   **Then** the request goes to `GET /api/attachments/[id]` (the secure proxy from US-024) — never directly to the Vercel Blob URL.

4. **Given** `FEATURE_MULTI_ATTACHMENT_ENABLED=false`,
   **When** the idea detail page loads,
   **Then** the new "Attachments" section is absent; V1 `attachmentPath` rendering (if any) takes over.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                 | Expected Behavior                                                                  |
| --- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | `fileSize = 0` (V1-migrated attachment with no size data)                                | Display "—" in the size column instead of "0 B"                                    |
| 2   | `fileName` is very long (> 60 chars)                                                     | Truncate with ellipsis in the UI; full name shown in `title` tooltip on hover      |
| 3   | An `IdeaAttachment` row exists but the underlying blob has been deleted from Vercel Blob | The row and link still render; the proxy route (US-024) returns `404` when clicked |

---

## UI / UX Notes

- Section header: `<h3>Attachments</h3>` inside the idea metadata card, rendered below the "Additional Details" section (if present).
- Table columns: Icon | File Name (link) | Size | Uploaded
- Use shadcn/ui `Table` component
- File size is formatted with a `formatBytes(n)` utility: `0 → "—"`, `1024 → "1 KB"`, `1048576 → "1 MB"` etc.
- Download link: `<a href="/api/attachments/[id]" target="_blank">` — opens in new tab
- File icon: Lucide icon chosen by MIME type prefix (same mapping as US-022 upload UI)

---

## Technical Notes

- The idea detail query must include `attachments: true` in the Prisma include to load `IdeaAttachment` records.
- Create a shared `AttachmentsTable` component at `components/ideas/attachments-table.tsx` — reused by both the submitter detail view and the admin review panel.
- `formatBytes` utility should already exist or be added to `lib/utils.ts`.
- **Feature Flag**: `FEATURE_MULTI_ATTACHMENT_ENABLED`.

---

## Dependencies

| Dependency                              | Type  | Status                               | Blocker? |
| --------------------------------------- | ----- | ------------------------------------ | -------- |
| US-021 — `IdeaAttachment` model         | Story | Must be done first                   | Yes      |
| US-024 — Private attachment proxy route | Story | Links depend on proxy route existing | Yes      |

---

## Test Plan

### Manual Testing

- [ ] Idea with 3 attachments → "Attachments" section shows 3 rows with correct names, sizes, dates
- [ ] Idea with 0 attachments → "Attachments" section absent
- [ ] V1-migrated attachment with `fileSize = 0` → shows "—" in size column
- [ ] Long filename → truncated with ellipsis; hover shows full name

### Automated Testing

- [ ] Unit: `AttachmentsTable` renders correct row count for a given array of attachments
- [ ] Unit: `AttachmentsTable` returns null for an empty attachments array
- [ ] Unit: `formatBytes(0)` returns `"—"`; `formatBytes(1024)` returns `"1 KB"`

---

## Definition of Done

- [ ] `AttachmentsTable` component renders correctly for n > 0 and n = 0 attachments
- [ ] Download links route through `/api/attachments/[id]`
- [ ] Idea detail query includes `attachments` relation
- [ ] `git commit: feat(media): attachment list on idea detail page`
