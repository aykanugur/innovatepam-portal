# User Story: Admin Delete Attachment

**Story ID**: US-025
**Epic**: EPIC-V2-02 — Multi-Media Attachments
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P2 (Should)
**Estimate**: XS
**Sprint**: Phase 3 — Step 5
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** admin,
**I want to** delete individual attachments from an idea via the review panel,
**so that** I can remove inappropriate or problematic files without deleting the entire idea.

---

## Context & Motivation

Occasionally a submitter attaches an incorrect file, a file with sensitive content, or a file that is too large. An admin needs a surgical way to remove only the problematic attachment without rejecting the idea or requesting the submitter resubmit. Submitters do not have delete access to their own attachments after submission (submitter use-case is out of scope — deleting before submission uses the × button in the upload UI from US-022).

---

## Acceptance Criteria

1. **Given** an admin views the attachments section on the idea detail or review panel,
   **When** `FEATURE_MULTI_ATTACHMENT_ENABLED=true`,
   **Then** a delete icon (trash bin) appears next to each attachment row in the table.

2. **Given** an admin clicks the delete icon,
   **When** the confirmation dialog is accepted,
   **Then** the `IdeaAttachment` row is deleted from the database AND the corresponding blob is deleted from Vercel Blob. The attachment disappears from the list without a page reload.

3. **Given** the Vercel Blob delete API call fails,
   **When** the deletion is attempted,
   **Then** the `IdeaAttachment` row is still deleted from the database (the broken blob reference is removed), and a warning toast is shown: "Attachment record removed but the file could not be deleted from storage."

4. **Given** a `SUBMITTER` attempts to delete an attachment by calling `DELETE /api/attachments/[id]` directly,
   **When** the request is made,
   **Then** the server returns `403 Forbidden`.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                               | Expected Behavior                                                                                           |
| --- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Admin deletes the last attachment on an idea                           | The "Attachments" section disappears from the detail page — no empty-state table remains                    |
| 2   | Two admins simultaneously try to delete the same attachment            | The second delete returns `404` (row not found); it is treated as a successful delete — idempotent response |
| 3   | Deleting an attachment on an idea with `ACCEPTED` or `REJECTED` status | Permitted — the decision stage does not prevent attachment management                                       |

---

## UI / UX Notes

- Delete icon: Lucide `Trash2` icon button, `text-destructive` colour, only visible in the attachments table for `ADMIN` and `SUPERADMIN` roles.
- Confirmation dialog: shadcn/ui `AlertDialog` — "Delete attachment? This will permanently remove '[fileName]' and cannot be undone." with "Cancel" and "Delete" (destructive variant) buttons.
- After successful deletion: optimistic UI update removes the row immediately; revalidate the idea detail page data with `router.refresh()` as a fallback.
- Submitter view: no delete icon shown — the `AttachmentsTable` component accepts a `canDelete` boolean prop.

---

## Technical Notes

- Route Handler: `DELETE /api/attachments/[id]/route.ts` (extend the existing file from US-024).
- Deletion flow:
  1. Validate session → `401` if unauthenticated
  2. Check `role === ADMIN || SUPERADMIN` → `403` otherwise
  3. Load `IdeaAttachment` → `404` if not found
  4. Call `@vercel/blob`'s `del(blobUrl)` — catch errors as a warning (non-fatal)
  5. Call `prisma.ideaAttachment.delete({ where: { id } })`
  6. Write `AuditLog` with action `ATTACHMENT_DELETED` (add to `AuditAction` enum)
  7. Return `204 No Content`
- An `ATTACHMENT_DELETED` value must be added to the `AuditAction` enum in `schema.prisma`.
- **Feature Flag**: `FEATURE_MULTI_ATTACHMENT_ENABLED`.

---

## Dependencies

| Dependency                                                                        | Type  | Status               | Blocker? |
| --------------------------------------------------------------------------------- | ----- | -------------------- | -------- |
| US-021 — `IdeaAttachment` model                                                   | Story | Must be done first   | Yes      |
| US-023 — Attachment list on detail page (provides the UI to add delete button to) | Story | Must be done first   | Yes      |
| US-024 — Proxy route (same route file extended)                                   | Story | Should be done first | No       |

---

## Test Plan

### Manual Testing

- [ ] Admin clicks delete on an attachment → confirmation dialog → confirms → attachment disappears from table
- [ ] Admin deletes last attachment → "Attachments" section disappears
- [ ] SUBMITTER session → `DELETE /api/attachments/[id]` → `403`
- [ ] Blob delete fails (simulate) → row still deleted; warning toast shown

### Automated Testing

- [ ] Integration: `DELETE /api/attachments/[id]` with ADMIN session returns `204` and row is gone from DB
- [ ] Integration: SUBMITTER session returns `403`
- [ ] Integration: non-existent ID returns `404`
- [ ] Unit: `AttachmentsTable` does not render delete icons when `canDelete=false`

---

## Definition of Done

- [ ] `DELETE /api/attachments/[id]` handler created
- [ ] `ATTACHMENT_DELETED` audit action written on every successful delete
- [ ] `AttachmentsTable` shows delete button only for admin roles
- [ ] Blob + DB record both cleaned up (with graceful degradation if blob delete fails)
- [ ] `git commit: feat(media): admin delete attachment`
