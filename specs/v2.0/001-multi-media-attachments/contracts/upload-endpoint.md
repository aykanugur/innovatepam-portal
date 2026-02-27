# Contract: Upload Endpoint

**Route**: `POST /api/ideas/upload`
**Feature gate**: `FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'`
**Auth**: Session required

---

## Request

```
POST /api/ideas/upload?filename=<originalFilename>
Authorization: Bearer <session-cookie>
Content-Type: <mime-type-of-file>
Content-Length: <byte-size>

<raw binary file body>
```

| Parameter  | Location     | Type     | Required | Notes                                                                                                  |
| ---------- | ------------ | -------- | -------- | ------------------------------------------------------------------------------------------------------ |
| `filename` | Query string | `string` | Yes      | Original filename. URL-encoded. Used for MIME extension check and stored in `IdeaAttachment.fileName`. |

The route handler receives `request.body` (a `ReadableStream`) directly and streams it to Vercel Blob — no intermediate disk write, no multipart form parsing.

---

## Server-Side Validation (in order)

| Step | Check                                                                                               | On Failure                                                |
| ---- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1    | Feature flag enabled                                                                                | 404 `{ error: 'Not found' }`                              |
| 2    | Session present                                                                                     | 401 `{ error: 'Unauthorized' }`                           |
| 3    | `filename` query param present and non-empty                                                        | 400 `{ error: 'filename query parameter is required' }`   |
| 4    | `filename` passes sanitisation (no `/`, `\`, `..`, null bytes)                                      | 400 `{ error: 'Invalid filename' }`                       |
| 5    | Content-Type header matches `ALLOWED_MIME_TYPES` OR filename extension matches `ALLOWED_EXTENSIONS` | 400 `{ error: 'File type not allowed' }`                  |
| 6    | `Content-Length` header > 0 (non-empty file)                                                        | 400 `{ error: 'File is empty.' }`                         |
| 7    | `Content-Length` header ≤ `MAX_FILE_SIZE_BYTES` (25 MB)                                             | 413 `{ error: 'File too large. Maximum size is 25 MB.' }` |

> **Note on MIME detection**: Step 5 checks both `Content-Type` header and file extension. If the browser sends `application/octet-stream` for a `.md` file, the extension check allows it. Both must fail for the request to be rejected.

---

## Processing

```
PUT filename → Vercel Blob (access: 'private', addRandomSuffix: true)
```

Returns a `{ url: string }` from the Vercel Blob SDK. This URL is the `blobUrl` stored in `IdeaAttachment`.

The upload endpoint **does not** create the `IdeaAttachment` row — that responsibility belongs to the idea creation Server Action. The client receives the `blobUrl` and includes it in the create-idea form submission payload.

---

## Response

### 200 OK — Upload successful

```json
{
  "blobUrl": "https://abc.public.blob.vercel-storage.com/ideas/filename-RANDOM.pdf"
}
```

### 400 Bad Request — Validation failure

```json
{
  "error": "File type not allowed"
}
```

### 401 Unauthorized

```json
{
  "error": "Unauthorized"
}
```

### 413 Request Entity Too Large

```json
{
  "error": "File too large. Maximum size is 25 MB."
}
```

### 500 Internal Server Error — Blob SDK failure

```json
{
  "error": "Upload failed. Please try again."
}
```

---

## Security Notes

- `access: 'private'` on Vercel Blob — blob URLs are not publicly readable; access is only via the signed-URL proxy.
- `addRandomSuffix: true` — prevents path enumeration even if a blobUrl were leaked.
- Filename sanitisation prevents path traversal attacks.
- Rate limiting: inherits global rate limiter on `/api/*` routes.
