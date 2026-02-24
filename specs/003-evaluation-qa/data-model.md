# Data Model: Evaluation Workflow, Admin Tools & Quality Gate

**Feature**: `003-evaluation-qa` | **Date**: 2026-02-24

---

## 1. Schema Changes Required

### 1a. IdeaReview — Make decision / comment optional; add timestamps

**Current schema:**

```prisma
model IdeaReview {
  id       String         @id @default(cuid())
  decision ReviewDecision        // ← NOT NULL — must change
  comment  String                // ← NOT NULL — must change

  ideaId String @unique
  idea   Idea   @relation("IdeaReview", fields: [ideaId], references: [id])

  reviewerId String
  reviewer   User   @relation("UserReviews", fields: [reviewerId], references: [id])

  createdAt DateTime @default(now())
}
```

**Updated schema:**

```prisma
model IdeaReview {
  id        String          @id @default(cuid())
  decision  ReviewDecision?          // nullable — set only at finalization
  comment   String?                  // nullable — set only at finalization
  startedAt DateTime        @default(now())  // set at Start Review
  decidedAt DateTime?                // set at finalization

  ideaId String @unique
  idea   Idea   @relation("IdeaReview", fields: [ideaId], references: [id])

  reviewerId String
  reviewer   User   @relation("UserReviews", fields: [reviewerId], references: [id])

  createdAt DateTime @default(now())
}
```

**Migration SQL** (Prisma will generate this — shown for clarity):

```sql
ALTER TABLE "IdeaReview"
  ALTER COLUMN "decision" DROP NOT NULL,
  ALTER COLUMN "comment"  DROP NOT NULL,
  ADD COLUMN "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "decidedAt" TIMESTAMP(3);
```

**Impact on existing data**: Any existing `IdeaReview` rows (test data from seeder) will have `startedAt` defaulting to the migration timestamp and `decidedAt` remaining null. The existing required `decision` and `comment` will retain their values. Zero data loss.

---

### 1b. AuditAction Enum — Add three new values

**Current enum:**

```prisma
enum AuditAction {
  IDEA_CREATED
  IDEA_DELETED
}
```

**Updated enum:**

```prisma
enum AuditAction {
  IDEA_CREATED
  IDEA_DELETED
  IDEA_REVIEW_STARTED    // admin opened a review
  IDEA_REVIEWED          // admin finalized Accept/Reject
  IDEA_REVIEW_ABANDONED  // SUPERADMIN reset UNDER_REVIEW → SUBMITTED
}
```

**PostgreSQL ALTER TYPE**: Adding enum values is non-destructive in Postgres 12+. Prisma will generate `ALTER TYPE "AuditAction" ADD VALUE 'IDEA_REVIEW_STARTED'` etc.

---

## 2. Entities (unchanged schema — no migration needed)

### User

```
id            String   (cuid)
email         String   (unique)
passwordHash  String
displayName   String   ← settable via US-015 (update-display-name action)
role          Role     (SUBMITTER | ADMIN | SUPERADMIN)
emailVerified Boolean
createdAt     DateTime
updatedAt     DateTime
```

**Validation rules (US-015)**:

- `displayName`: required, min 1 char (after trim), max 50 chars

### Idea

```
id             String      (cuid)
title          String
description    String
category       String
status         IdeaStatus  (SUBMITTED | UNDER_REVIEW | ACCEPTED | REJECTED)
visibility     IdeaVisibility
attachmentPath String?
authorId       String → User
createdAt      DateTime
updatedAt      DateTime
```

No schema change. Status transitions are enforced by the state machine function.

### IdeaReview ← MIGRATION REQUIRED (see §1a)

```
id         String          (cuid)
decision   ReviewDecision? (ACCEPTED | REJECTED) — null until finalized
comment    String?          — null until finalized; min 10 chars when set
startedAt  DateTime         — set at Start Review
decidedAt  DateTime?        — null until finalized
ideaId     String          (unique) → Idea (cascade delete)
reviewerId String          → User
createdAt  DateTime
```

