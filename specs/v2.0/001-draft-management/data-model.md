# Data Model: Draft Management

**Phase**: 1 — Design & Contracts  
**Branch**: `001-draft-management`  
**Date**: 2026-02-26  
**Spec**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

---

## 1. Schema Changes — `prisma/schema.prisma`

### 1.1 `IdeaStatus` Enum — Add `DRAFT`

```prisma
enum IdeaStatus {
  DRAFT         // NEW — saved but not yet submitted; author-only visibility
  SUBMITTED     // initial state on submission (unchanged)
  UNDER_REVIEW  // admin has opened the review (unchanged)
  ACCEPTED      // admin decision: accepted (unchanged)
  REJECTED      // admin decision: rejected (unchanged)
}
```

> `DRAFT` is placed BEFORE `SUBMITTED` in both the schema and the PostgreSQL enum.

---

### 1.2 `AuditAction` Enum — Add Draft Actions

```prisma
enum AuditAction {
  IDEA_CREATED
  IDEA_DELETED
  IDEA_REVIEW_STARTED
  IDEA_REVIEWED
  IDEA_REVIEW_ABANDONED
  ATTACHMENT_DELETED
  DRAFT_SAVED       // NEW — user explicitly clicked "Save Draft" (create or update)
  DRAFT_DELETED     // NEW — user deleted a draft from the Drafts tab
  DRAFT_SUBMITTED   // NEW — draft transitioned to SUBMITTED via submit action
}
```

---

### 1.3 `Idea` Model — New & Modified Fields

```prisma
model Idea {
  id             String         @id @default(cuid())
  title          String?        // MODIFIED: nullable to allow empty drafts (was String)
  description    String?        // MODIFIED: nullable (was String)
  category       String?        // MODIFIED: nullable (was String)
  status         IdeaStatus     @default(SUBMITTED)   // MODIFIED: default unchanged; DRAFT is now a valid value
  visibility     IdeaVisibility @default(PUBLIC)       // unchanged
  attachmentPath String?                               // unchanged (soft-deprecated)
  dynamicFields  Json?                                 // unchanged

  // NEW — draft lifecycle columns
  draftExpiresAt DateTime?      // null for non-draft ideas; set to now()+90d on draft creation; reset on each save
  isExpiredDraft Boolean        @default(false)  // soft-delete flag; set to true by cron or lazy check
  softDeletedAt  DateTime?      // when isExpiredDraft was set to true; used to calculate 30-day hard-delete threshold

  authorId String
  author   User       @relation("UserIdeas", fields: [authorId], references: [id])

  review      IdeaReview?     @relation("IdeaReview")
  attachments IdeaAttachment[] @relation("IdeaAttachments")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt        // reset on every implicit Prisma update — used for localStorage restore comparison

  @@index([authorId, status])                          // NEW — accelerates per-user draft queries
  @@index([isExpiredDraft, draftExpiresAt])             // NEW — accelerates cron soft-delete query
}
```

**Field-by-field rationale:**

| Field                                       | Change               | Why                                                           |
| ------------------------------------------- | -------------------- | ------------------------------------------------------------- |
| `title`                                     | `String` → `String?` | Allow saving draft with no title (FR-001)                     |
| `description`                               | `String` → `String?` | Same reason                                                   |
| `category`                                  | `String` → `String?` | Same reason                                                   |
| `draftExpiresAt`                            | New `DateTime?`      | 90-day expiry clock (FR-002, FR-009)                          |
| `isExpiredDraft`                            | New `Boolean`        | Soft-delete flag; avoids 6th enum value (Research Decision 4) |
| `softDeletedAt`                             | New `DateTime?`      | 30-day hard-delete threshold for cron (FR-010)                |
| `@@index([authorId, status])`               | New index            | Drafts tab query performance                                  |
| `@@index([isExpiredDraft, draftExpiresAt])` | New index            | Cron query performance                                        |

---

## 2. Migration SQL

**File**: `prisma/migrations/20260226_draft_management/migration.sql`  
**Application method**: Manual via Neon dashboard SQL editor (CLI blocked — see research.md Decision 1)

```sql
-- ============================================================================
-- Migration: 001-draft-management
-- Branch: 001-draft-management
-- Date: 2026-02-26
-- Apply via: Neon dashboard → SQL editor
-- ============================================================================

-- 1. Extend IdeaStatus enum
ALTER TYPE "IdeaStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'SUBMITTED';

-- 2. Extend AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DRAFT_SAVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DRAFT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DRAFT_SUBMITTED';

-- 3. Make idea fields nullable for draft support
ALTER TABLE "Idea" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "Idea" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Idea" ALTER COLUMN "category" DROP NOT NULL;

-- 4. Add draft lifecycle columns
ALTER TABLE "Idea" ADD COLUMN IF NOT EXISTS "draftExpiresAt" TIMESTAMP(3);
ALTER TABLE "Idea" ADD COLUMN IF NOT EXISTS "isExpiredDraft" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Idea" ADD COLUMN IF NOT EXISTS "softDeletedAt" TIMESTAMP(3);

-- 5. Performance indexes
CREATE INDEX IF NOT EXISTS "Idea_authorId_status_idx" ON "Idea"("authorId", "status");
CREATE INDEX IF NOT EXISTS "Idea_isExpiredDraft_draftExpiresAt_idx" ON "Idea"("isExpiredDraft", "draftExpiresAt");

-- ============================================================================
-- Verification: Run after applying
-- SELECT column_name, is_nullable, data_type FROM information_schema.columns
--   WHERE table_name = 'Idea' AND column_name IN ('title','description','category','draftExpiresAt','isExpiredDraft','softDeletedAt');
-- SELECT enum_range(NULL::"IdeaStatus");
-- SELECT enum_range(NULL::"AuditAction");
-- ============================================================================
```

