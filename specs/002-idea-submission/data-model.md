# Data Model: Idea Submission & Discovery

**Feature**: `002-idea-submission`
**Date**: 2026-02-24
**Migration**: Requires `prisma migrate dev --name add-idea-audit-log`

---

## Existing Entities (no schema change needed)

### `User`

| Field         | Type              | Notes                                                        |
| ------------- | ----------------- | ------------------------------------------------------------ |
| `id`          | `String` (cuid)   | PK                                                           |
| `email`       | `String` (unique) | Login identity                                               |
| `displayName` | `String`          | **The "profile name" used in delete confirm modal (FR-019)** |
| `role`        | `Role` enum       | `SUBMITTER` \| `ADMIN` \| `SUPERADMIN`                       |
| `createdAt`   | `DateTime`        |                                                              |
| `updatedAt`   | `DateTime`        |                                                              |

### `Idea`

| Field            | Type                  | Notes                                                     |
| ---------------- | --------------------- | --------------------------------------------------------- |
| `id`             | `String` (cuid)       | PK                                                        |
| `title`          | `String`              | max 100 chars (validated in Zod, not DB)                  |
| `description`    | `String`              | max 2,000 chars (validated in Zod, not DB)                |
| `category`       | `String`              | one of category slug constants                            |
| `status`         | `IdeaStatus` enum     | `SUBMITTED` \| `UNDER_REVIEW` \| `ACCEPTED` \| `REJECTED` |
| `visibility`     | `IdeaVisibility` enum | `PUBLIC` \| `PRIVATE`                                     |
| `attachmentPath` | `String?`             | Vercel Blob URL — null when no attachment or flag off     |
| `authorId`       | `String` (FK→User)    |                                                           |
| `createdAt`      | `DateTime`            | Used for newest-first ordering                            |
| `updatedAt`      | `DateTime`            |                                                           |

**Visibility access rules**:

- `PUBLIC` → readable by any authenticated user
- `PRIVATE` → readable only by `author` OR users with `ADMIN`/`SUPERADMIN` role

**Status transitions** (this epic covers creation only; EPIC-04 handles review transitions):

```
  [new]
    ↓
SUBMITTED  ──(admin opens review)──→  UNDER_REVIEW
                                            ↓
                                  ACCEPTED / REJECTED
```

Author can **delete** only when `status = SUBMITTED`. Button is hidden for all other statuses.

### `IdeaReview`

| Field        | Type                       | Notes                                 |
| ------------ | -------------------------- | ------------------------------------- |
| `id`         | `String` (cuid)            | PK                                    |
| `decision`   | `ReviewDecision` enum      | `ACCEPTED` \| `REJECTED`              |
| `comment`    | `String`                   | mandatory written comment (non-empty) |
| `ideaId`     | `String` (FK→Idea, unique) | one review per idea maximum           |
| `reviewerId` | `String` (FK→User)         |                                       |
| `createdAt`  | `DateTime`                 |                                       |

---

## New Entity: `AuditLog`

Persists structured mutation events for FR-026. Append-only; never updated or deleted.

```prisma
model AuditLog {
  id        String      @id @default(cuid())
  actorId   String
  action    AuditAction
  targetId  String      // Idea.id
  metadata  Json?       // e.g. { ideaTitle, visibility, deletedByRole }
  createdAt DateTime    @default(now())

  actor User @relation("UserAuditLogs", fields: [actorId], references: [id])
}

enum AuditAction {
  IDEA_CREATED
  IDEA_DELETED
}
```

**Relation addition required** on `User`:

```prisma
model User {
  // ... existing fields ...
  auditLogs AuditLog[] @relation("UserAuditLogs")
}
```

### AuditLog field guide

| Field       | Type          | Example                                                        |
| ----------- | ------------- | -------------------------------------------------------------- |
| `actorId`   | User.id       | `"clxyz123"`                                                   |
| `action`    | `AuditAction` | `IDEA_CREATED`                                                 |
| `targetId`  | Idea.id       | `"clxyz456"`                                                   |
| `metadata`  | JSON          | `{ "ideaTitle": "Better onboarding", "visibility": "PUBLIC" }` |
| `createdAt` | DateTime      | auto                                                           |

---

## New Enum: `AuditAction`

```prisma
enum AuditAction {
  IDEA_CREATED
  IDEA_DELETED
}
```

---

## Zod Validation Schemas

Defined in `lib/validations/idea.ts` — used both client-side (form) and server-side (API handler).

### `CreateIdeaSchema`

```ts
const CATEGORY_SLUGS = [
  'process-improvement',
  'new-product-service',
  'cost-reduction',
  'employee-experience',
  'technical-innovation',
] as const

export const CreateIdeaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Max 100 characters'),
  description: z.string().min(1, 'Description is required').max(2000, 'Max 2,000 characters'),
  category: z.enum(CATEGORY_SLUGS, { errorMap: () => ({ message: 'Select a valid category' }) }),
  visibility: z.enum(['PUBLIC', 'PRIVATE'], { errorMap: () => ({ message: 'Select visibility' }) }),
})

export type CreateIdeaInput = z.infer<typeof CreateIdeaSchema>
```

### `IdeaListQuerySchema`

```ts
export const IdeaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(CATEGORY_SLUGS).optional(),
})
```

---

## Constants: `constants/categories.ts`

```ts
export const CATEGORIES = [
  { slug: 'process-improvement', label: 'Process Improvement' },
  { slug: 'new-product-service', label: 'New Product/Service' },
  { slug: 'cost-reduction', label: 'Cost Reduction' },
  { slug: 'employee-experience', label: 'Employee Experience' },
  { slug: 'technical-innovation', label: 'Technical Innovation' },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]['slug']
```

---

## Migration Checklist

- [ ] Add `AuditLog` model to `prisma/schema.prisma`
- [ ] Add `AuditAction` enum to `prisma/schema.prisma`
- [ ] Add `auditLogs AuditLog[]` relation to `User` model
- [ ] Run `npm run db:generate` then `npm run db:migrate` with name `add-idea-audit-log`
- [ ] Add `BLOB_READ_WRITE_TOKEN` to `.env.example` and `.env.local` (Vercel Blob — only required when `FEATURE_FILE_ATTACHMENT_ENABLED=true`)
- [ ] Install `@vercel/blob`: `npm install @vercel/blob`
