# Research: Multi-Media Attachments

**Feature**: 001-multi-media-attachments
**Date**: 2026-02-26
**Status**: Complete — all NEEDS CLARIFICATION items resolved

---

## Research Finding 1 — Vercel Blob: `access: 'private'` and Signed URL Generation

**Question**: How does `@vercel/blob` private file storage work, and how are files served securely through the proxy route?

**Decision**: Use `put(fileName, body, { access: 'private' })` for uploads. For downloads, use `head(blobUrl)` to verify existence, then generate a short-lived signed URL with `generateSignedUrl(blobUrl, { expiresIn: 60 })` and redirect or stream the response via `fetch(signedUrl)` piped to `NextResponse`. Use `del(blobUrl)` for admin deletes.

**Rationale**: `@vercel/blob` ^2.3.0 is already in `package.json`. The `access: 'private'` flag prevents direct URL guessing — blobs are only accessible via signed URLs generated server-side. Signed URLs expire in 60 seconds, so even if a response is intercepted the URL cannot be reused. `BLOB_READ_WRITE_TOKEN` is required in both cases (upload and signed URL generation).

**Alternatives considered**:

- `access: 'public'` blobs: rejected — URLs are deterministic and guessable; violates FR-010 (no raw storage URLs to client).
- Store files in the local filesystem (`/public/uploads`): the project already has this directory but it does not persist across Vercel deployments. Rejected.
- Presigned S3 URLs via AWS SDK: overkill when Vercel Blob is already integrated. Rejected.

---

## Research Finding 2 — Upload Architecture: Route Handler vs. Server Action

**Question**: Should file uploads be handled by a Next.js Server Action or a Route Handler?

**Decision**: **Route Handler** (`POST /api/ideas/upload`) handles the per-file upload to Vercel Blob. The Server Action (`createIdea`) only receives blob URLs (strings) returned by the Route Handler — it never handles `File` or `FormData` binary data directly.

**Rationale**: Next.js Server Actions serialize arguments through the React serialization layer, which does not efficiently handle large binary files. Route Handlers receive the raw `Request` object and can stream the body directly to Vercel Blob via `put(filename, request.body, ...)`. The pattern is: client sends each file to the Route Handler → gets back a `blobUrl` → passes `blobUrl[]` to the Server Action alongside the rest of the form data.

**Alternatives considered**:

- Server Action receiving `File[]`: unstable with large files; binary content serialized as base64-encoded strings in the Server Action protocol. Rejected.
- Client-side direct Vercel Blob upload with `upload()` helper: would require exposing the `BLOB_READ_WRITE_TOKEN` to the browser. Rejected — this is a secret key.

---

## Research Finding 3 — Atomicity: Idea + Attachment Records in One Transaction

**Question**: How do we ensure that if one `IdeaAttachment` create fails, the entire `Idea` creation is rolled back?

**Decision**: Use `prisma.$transaction([...])` to wrap the `Idea` create and all `IdeaAttachment` creates in a single atomic operation inside `createIdeaAction()`. Blob uploads happen **before** the transaction — if a blob upload fails, the transaction is never attempted. If the transaction fails after blobs are uploaded, the blobs become orphaned; the Server Action catches this error, responds to the client with the generic retry message, and schedules orphan cleanup (acceptable trade-off — Vercel Blob storage cost for orphaned files is negligible and they can be purged periodically).

**Rationale**: Prisma 7 supports interactive transactions and sequential operation batches. The two-phase approach (upload blobs first, then persist records atomically) is the standard pattern for blob + DB consistency. Full two-phase commit (rollback blobs on DB failure) is complex and not justified at this scale.

**Alternatives considered**:

- Create the `Idea` first, then create `IdeaAttachment` rows one by one: non-atomic; a mid-batch failure leaves a partially-attached idea. Rejected.
- Use a background job for attachment persistence: overkill; adds queue infrastructure not present in the project. Rejected.

---

## Research Finding 4 — MIME Type Detection: Client + Server Strategy

**Question**: `text/markdown` MIME type detection is unreliable in browsers — how should `.md` files be validated on the client?

**Decision**: On the **client** (drop zone), use **file extension** as the primary signal for `.md` and `.txt` files, since browsers frequently report `application/octet-stream` or `text/plain` for `.md` files. On the **server** (Route Handler), accept both the extension-derived MIME and the browser-reported MIME — the server validates the filename extension against the allowlist when the MIME type is ambiguous. The `constants/allowed-mime-types.ts` constant exports two lists: `ALLOWED_MIME_TYPES` (for server validation) and `ALLOWED_EXTENSIONS` (for client-side drop zone config and extension fallback).

