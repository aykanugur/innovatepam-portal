# API Contract: Ideas Resource

**Base path**: `/api/ideas`  
**Auth**: All endpoints require an authenticated session (`next-auth`). Unauthenticated requests return `401`.  
**Feature**: `002-idea-submission`

---

## Shared Types

```ts
type IdeaStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED'
type IdeaVisibility = 'PUBLIC' | 'PRIVATE'
type CategorySlug =
  | 'process-improvement'
  | 'new-product-service'
  | 'cost-reduction'
  | 'employee-experience'
  | 'technical-innovation'

interface IdeaSummary {
  id: string
  title: string
  category: CategorySlug
  status: IdeaStatus
  visibility: IdeaVisibility
  authorName: string
  createdAt: string // ISO 8601
}

interface IdeaDetail extends IdeaSummary {
  description: string
  authorId: string
  attachmentUrl: string | null
  review: IdeaReviewDetail | null
}

interface IdeaReviewDetail {
  decision: 'ACCEPTED' | 'REJECTED'
  comment: string
  reviewerName: string
  reviewedAt: string // ISO 8601
}

interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}
```

---

## GET `/api/ideas`

Returns a paginated list of ideas visible to the authenticated user.

### Query Parameters

| Parameter  | Type     | Default | Description                        |
| ---------- | -------- | ------- | ---------------------------------- |
| `page`     | `number` | `1`     | 1-based page number                |
| `pageSize` | `number` | `20`    | Items per page (max 100)           |
| `category` | `string` | —       | Filter by category slug (optional) |

### Visibility Rules

