# Research: Idea Submission & Discovery

**Feature**: `002-idea-submission`
**Date**: 2026-02-24
**Status**: Complete — all NEEDS CLARIFICATION items resolved

---

## R-001 — "Profile name" definition (resolves CHK007 / FR-019)

**Decision**: The existing `User.displayName` field is the canonical profile name. The delete-confirmation modal MUST compare the user's typed input against `User.displayName` (case-sensitive, trimmed). No new field is needed.

**Evidence**: `prisma/schema.prisma` — `model User { displayName String }`.  
**Rationale**: `displayName` is already the value shown in the UI across all authenticated surfaces. Using the email would introduce unexpected friction; using a separate "username" would require a schema change with no broader benefit.  
**Alternatives considered**: Email address (rejected — unfamiliar format for a "name" confirmation), new `username` field (rejected — schema churn, no other use case).

---

## R-002 — File attachment blob storage (resolves gap on FR-005/FR-018)

**Decision**: Use **Vercel Blob** (`@vercel/blob`) for file attachment storage.

**Rationale**: The project deploys to Vercel (Next.js 16, Neon, Upstash Redis all in the Vercel ecosystem). Vercel Blob integrates natively with Next.js Route Handlers, requires only a single env var (`BLOB_READ_WRITE_TOKEN`), supports server-side uploads via `put()`, and returns a permanent `url` that maps directly to `Idea.attachmentPath`.  
**Alternatives considered**:

- AWS S3 — overkill for alpha, requires extra IAM/SDK boilerplate.
- Cloudflare R2 — compatible but adds a second cloud dependency.
- Supabase Storage — not already in the stack.

**Implementation pattern**:

```ts
// app/api/ideas/route.ts  (multipart upload branch)
import { put } from '@vercel/blob'
const { url } = await put(filename, fileBuffer, { access: 'public' })
// store url in Idea.attachmentPath
```

**New dependency**: `@vercel/blob` (add to `package.json`).  
**New env var**: `BLOB_READ_WRITE_TOKEN` (add to `.env.example`).

---

## R-003 — Submission rate-limit implementation (resolves FR-029)