---

## 3. State Machine Changes — `lib/state-machine/idea-status.ts`

### 3.1 Updated Types

```typescript
export type IdeaStatus = 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED'
export type ReviewAction = 'SUBMIT' | 'START_REVIEW' | 'ACCEPT' | 'REJECT' | 'ABANDON'
export type UserRole = 'SUBMITTER' | 'ADMIN' | 'SUPERADMIN'
```

### 3.2 Updated Transition Function (diff-style)

```typescript
export function transition(current: IdeaStatus, action: ReviewAction, role: UserRole): IdeaStatus {
  // ... existing guards unchanged ...

  switch (current) {
    // NEW CASE:
    case 'DRAFT':
      if (action === 'SUBMIT') return 'SUBMITTED'
      throw new InvalidTransitionError(current, action)

    case 'SUBMITTED':
      if (action === 'START_REVIEW') return 'UNDER_REVIEW'
      throw new InvalidTransitionError(current, action)

    case 'UNDER_REVIEW':
      if (action === 'ACCEPT') return 'ACCEPTED'
      if (action === 'REJECT') return 'REJECTED'
      if (action === 'ABANDON') return 'SUBMITTED'
      throw new InvalidTransitionError(current, action)

    case 'ACCEPTED':
    case 'REJECTED':
      throw new InvalidTransitionError(current, action)

    default: {
      const _exhaustive: never = current // compile-time exhaustiveness check
      throw new InvalidTransitionError(_exhaustive, action)
    }
  }
}
```

### 3.3 Valid Transition Table (complete)

| From           | Action         | Required Role      | To                          |
| -------------- | -------------- | ------------------ | --------------------------- |
| `DRAFT`        | `SUBMIT`       | Any (author)       | `SUBMITTED`                 |
| `SUBMITTED`    | `START_REVIEW` | ADMIN / SUPERADMIN | `UNDER_REVIEW`              |
| `UNDER_REVIEW` | `ACCEPT`       | ADMIN / SUPERADMIN | `ACCEPTED`                  |
| `UNDER_REVIEW` | `REJECT`       | ADMIN / SUPERADMIN | `REJECTED`                  |
| `UNDER_REVIEW` | `ABANDON`      | SUPERADMIN only    | `SUBMITTED`                 |
| Any            | Any other      | —                  | ❌ `InvalidTransitionError` |

### 3.4 Role Guard Note for `SUBMIT`

The `SUBMIT` action is special: the author identity check (only the draft's author may submit) is enforced in the `submitDraft` Server Action **before** calling `transition()`, not inside `transition()` itself. The state machine guards roles for review actions only — it does not have access to `authorId`.

---

## 4. Validation Schema — `lib/validations/draft.ts`

```typescript
import { z } from 'zod'

export const SaveDraftSchema = z.object({
  id: z.string().cuid().optional(), // undefined = new draft; present = update
  title: z.string().max(150).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  category: z.string().optional().nullable(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  dynamicFields: z.record(z.string(), z.unknown()).optional().nullable(),
  attachmentUrls: z.array(z.string()).optional(), // staged upload URLs (from EPIC-V2-02)
})

export type SaveDraftInput = z.infer<typeof SaveDraftSchema>
```

**Rules**: No required fields beyond "must be a valid cuid if id is provided". Max lengths enforced. All other validation is deferred to the submission path.

---

## 5. Environment Variables — `lib/env.ts` additions

```typescript
// Draft management
FEATURE_DRAFT_ENABLED: z.string().default('false'),
CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters'),
```

**`.env.local` additions**:

```shell
FEATURE_DRAFT_ENABLED="true"
CRON_SECRET="<generate with: openssl rand -base64 32>"
```

---

## 6. Entity Relationships (unchanged FK structure)

```
User ──┬── Idea (authorId) ─── IdeaReview (ideaId)
       │                   └── IdeaAttachment[] (ideaId)
       └── AuditLog (actorId)
```

No new foreign keys. `isExpiredDraft`, `draftExpiresAt`, `softDeletedAt` are all scalar columns on `Idea`.

---

## 7. Callsite Audit — `String | null` Impact

Making `title`, `description`, `category` nullable creates TypeScript errors at every callsite that reads these fields without null-checking. Known high-risk locations:

| File                                 | Field Access                                                      | Required Fix                                                         |
| ------------------------------------ | ----------------------------------------------------------------- | -------------------------------------------------------------------- |
| `components/ideas/idea-card.tsx`     | `idea.title`, `idea.category`                                     | Add `?? 'Untitled Draft'`, `?? 'No category'` fallbacks              |
| `app/(main)/ideas/[id]/page.tsx`     | `idea.title`, `idea.description`                                  | Add null checks                                                      |
| `app/admin/review/page.tsx`          | `idea.title`, `idea.category`                                     | Query already filters `status != DRAFT`; add fallbacks as safety net |
| `lib/actions/create-idea.ts`         | `title`, `description`, `category` required via Zod on submission | No change — Zod requires these on submit path                        |
| `components/admin/decision-card.tsx` | `idea.title`                                                      | Add `?? 'Untitled'` fallback                                         |
| Status badge utilities               | `idea.status` switch                                              | Add `case 'DRAFT':` to every switch/map                              |

`tsc --noEmit` will surface all missed callsites at compile time — run after schema migration before manual testing.