| Role                   | Sees                                     |
| ---------------------- | ---------------------------------------- |
| `SUBMITTER`            | All `PUBLIC` ideas + own `PRIVATE` ideas |
| `ADMIN` / `SUPERADMIN` | All ideas regardless of visibility       |

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "clxyz123",
      "title": "Improve onboarding flow",
      "category": "employee-experience",
      "status": "SUBMITTED",
      "visibility": "PUBLIC",
      "authorName": "Jane Doe",
      "createdAt": "2026-02-24T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 47,
    "totalPages": 3
  }
}
```

Empty result (no ideas match filter or none exist):

```json
{ "data": [], "meta": { "page": 1, "pageSize": 20, "totalItems": 0, "totalPages": 0 } }
```

### Error Responses

| Status | Condition                                                     |
| ------ | ------------------------------------------------------------- |
| `400`  | Invalid query parameters (e.g., `page=0`, unknown `category`) |
| `401`  | Unauthenticated                                               |

---

## POST `/api/ideas`

Creates a new idea. Supports optional file attachment via `multipart/form-data`.

### Content-Type

- `application/json` — when no file attachment
- `multipart/form-data` — when `FEATURE_FILE_ATTACHMENT_ENABLED=true` and user attaches a file

### Request Body (JSON)

```json
{
  "title": "Improve onboarding",
  "description": "We should redesign the onboarding checklist to reduce drop-off.",
  "category": "employee-experience",
  "visibility": "PUBLIC"
}
```

### Request Body (multipart — attachment path)

Form fields: same as JSON fields above.  
File field: `attachment` — PDF, PNG, JPG, DOCX, or MD; max 5 MB.

### Validation Rules (Zod — applied server-side)

| Field         | Rule                                                              |
| ------------- | ----------------------------------------------------------------- |
| `title`       | required, 1–100 chars                                             |
| `description` | required, 1–2,000 chars                                           |
| `category`    | required, one of 5 category slugs                                 |
| `visibility`  | required, `PUBLIC` or `PRIVATE`                                   |
| `attachment`  | optional; rejected if file type not in allowed set or size > 5 MB |

### Rate Limit (FR-029)

One submission per authenticated user per 60-second sliding window (Upstash Redis key: `innovatepam:idea-submit:<userId>`).

### Success Response — `201 Created`

```json
{
  "data": {
    "id": "clxyz456",
    "title": "Improve onboarding",
    "category": "employee-experience",
    "status": "SUBMITTED",
    "visibility": "PUBLIC",
    "authorName": "Jane Doe",
    "authorId": "clxyz123",
    "description": "We should redesign...",
    "attachmentUrl": null,
    "review": null,
    "createdAt": "2026-02-24T10:05:00.000Z"
  }
}
```

### Error Responses

| Status | Condition             | Body example                                                         |
| ------ | --------------------- | -------------------------------------------------------------------- |
| `400`  | Validation failure    | `{ "errors": { "title": "Title is required" } }`                     |
| `401`  | Unauthenticated       | `{ "error": "Unauthorized" }`                                        |
| `413`  | File > 5 MB           | `{ "error": "File must be under 5 MB" }`                             |
| `415`  | Unsupported file type | `{ "error": "Only PDF, PNG, JPG, DOCX, and MD files are accepted" }` |
| `429`  | Rate limit exceeded   | `{ "error": "Too many submissions", "retryAfter": 45 }`              |

---

## GET `/api/ideas/[id]`

Returns the full detail of a single idea.

### Visibility Rules

| Role                   | Rule                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| `SUBMITTER`            | `PUBLIC` ideas: always allowed. `PRIVATE` idea: allowed only if `authorId === session.userId` |
| `ADMIN` / `SUPERADMIN` | Always allowed                                                                                |

### Success Response — `200 OK`

```json
{
  "data": {
    "id": "clxyz456",
    "title": "Improve onboarding",
    "description": "We should redesign...",
    "category": "employee-experience",
    "status": "SUBMITTED",
    "visibility": "PUBLIC",
    "authorName": "Jane Doe",
    "authorId": "clxyz123",
    "attachmentUrl": "https://public.blob.vercel-storage.com/abc123.pdf",
    "review": null,
    "createdAt": "2026-02-24T10:05:00.000Z"
  }
}
```

When idea has a review:

```json
{
  "data": {
    ...
    "review": {
      "decision": "ACCEPTED",
      "comment": "Great initiative, approved for Q2.",
      "reviewerName": "Admin User",
      "reviewedAt": "2026-02-25T09:00:00.000Z"
    }
  }
}
```

### Error Responses

| Status | Condition                                                                        |
| ------ | -------------------------------------------------------------------------------- |
| `401`  | Unauthenticated                                                                  |
| `404`  | Idea does not exist, OR idea is `PRIVATE` and viewer is a non-author `SUBMITTER` |

---

## DELETE `/api/ideas/[id]`

Deletes an idea and its associated review record (if any). Blob file is **not** deleted (FR-028).

### Authorization

| Caller role            | Allowed when                                                         |
| ---------------------- | -------------------------------------------------------------------- |
| `SUBMITTER` (author)   | `idea.status === 'SUBMITTED'` AND `idea.authorId === session.userId` |
| `ADMIN` / `SUPERADMIN` | Any idea, any status                                                 |

### Success Response — `200 OK`

```json
{ "data": { "deleted": true, "id": "clxyz456" } }
```

### Side Effects

1. `Idea` record hard-deleted from database.
2. Cascading `IdeaReview` record deleted (if exists) — via Prisma `onDelete: Cascade`.
3. `AuditLog` entry written: `action: IDEA_DELETED`, `actorId: session.userId`, `targetId: idea.id`, `metadata: { ideaTitle, deletedByRole }`.
4. Blob file at `Idea.attachmentPath` is **not** deleted.

### Error Responses

| Status | Condition                                                                                |
| ------ | ---------------------------------------------------------------------------------------- |
| `401`  | Unauthenticated                                                                          |
| `403`  | `SUBMITTER` attempting delete when status ≠ `SUBMITTED`, or deleting another user's idea |
| `404`  | Idea does not exist, or `PRIVATE` idea not visible to caller                             |

---

## GET `/api/ideas/mine`

Returns only the authenticated user's own submissions (both PUBLIC and PRIVATE), newest-first. No pagination (My Ideas is a personal list without pagination per spec — alpha scope).

### Success Response — `200 OK`

```json
{
  "data": [
    {
      "id": "clxyz456",
      "title": "Improve onboarding",
      "category": "employee-experience",
      "status": "SUBMITTED",
      "visibility": "PRIVATE",
      "authorName": "Jane Doe",
      "createdAt": "2026-02-24T10:05:00.000Z"
    }
  ]
}
```

Empty state (no submissions):

```json
{ "data": [] }
```

### Error Responses

| Status | Condition       |
| ------ | --------------- |
| `401`  | Unauthenticated |
