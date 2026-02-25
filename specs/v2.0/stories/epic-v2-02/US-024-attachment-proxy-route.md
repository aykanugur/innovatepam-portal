# User Story: Private Attachment Proxy Route

**Story ID**: US-024
**Epic**: EPIC-V2-02 — Multi-Media Attachments
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: S
**Sprint**: Phase 3 — Step 4
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** authenticated user with the right to view an idea,
**I want** attachment downloads to go through a secure server-side proxy,
**so that** raw Vercel Blob URLs are never exposed to the client and unauthenticated users cannot download idea attachments.

---

## Context & Motivation

Vercel Blob supports `access: 'private'` which generates signed URLs on demand. If the signed URL is served directly to the client, it could be shared or cached in browser history. The proxy route acts as a gatekeeper: it checks the user's session and their right to view the specific idea before streaming the blob content. The client only ever sees `/api/attachments/[id]` — never the underlying blob URL.

---

## Acceptance Criteria

1. **Given** an authenticated user who can view the idea,
   **When** `GET /api/attachments/[id]` is called,
   **Then** the server validates the session, loads the `IdeaAttachment` record, generates a signed Vercel Blob URL, and returns the file as a streamed response with correct `Content-Type` and `Content-Disposition: attachment; filename="[fileName]"` headers.

2. **Given** an unauthenticated request,
   **When** `GET /api/attachments/[id]` is called,
   **Then** the server returns `401 Unauthorized`.

3. **Given** an authenticated `SUBMITTER` requesting an attachment for another user's non-public idea,
   **When** the request is made,
   **Then** the server returns `403 Forbidden`.

4. **Given** an `IdeaAttachment` ID that does not exist,
   **When** the request is made,
   **Then** the server returns `404 Not Found`.

5. **Given** the blob file has been deleted from Vercel Blob but the `IdeaAttachment` row still exists,
   **When** the proxy route is called,
   **Then** the signed URL fetch fails and the server returns `502 Bad Gateway` with message: "File is no longer available."

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                          | Expected Behavior                                                                          |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | `ADMIN` user accessing an attachment for any idea | Permitted — admins can view all idea attachments                                           |
| 2   | `SUBMITTER` accessing their own idea's attachment | Permitted — `idea.authorId === session.user.id` check passes                               |
| 3   | Concurrent requests for the same attachment       | Each request independently generates a fresh signed URL — no caching of signed URLs        |
| 4   | `HEAD` request to the proxy route                 | Not explicitly handled — Next.js Route Handler returns `405 Method Not Allowed` by default |

---

## UI / UX Notes

No dedicated UI — this is a Route Handler. The download link in `AttachmentsTable` (US-023) uses `<a href="/api/attachments/[id]" target="_blank">` which triggers this route.

---

## Technical Notes

- Route: `app/api/attachments/[id]/route.ts`
- Access control logic:
  1. Check session → `401` if unauthenticated
  2. Load `IdeaAttachment` with `idea: { include: { author: true } }` from DB
  3. If not found → `404`
  4. If session role is `ADMIN` or `SUPERADMIN` → permit
  5. If session role is `SUBMITTER` and `attachment.idea.authorId !== session.user.id` → `403`
- Vercel Blob proxy: use `@vercel/blob`'s `getDownloadUrl()` or `head()` + generate a signed URL with `generateSignedUrl()`. Stream response with `fetch(signedUrl)` and pipe to `NextResponse`.
- Set headers:
  - `Content-Type`: from `attachment.mimeType`
  - `Content-Disposition`: `attachment; filename="${attachment.fileName}"`
  - `Cache-Control`: `no-store` — prevent caching of signed URLs
- **Feature Flag**: `FEATURE_MULTI_ATTACHMENT_ENABLED` — if `false`, `GET /api/attachments/[id]` returns `404`.

---

## Dependencies

| Dependency                      | Type  | Status                               | Blocker? |
| ------------------------------- | ----- | ------------------------------------ | -------- |
| US-021 — `IdeaAttachment` model | Story | Must be done first                   | Yes      |
| `BLOB_READ_WRITE_TOKEN` env var | Infra | Required for Vercel Blob signed URLs | Yes      |

---

## Test Plan

### Manual Testing

- [ ] Authenticated submitter → downloads own idea attachment → file downloads correctly
- [ ] Authenticated submitter → attempts to access another user's attachment → `403`
- [ ] Unauthenticated request → `401`
- [ ] Non-existent attachment ID → `404`

### Automated Testing

- [ ] Integration: `GET /api/attachments/[id]` with valid SUBMITTER session returns the file stream
- [ ] Integration: unauthenticated request returns `401`
- [ ] Integration: SUBMITTER accessing another user's attachment returns `403`
- [ ] Integration: `ADMIN` can access any attachment regardless of authorship

---

## Definition of Done

- [ ] Route Handler created at `app/api/attachments/[id]/route.ts`
- [ ] Session + authorship checks enforced
- [ ] File streamed with correct headers; blob URL never exposed to client
- [ ] `Cache-Control: no-store` set
- [ ] `git commit: feat(media): private attachment proxy route`