**Rationale**: MDN and browser compatibility tables confirm `text/markdown` is not universally supported as a MIME type. Relying on it for client-side filtering would silently block `.md` files in Firefox and some Chromium builds. Extension-based fallback is the standard approach for text-like file types.

**Alternatives considered**:

- Accept only `text/plain` for both `.txt` and `.md`: technically works but conflates two formats; loses semantic distinction. Conditionally rejected — acceptable as a server fallback only.
- Use a magic-bytes library for server-side type detection: adds complexity; not needed at this scale. Rejected.

---

## Research Finding 5 — V1 Migration: `upsert` on `(ideaId, blobUrl)` for Idempotency

**Question**: How should the one-time V1 migration script be made idempotent?

**Decision**: Use `prisma.ideaAttachment.upsert({ where: { ideaId_blobUrl: { ideaId, blobUrl } }, update: {}, create: {...} })`. This requires a `@@unique([ideaId, blobUrl])` compound constraint on the `IdeaAttachment` model solely for migration safety. The constraint also prevents duplicate attachment records from application bugs.

**Rationale**: A simple `create` would fail on second run with a unique constraint violation if a composite unique index exists, or silently create duplicates if not. `upsert` on `(ideaId, blobUrl)` is safe at any run count. The compound unique constraint is a useful data-integrity guard outside of migration too.

**Alternatives considered**:

- Check-before-insert in script logic (`findFirst` + conditional `create`): has a TOCTOU race; not reliable. Rejected.
- Truncate `IdeaAttachment` and re-run: destructive for production environments where new uploads may already exist. Rejected.

---

## Research Finding 6 — Feature Flag Pattern (Existing Convention)

**Question**: How should `FEATURE_MULTI_ATTACHMENT_ENABLED` be integrated with the existing feature flag system?

**Decision**: Add `FEATURE_MULTI_ATTACHMENT_ENABLED: z.string().default('false')` to `envSchema` in `lib/env.ts`, following the exact pattern of existing flags (`FEATURE_SMART_FORMS_ENABLED`, `FEATURE_FILE_ATTACHMENT_ENABLED`, etc.). Add `BLOB_READ_WRITE_TOKEN: z.string().min(1)` as a required string to `envSchema` (not optional — it is required when the feature is enabled, and the Vercel dashboard sets it in production). Gate all attachment-related code paths with `env.FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'`.

**Note**: `FEATURE_FILE_ATTACHMENT_ENABLED` already exists in `env.ts` — this appears to gate the V1 single-file attachment. `FEATURE_MULTI_ATTACHMENT_ENABLED` is the new flag for the multi-file system. The two flags are independent; the V1 flag is not removed.

---

## Research Finding 7 — Audit Log: `ATTACHMENT_DELETED` Enum Value

**Question**: How should admin attachment deletions be recorded in the audit log?

**Decision**: Add `ATTACHMENT_DELETED` to the `AuditAction` enum in `schema.prisma`. Write an `AuditLog` row in the `DELETE /api/attachments/[id]` Route Handler after successful `prisma.ideaAttachment.delete()`. Metadata shape: `{ ideaId, ideaTitle, fileName, blobUrl, deletedByRole }` — consistent with the existing metadata pattern used by `IDEA_DELETED`.

**Rationale**: The existing `AuditLog` model has `targetId String` (idea ID) and `metadata Json?` (open-ended). This pattern is already used across five audit actions. Reusing it avoids schema expansion. The `targetId` points to the `Idea` the attachment belonged to (not the `IdeaAttachment`, which may no longer exist).

---

## Research Finding 8 — Proxy Streaming: `NextResponse` vs. Redirect

**Question**: Should the proxy route stream the blob content or redirect to the signed URL?

**Decision**: **Stream the content** in the `GET /api/attachments/[id]` Route Handler. Fetch the signed URL server-side, pipe the response body to a new `NextResponse` with the correct `Content-Type` and `Content-Disposition: attachment; filename="..."` headers. Never send the signed URL to the client (not even as a redirect).

**Rationale**: A `302` redirect to the signed URL would expose the signed URL in browser history, network tab, and any HTTP proxies — defeating the purpose of the proxy route. Streaming the content through the Route Handler means the client only ever sees `/api/attachments/[id]`. The slight latency overhead of server-to-server streaming is acceptable given file sizes (≤ 25 MB).

**Alternatives considered**:

- `302` redirect to signed URL: exposes the URL in browser history. Rejected (not consistent with FR-010).
- `303` redirect with very short expiry (< 5 s): reduces exposure window but still violates FR-010 intent. Rejected.