**Decision**: Extend the existing `lib/rate-limit.ts` pattern with a dedicated `ideaSubmitRateLimiter` using `Ratelimit.slidingWindow(1, '60 s')`, keyed on `userId` (the authenticated user's cuid).

**Rationale**: `lib/rate-limit.ts` already abstracts Upstash Redis vs. in-memory fallback. Adding a second factory function follows the established pattern with zero new infrastructure.

**Implementation**:

```ts
// lib/rate-limit.ts (addition)
export const ideaSubmitRateLimiter = createRateLimiter({
  prefix: 'innovatepam:idea-submit',
  limiter: Ratelimit.slidingWindow(1, '60 s'),
  fallbackLimit: 1,
  fallbackWindow: 60_000,
})
```

Key = `userId` cuid from session.  
Response: HTTP 429 with `{ error: "Too many submissions", retryAfter: <seconds> }`.

**Alternatives considered**: DB-based timestamp check — simpler but no atomic guarantee and pollutes the Idea table schema.

---

## R-004 — Audit logging sink (resolves FR-026)

**Decision**: Persist audit events in a new **`AuditLog` Prisma model** in the existing PostgreSQL database.

**Rationale**: The project already uses Prisma + Neon Postgres. Adding a table is the simplest durable sink — no new service, no new SDK, consistent query patterns, and the data is co-located with the entities it references.

**Schema** (see also `data-model.md`):

```prisma
model AuditLog {
  id        String   @id @default(cuid())
  actorId   String                      // User.id
  action    AuditAction
  targetId  String                      // Idea.id
  metadata  Json?                       // optional payload
  createdAt DateTime @default(now())

  actor User @relation("UserAuditLogs", fields: [actorId], references: [id])
}

enum AuditAction {
  IDEA_CREATED
  IDEA_DELETED
}
```

**Alternatives considered**: Structured stdout (rejected — no queryable history), external SIEM/Datadog (rejected — out of scope for alpha).

---

## R-005 — Admin delete confirmation UX (resolves spec gap FR-020)

**Decision**: For P1, ADMIN and SUPERADMIN deletes **do not require a name-match confirmation modal**. They see a simple "Delete" button that triggers a browser-level confirmation (`window.confirm`) — or a one-step confirm button within a minimal alert dialog — before the delete action fires.

**Rationale**: The name-match modal is an intentional friction gate for idea authors to prevent self-service accidents. Admins act in a moderation capacity where the friction would impede workflow. A lighter confirmation (alert dialog with "Delete" / "Cancel") is sufficient for the alpha.

**Alternatives considered**: Same modal (rejected — disproportionate friction for admin role), no confirmation (rejected — accidental deletes with no undo).

---

## R-006 — Pagination mechanism (resolves contracts gap CHK022)

**Decision**: Offset-based pagination with URL query parameters: `?page=1&category=cost-reduction&pageSize=20`.

**Page default**: 1. **PageSize default**: 20 (fixed for P1 — not user-configurable).  
**Response envelope**:

```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 47,
    "totalPages": 3
  }
}
```

**Out-of-bounds page**: Returns empty `data` array with correct `meta` (not 404).

**Rationale**: Cursor-based pagination is better for large datasets but adds implementation complexity. For an alpha with < 10K ideas, offset is adequate and simpler to implement with Prisma's `skip`/`take`.

---

## R-007 — Category URL parameter format (resolves contracts gap CHK023)

**Decision**: Category filter is passed as a **kebab-case slug** matching the value names:

| Display Label        | URL slug               |
| -------------------- | ---------------------- |
| Process Improvement  | `process-improvement`  |
| New Product/Service  | `new-product-service`  |
| Cost Reduction       | `cost-reduction`       |
| Employee Experience  | `employee-experience`  |
| Technical Innovation | `technical-innovation` |

**Rationale**: Readable URLs, no URL-encoding needed, consistent with REST conventions.  
**Mapping constant**: Defined in `constants/categories.ts` (shared between client and server).

---

## R-008 — Source code layout decision

**Decision**: Next.js App Router layout — no separate `backend/` dir. Feature spans:

```
app/
├── (main)/
│   ├── ideas/                   # US-009 — Idea list page
│   │   └── page.tsx
│   ├── ideas/[id]/              # US-010 — Idea detail page
│   │   └── page.tsx
│   ├── ideas/new/               # US-008 — Submit idea form
│   │   └── page.tsx
│   └── my-ideas/                # US-011 — My ideas page
│       └── page.tsx
app/
└── api/
    └── ideas/
        ├── route.ts             # GET (list) + POST (create)
        └── [id]/
            └── route.ts         # GET (detail) + DELETE (delete)

lib/
├── actions/
│   ├── create-idea.ts           # Server action wrapping POST
│   └── delete-idea.ts           # Server action wrapping DELETE
├── validations/
│   └── idea.ts                  # Zod schemas for idea payloads
└── rate-limit.ts                # +ideaSubmitRateLimiter (extension)

components/
└── ideas/
    ├── idea-form.tsx
    ├── idea-card.tsx
    ├── idea-list.tsx
    ├── idea-detail.tsx
    ├── delete-idea-modal.tsx    # Name-match confirmation dialog
    └── category-filter.tsx

constants/
└── categories.ts                # Category labels ↔ slugs map
```

---

## Open Items After Research

All NEEDS CLARIFICATION items resolved. One item deferred by spec decision:

| Item                       | Decision                                                   |
| -------------------------- | ---------------------------------------------------------- |
| Admin delete modal (R-005) | Light confirmation (alert dialog) — no name-match required |
| Blob cleanup on delete     | Out of scope per FR-028 / clarification Q3                 |
| Status filter              | Deferred per clarification Q2                              |
