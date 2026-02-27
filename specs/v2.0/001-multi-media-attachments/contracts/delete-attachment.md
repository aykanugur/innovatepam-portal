# Contract: Delete Attachment

**Route**: `DELETE /api/attachments/[id]`
**Feature gate**: `FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'`
**Auth**: Session required, role `ADMIN` or `SUPERADMIN` only

---

## Request

```
DELETE /api/attachments/<attachmentId>
Authorization: Bearer <session-cookie>
```

| Parameter | Location   | Type     | Required | Notes                      |
| --------- | ---------- | -------- | -------- | -------------------------- |
| `id`      | Path param | `string` | Yes      | `IdeaAttachment.id` (cuid) |

No request body.

---

## Server-Side Processing (in order)

| Step | Action                                                                                                   | On Failure                                          |
| ---- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1    | Feature flag check                                                                                       | 404 `{ error: 'Not found' }`                        |
| 2    | Session check                                                                                            | 401 `{ error: 'Unauthorized' }`                     |
| 3    | Role check: `session.user.role` in `['ADMIN', 'SUPERADMIN']`                                             | 403 `{ error: 'Forbidden' }`                        |
| 4    | Load `IdeaAttachment` by `id` (include `idea { id, title }`)                                             | 404 `{ error: 'Attachment not found' }`             |
| 5    | `del(attachment.blobUrl)` — Vercel Blob deletion; set `storageError = true` on catch                     | Log warning, **non-fatal** (continue)               |
| 6    | `prisma.$transaction([deleteAttachment, createAuditLog])`                                                | 500 `{ error: 'Delete failed. Please try again.' }` |
| 7    | Return `204` if `storageError === false`; return `200 { storageError: true }` if `storageError === true` | —                                                   |

### Step 5 — Non-Fatal Blob Deletion

Blob deletion errors (e.g., blob already gone) are caught and logged as `warn` level but do not abort the operation. The DB record must still be removed to keep the UI consistent. If the blob is already gone, the admin action is still logically correct.

### Step 6 — Transaction Operations

```typescript
// Inside prisma.$transaction:
prisma.ideaAttachment.delete({ where: { id } })

prisma.auditLog.create({
  data: {
    action: 'ATTACHMENT_DELETED',
    userId: session.user.id,
    ideaId: attachment.ideaId,
    metadata: {
      ideaId: attachment.ideaId,
      ideaTitle: attachment.idea.title,
      fileName: attachment.fileName,
      blobUrl: attachment.blobUrl,
      deletedByRole: session.user.role,
    },
  },
})
```

---

## Response

### 204 No Content — Deleted, blob removed

No response body. DB record, audit log, and blob were all handled without error.

### 200 OK — Deleted, blob removal failed (non-fatal)

```json
{ "storageError": true }
```

Returned when the `prisma.$transaction` (DB delete + audit log) committed successfully but the Vercel Blob `del()` call threw an error. The attachment is logically deleted. The admin UI MUST display a toast warning: "Attachment record removed but the file could not be deleted from storage."

### 401 Unauthorized

```json
{ "error": "Unauthorized" }
```

### 403 Forbidden

```json
{ "error": "Forbidden" }
```

### 404 Not Found

```json
{ "error": "Attachment not found" }
```

### 500 Internal Server Error — DB transaction failure

```json
{ "error": "Delete failed. Please try again." }
```

---

## Client Idempotency

If the client sends a second `DELETE` for the same `id` (e.g., due to network retry), step 4 returns 404. The client should treat 404 from a delete operation as a success (the record is already gone). This pattern matches standard REST DELETE idempotency.

---

## Audit Log Record

Every successful delete creates an `AuditLog` row via the `ATTACHMENT_DELETED` action. This is the primary audit trail for admin removals. The `metadata` field includes enough context to reconstruct the event without joining other tables.