**Two-step lifecycle:**

1. `startReviewAction` → creates row with `decision = null`, `comment = null`, `startedAt = now()`
2. `finalizeReviewAction` → updates row with `decision`, `comment`, `decidedAt = now()`

**Validations at finalization:**

- `comment`: required (not null, not empty after trim), minimum 10 characters
- `decision`: must be `ACCEPTED` or `REJECTED`

**Concurrency guard**: `ideaId @unique` ensures only one review row can exist per idea. A second `startReview` call finds the row and throws `IdeaAlreadyUnderReviewError`.

### AuditLog ← ENUM MIGRATION REQUIRED (see §1b)

```
id        String      (cuid)
actorId   String      → User
action    AuditAction
targetId  String      (Idea.id)
metadata  Json?
createdAt DateTime
```

**Metadata shapes by action:**

| `action`                | `metadata` shape                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `IDEA_CREATED`          | `{ ideaTitle: string, visibility: string }`                                                          |
| `IDEA_DELETED`          | `{ ideaTitle: string, deletedByRole: string }`                                                       |
| `IDEA_REVIEW_STARTED`   | `{ ideaId: string, reviewerId: string, reviewerDisplayName: string }`                                |
| `IDEA_REVIEWED`         | `{ ideaId: string, reviewerId: string, decision: "ACCEPTED" \| "REJECTED", commentSummary: string }` |
| `IDEA_REVIEW_ABANDONED` | `{ ideaId: string, originalReviewerId: string, abandonedByAdminId: string }`                         |

`commentSummary` = `comment.trim().slice(0, 100)`

---

## 3. State Machine

```
IdeaStatus transitions (pure function: lib/state-machine/idea-status.ts)

                    ┌──────────────────────────────────────────┐
                    │              START_REVIEW                 │
                    │         (ADMIN | SUPERADMIN)              │
                    ▼                                           │
SUBMITTED ──────────────────► UNDER_REVIEW                     │
                                   │     │                      │
                      ACCEPT       │     │  REJECT              │
                  (ADMIN|SUPER)    │     │  (ADMIN|SUPER)       │
                                   ▼     ▼                      │
                               ACCEPTED  REJECTED               │
                                                                │
                    ABANDON (SUPERADMIN only) ──────────────────┘
                    resets UNDER_REVIEW ──► SUBMITTED
```

**All other transitions**: throw `InvalidTransitionError(current, action)`.

**Error types** (exported from `lib/state-machine/idea-status.ts`):

```typescript
class InvalidTransitionError extends Error {
  current: IdeaStatus
  action: ReviewAction
}
class InsufficientRoleError extends Error {
  required: string
  actual: string
}
class AlreadyReviewedError extends Error {
  current: IdeaStatus
}
```

---

## 4. Validation Rules Summary

| Field                  | Rule                                              | Where enforced                                   |
| ---------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Review comment         | Required when finalizing; min 10 chars after trim | `lib/validations/review.ts` (Zod), Server Action |
| Display name           | Required; ≤ 50 chars; non-empty after trim        | `lib/validations/user.ts` (Zod), Server Action   |
| New password           | ≥ 8 chars, ≥ 1 uppercase, ≥ 1 number              | `lib/validations/user.ts` (Zod), Server Action   |
| Confirm password ↔ new | Must match                                        | Client-side only (react-hook-form)               |
| Current password       | Must verify against `bcrypt.compare()`            | Server Action (no Zod)                           |

---

## 5. New Schema (complete merged view — `prisma/schema.prisma` after migration)

No new models. Changes to existing:

- `IdeaReview`: 2 columns made nullable + 2 columns added
- `AuditAction`: 3 enum values added

Migration file name: `20260224000000_epic04_evaluation_workflow`
