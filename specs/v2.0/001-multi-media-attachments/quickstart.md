# Quickstart: Multi-Media Attachments

**Feature branch**: `001-multi-media-attachments`
**Estimated setup time**: 5 minutes

---

## Prerequisites

- Node.js 20+
- A Vercel project with Blob storage enabled (or a Vercel Blob token from Settings → Storage)
- Neon DB credentials in `.env.local` (already set up from previous features)

---

## Step 1 — Add Environment Variables

Add to `innovatepam-portal/.env.local`:

```bash
# Vercel Blob — required for attachment upload/download/delete
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_<your-token-here>

# Feature flag — set to 'true' to enable the multi-attachment UI
FEATURE_MULTI_ATTACHMENT_ENABLED=true
```

> Get your `BLOB_READ_WRITE_TOKEN` from the Vercel dashboard: **Storage → Blob → your store → Settings → Tokens**.

---

## Step 2 — Apply Schema Migration

From `innovatepam-portal/`:

```bash
npm run db:migrate
```

This runs `prisma migrate dev` and applies the migration that adds:

- `IdeaAttachment` model
- `ATTACHMENT_DELETED` enum value on `AuditAction`
- Relations on `Idea` and `User`

```bash
npm run db:generate
```

Regenerates the Prisma client with the new types.

---

## Step 3 — (Optional) Migrate V1 Attachments

If the database has existing `Idea` rows with `attachmentPath` populated:

```bash
npx tsx --env-file=.env.local scripts/migrate-v1-attachments.ts
```

The script is idempotent — safe to re-run. It uses `upsert` on `(ideaId, blobUrl)` so no duplicate rows are created. On completion it logs:

```
Migration complete. Processed: 42, Created: 38, Skipped (already exists): 4
```

---

## Step 4 — Start Dev Server

```bash
npm run dev
```

---

## Step 5 — Verify Upload Flow

1. Navigate to `http://localhost:3000/ideas/new`
2. Fill in the idea form
3. Use the attachment section to drag-and-drop or browse files
4. Verify attached files appear in the list with name, size, and remove button
5. Submit the idea
6. Navigate to the idea detail page — verify attachment list renders with download links

---

## Step 6 — Verify Download Flow

1. Click a download link on an idea detail page
2. Verify the file downloads (browser should save the file, not redirect to a blob URL)
3. Verify no Vercel Blob URL appears in the browser address bar or network tab

---

## Step 7 — Verify Admin Delete Flow

1. Log in as `ADMIN` or `SUPERADMIN`
2. Navigate to an idea detail page with attachments
3. Click the delete icon next to an attachment
4. Verify the row disappears from the list
5. In the Vercel Blob dashboard, verify the blob is no longer listed
6. In the admin audit log, verify an `ATTACHMENT_DELETED` entry was created

---

## Troubleshooting

| Symptom                                            | Likely cause                                           | Fix                                                       |
| -------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------- |
| Upload returns 401                                 | Not logged in                                          | Log in first                                              |
| Upload returns 400 "File type not allowed"         | MIME type or extension not in allowlist                | Check `constants/allowed-mime-types.ts`                   |
| Upload returns 413                                 | File > 25 MB                                           | Use a smaller file                                        |
| Download returns 502 "File is no longer available" | Blob was deleted from Vercel but DB row still exists   | Admin should delete the DB record via the delete endpoint |
| Feature flag UI not showing                        | `FEATURE_MULTI_ATTACHMENT_ENABLED` not set to `'true'` | Update `.env.local` and restart dev server                |
| `BLOB_READ_WRITE_TOKEN` error at startup           | Missing or invalid token                               | Add a valid token to `.env.local`                         |
