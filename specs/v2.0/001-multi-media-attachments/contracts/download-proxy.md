# Contract: Download Proxy

**Route**: `GET /api/attachments/[id]`
**Feature gate**: `FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'`
**Auth**: Session required (all downloads)

---

## Request

```
GET /api/attachments/<attachmentId>
Authorization: Bearer <session-cookie>
```

| Parameter | Location   | Type     | Required | Notes                      |
| --------- | ---------- | -------- | -------- | -------------------------- |
| `id`      | Path param | `string` | Yes      | `IdeaAttachment.id` (cuid) |

No query parameters.

---

## Server-Side Processing (in order)

| Step | Check                                                                 | On Failure                              |
| ---- | --------------------------------------------------------------------- | --------------------------------------- |
| 1    | Feature flag enabled                                                  | 404 `{ error: 'Not found' }`            |
| 2    | Session present                                                       | 401 `{ error: 'Unauthorized' }`         |
| 3    | Load `IdeaAttachment` by `id` (include `idea { isPublic, authorId }`) | 404 `{ error: 'Attachment not found' }` |
| 4    | Access control (see table below)                                      | 403 `{ error: 'Forbidden' }`            |
| 5    | `generateSignedUrl(blobUrl, { expiresIn: 60 })`                       | —                                       |
| 6    | `fetch(signedUrl)` → stream to `NextResponse`                         | 502 if fetch fails (see below)          |

### Access Control Rules (Step 4)

| User role               | Idea visibility                                | Access       |
| ----------------------- | ---------------------------------------------- | ------------ |
| `ADMIN` or `SUPERADMIN` | Any                                            | ✅ Permitted |
| `USER`                  | Idea `isPublic === true`                       | ✅ Permitted |
| `USER`                  | Idea `isPublic === false`, user is idea author | ✅ Permitted |
| `USER`                  | Idea `isPublic === false`, user is NOT author  | ❌ 403       |

> Interpretation: Any authenticated user may download attachments of visible (public) ideas, matching the existing read access model for idea content.

---

## Response

### 200 OK — File streamed

```
Content-Type: <IdeaAttachment.mimeType>
Content-Disposition: attachment; filename="<IdeaAttachment.fileName>"
Cache-Control: no-store
X-Content-Type-Options: nosniff

<binary file content streamed from Vercel Blob>
```

`Cache-Control: no-store` prevents browser caching of signed-URL responses (which expire in 60 seconds).

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

### 502 Bad Gateway — Blob fetch failure

```json
{ "error": "File is no longer available." }
```

Returned if the signed URL fetch fails, indicating the blob has been deleted from Vercel storage (e.g., after a cleanup or error in deletion logic). The DB record in this state is stale — an admin should delete it.

---

## Design Notes

- **No redirect** to signed URLs: The client never sees the Vercel Blob URL, preventing direct access attempts and ensuring the access-control logic always runs.
- **Signed URL TTL**: 60 seconds is sufficient for a server-to-server fetch that begins immediately.
- **Streaming**: The response body is piped/streamed; the full file is not buffered in memory. `NextResponse` with a `ReadableStream` body handles this.
- **`Content-Disposition: attachment`**: Forces browser download rather than inline display, including for PDFs and images.
