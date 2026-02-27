# Data Model: Multi-Media Attachments

**Feature**: 001-multi-media-attachments
**Date**: 2026-02-26
**Based on**: research.md findings 1, 5, 6, 7

---

## Schema Changes (`prisma/schema.prisma`)

### 1. New Model: `IdeaAttachment`

```prisma
model IdeaAttachment {
  id           String   @id @default(cuid())
  ideaId       String
  idea         Idea     @relation("IdeaAttachments", fields: [ideaId], references: [id], onDelete: Cascade)
  blobUrl      String
  fileName     String
  fileSize     Int      // bytes; 0 for V1-migrated rows where size is unknown
  mimeType     String
  uploadedById String
  uploadedBy   User     @relation("UserAttachments", fields: [uploadedById], references: [id])
  createdAt    DateTime @default(now())

  @@unique([ideaId, blobUrl])   // enables idempotent upsert in V1 migration script
  @@index([ideaId])
}
```

### 2. `Idea` Model — Add Relation

```prisma
// Add inside existing Idea model block:
attachments IdeaAttachment[] @relation("IdeaAttachments")
// Keep existing: attachmentPath String?  (soft-deprecated, not written by new code)
```

### 3. `User` Model — Add Relation

```prisma
// Add inside existing User model block:
attachments IdeaAttachment[] @relation("UserAttachments")
```

### 4. `AuditAction` Enum — New Value

```prisma
enum AuditAction {
  IDEA_CREATED
  IDEA_DELETED
  IDEA_REVIEW_STARTED
  IDEA_REVIEWED
  IDEA_REVIEW_ABANDONED
  ATTACHMENT_DELETED     // ← NEW: admin removed an attachment from an idea
}
```

---

## Environment Variables (`lib/env.ts`)

Add to `envSchema`:

```typescript
BLOB_READ_WRITE_TOKEN: z.string().min(1),
FEATURE_MULTI_ATTACHMENT_ENABLED: z.string().default('false'),
```

`BLOB_READ_WRITE_TOKEN` is required at the schema level. If the feature is disabled, the token is still validated at startup — this is intentional (avoids silent misconfiguration when the flag is toggled on).

---

## New Constant File (`constants/allowed-mime-types.ts`)

```typescript
export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'text/plain',
  'text/markdown',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.txt',
  '.md',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
] as const

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024 // 25 MB
export const MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024 // 100 MB
export const MAX_FILE_COUNT = 10
```

---

## Entities

### `IdeaAttachment`

| Field          | Type       | Constraints                    | Notes                                                         |
| -------------- | ---------- | ------------------------------ | ------------------------------------------------------------- |
| `id`           | `String`   | PK, cuid                       | —                                                             |
| `ideaId`       | `String`   | FK → `Idea.id`, cascade delete | —                                                             |
| `blobUrl`      | `String`   | —                              | Full Vercel Blob URL; never sent to browser                   |
| `fileName`     | `String`   | —                              | Original file name as uploaded                                |
| `fileSize`     | `Int`      | ≥ 0                            | `0` for V1-migrated rows                                      |
| `mimeType`     | `String`   | —                              | `"application/octet-stream"` for V1-migrated rows             |
| `uploadedById` | `String`   | FK → `User.id`                 | Idea author for new uploads; idea author for V1-migrated rows |
| `createdAt`    | `DateTime` | `@default(now())`              | —                                                             |

**Compound unique**: `(ideaId, blobUrl)` — prevents duplicate rows and enables idempotent migration.
**Cascade rule**: deleting an `Idea` automatically deletes all its `IdeaAttachment` rows.

---

## Validation Schemas (`lib/validations/attachment.ts`)

### Upload Request Schema (server-side Route Handler)

| Field                  | Rule                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `Content-Type`         | Must match `ALLOWED_MIME_TYPES` or filename extension matches `ALLOWED_EXTENSIONS` |
| `Content-Length`       | Must be ≤ `MAX_FILE_SIZE_BYTES` (25 MB)                                            |
| Filename (from header) | Non-empty, sanitised (no path traversal characters)                                |

### Delete Request Schema (server-side Route Handler)

| Field        | Rule                                                             |
| ------------ | ---------------------------------------------------------------- |
| `params.id`  | Non-empty string, converted to `ideaAttachment.id` for DB lookup |
| Session role | Must be `ADMIN` or `SUPERADMIN`                                  |

---

## State Transitions

`IdeaAttachment` records do not have their own status — their lifecycle is:

```
[Created in $transaction with Idea]
        ↓
[Accessible via GET /api/attachments/[id] proxy]
        ↓
[Admin deletes via DELETE /api/attachments/[id]]
        ↓
[Row deleted from DB + blob deleted from Vercel Blob]
```

The parent `Idea`'s status (`SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`) does not gate this lifecycle — admins can delete attachments at any idea status.

---

## Migration: `scripts/migrate-v1-attachments.ts`

One-time script run by a developer post-deployment of the schema migration.

**Inputs**: Reads all `Idea` rows where `attachmentPath IS NOT NULL`.

**Upsert key**: `(ideaId, blobUrl)` — idempotent on re-run.

**Created row values**:

- `blobUrl`: `idea.attachmentPath`
- `fileName`: `path.basename(idea.attachmentPath)` (URL basename)
- `fileSize`: `0` (unknown)
- `mimeType`: `"application/octet-stream"` (unknown)
- `uploadedById`: `idea.authorId`
- `createdAt`: `idea.createdAt` (preserve original timestamps)

**Post-run validation**: Script logs count of rows processed and count of rows created vs. skipped. Exits non-zero on any DB error.
