# User Story: IdeaAttachment Model & V1 Data Migration

**Story ID**: US-021
**Epic**: EPIC-V2-02 — Multi-Media Attachments
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: S
**Sprint**: Phase 3 — Step 1
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** developer,
**I want to** create the `IdeaAttachment` Prisma model and migrate existing V1 `attachmentPath` data into the new table,
**so that** all idea attachments are tracked as first-class records with metadata, and the new multi-file upload system has a well-defined schema to write to.

---

## Context & Motivation

V1 stores a single attachment as a bare `attachmentPath String?` column on `Idea`. This design cannot support multiple files, does not track file metadata (name, size, MIME type), and has no per-file deletion capability. The `IdeaAttachment` model normalises attachments into their own table while preserving all V1 data via a one-time migration script.

---

## Acceptance Criteria

1. **Given** the migration is applied,
   **When** the `IdeaAttachment` table is inspected,
   **Then** it has columns: `id (cuid)`, `ideaId (FK → Idea)`, `blobUrl`, `fileName`, `fileSize`, `mimeType`, `uploadedById (FK → User)`, `createdAt`.

2. **Given** the V1 migration script is run,
   **When** any idea with a non-null `attachmentPath` exists,
   **Then** a corresponding `IdeaAttachment` row is created with `fileName` derived from the blob URL basename, `fileSize = 0` (unknown), `mimeType = "application/octet-stream"` (unknown), and `uploadedById` = the idea's `authorId`.

3. **Given** the migration script completes,
   **When** original ideas with `attachmentPath = null` are checked,
   **Then** no `IdeaAttachment` rows are created for them.

4. **Given** the `IdeaAttachment` table,
   **When** a cascading delete is triggered on an `Idea` row,
   **Then** all `IdeaAttachment` rows for that idea are also deleted (`onDelete: Cascade`).

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                      | Expected Behavior                                                                                                         |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 1   | V1 `attachmentPath` points to a blob URL that no longer exists in Vercel Blob | Migration script creates the `IdeaAttachment` row with the stored URL — blob existence is not validated at migration time |
| 2   | Migration script is run twice                                                 | Script uses `upsert` on `(ideaId, blobUrl)` pair — no duplicate rows                                                      |
| 3   | `attachmentPath` contains a relative path or a non-URL value                  | Row is migrated as-is; the proxy route (US-024) handles validation at access time                                         |

---

## UI / UX Notes

N/A — this story is schema and data-layer only.

---

## Technical Notes

- New model in `schema.prisma`:

  ```prisma
  model IdeaAttachment {
    id           String   @id @default(cuid())
    ideaId       String
    idea         Idea     @relation(fields: [ideaId], references: [id], onDelete: Cascade)
    blobUrl      String
    fileName     String
    fileSize     Int      // bytes; 0 if unknown (V1 migrated rows)
    mimeType     String
    uploadedById String
    uploadedBy   User     @relation("UserAttachments", fields: [uploadedById], references: [id])
    createdAt    DateTime @default(now())

    @@index([ideaId])
  }
  ```

- Add `attachments IdeaAttachment[]` relation to `Idea` model.
- V1 migration script: `scripts/migrate-v1-attachments.ts` — runs as a one-time `ts-node` script outside of Prisma migrations. Documented in `README.md`.
- Keep `Idea.attachmentPath` column in schema until V3.0 — soft-deprecated, no longer written by new code.
- **Feature Flag**: `FEATURE_MULTI_ATTACHMENT_ENABLED` — flag does not affect migration script execution.

---

## Dependencies

| Dependency                               | Type   | Status                 | Blocker? |
| ---------------------------------------- | ------ | ---------------------- | -------- |
| V1 `Idea.attachmentPath` column exists   | Schema | Exists in V1           | No       |
| US-022 — Upload UI (consumes this model) | Story  | Must follow this story | No       |

---

## Test Plan

### Manual Testing

- [ ] `prisma migrate dev` applies cleanly — `IdeaAttachment` table exists
- [ ] Run `scripts/migrate-v1-attachments.ts` — each V1 idea with `attachmentPath` has a corresponding `IdeaAttachment` row
- [ ] Run script twice — no duplicate rows

### Automated Testing

- [ ] Integration: `prisma.ideaAttachment.create()` persists a row correctly
- [ ] Integration: deleting an `Idea` cascades and deletes its `IdeaAttachment` rows

---

## Definition of Done

- [ ] `IdeaAttachment` migration applied
- [ ] `Idea.attachments` relation working
- [ ] V1 migration script written, tested, documented in README
- [ ] `Idea.attachmentPath` kept but deprecated
- [ ] `git commit: feat(media): IdeaAttachment model and V1 data migration`
