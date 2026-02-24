# Server Action Contracts: Evaluation Workflow

**Feature**: `003-evaluation-qa` | **Date**: 2026-02-24

All evaluation mutations are implemented as Next.js Server Actions (not Route Handlers). This document defines each Server Action's signature, inputs, success response, and all error cases.

---

## startReviewAction

**File**: `lib/actions/start-review.ts`  
**Description**: Transitions a `SUBMITTED` idea to `UNDER_REVIEW`, creates a stub `IdeaReview` row, writes an `IDEA_REVIEW_STARTED` audit entry. All three writes are wrapped in a single `prisma.$transaction`.

### Input

```typescript
export async function startReviewAction(ideaId: string): Promise<StartReviewResult>

type StartReviewResult = { success: true; ideaId: string } | { error: StartReviewError }

type StartReviewError =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE' // caller is not ADMIN or SUPERADMIN
  | 'IDEA_NOT_FOUND'
  | 'SELF_REVIEW_FORBIDDEN' // "You cannot review your own idea."
  | 'ALREADY_UNDER_REVIEW' // "This idea is already under review by another admin."
  | 'INVALID_STATE' // idea is not in SUBMITTED status
  | 'SERVER_ERROR'
```

### Success path

1. `auth()` → verify session; extract `userId`, `role`
2. Role check: must be `ADMIN` or `SUPERADMIN`
3. Fetch idea; verify existence; verify `idea.status === 'SUBMITTED'`
4. Self-review check: `idea.authorId !== userId`
5. `prisma.$transaction`:
   a. `ideaReview.findUnique({ where: { ideaId } })` → if exists throw `ALREADY_UNDER_REVIEW`
   b. `ideaReview.create({ data: { ideaId, reviewerId: userId, startedAt: new Date() } })`
   c. `idea.update({ data: { status: 'UNDER_REVIEW' } })`
   d. `auditLog.create({ action: 'IDEA_REVIEW_STARTED', ... })`
6. `revalidatePath('/admin')`; `revalidatePath('/ideas/${ideaId}')`
7. Return `{ success: true, ideaId }`

### Error responses

| Error                   | HTTP-equivalent | User-facing message                                   |
| ----------------------- | --------------- | ----------------------------------------------------- |
| `UNAUTHENTICATED`       | 401             | — (redirect to /login via proxy)                      |
| `FORBIDDEN_ROLE`        | 403             | "You don't have permission to perform this action."   |
| `IDEA_NOT_FOUND`        | 404             | "Idea not found."                                     |
| `SELF_REVIEW_FORBIDDEN` | 422             | "You cannot review your own idea."                    |
| `ALREADY_UNDER_REVIEW`  | 409             | "This idea is already under review by another admin." |
| `INVALID_STATE`         | 422             | "This idea cannot be reviewed in its current state."  |
| `SERVER_ERROR`          | 500             | "Something went wrong. Please try again."             |

---

## finalizeReviewAction

**File**: `lib/actions/finalize-review.ts`  
**Description**: Records the admin's decision (ACCEPT or REJECT) on an in-progress review. Updates the existing `IdeaReview` row in-place, updates `Idea.status`, and writes an `IDEA_REVIEWED` audit entry. All updates in a single `prisma.$transaction`.

### Input

```typescript
export async function finalizeReviewAction(
  ideaId: string,
  decision: 'ACCEPTED' | 'REJECTED',
  comment: string
): Promise<FinalizeReviewResult>

type FinalizeReviewResult =
  | { success: true; ideaId: string; decision: 'ACCEPTED' | 'REJECTED' }
  | { error: FinalizeReviewError }

type FinalizeReviewError =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE'
  | 'IDEA_NOT_FOUND'
  | 'SELF_REVIEW_FORBIDDEN'
  | 'REVIEW_NOT_FOUND' // no IdeaReview row exists (should not happen in normal flow)
  | 'ALREADY_REVIEWED' // idea is already ACCEPTED or REJECTED — "This idea has already been reviewed."
  | 'INVALID_STATE' // idea is not UNDER_REVIEW
  | 'COMMENT_REQUIRED' // comment missing or < 10 chars — "A comment is required (minimum 10 characters)."
  | 'SERVER_ERROR'
```

### Input validation (Zod — `lib/validations/review.ts`)

```typescript
export const FinalizeReviewSchema = z.object({
  ideaId: z.string().cuid(),
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  comment: z.string().trim().min(10, 'A comment is required (minimum 10 characters).'),
})
```

### Success path

1. `auth()` → verify session; extract `userId`, `role`
2. Role check: must be `ADMIN` or `SUPERADMIN`
3. `FinalizeReviewSchema.safeParse(...)` — returns `COMMENT_REQUIRED` on failure
4. Fetch idea + `review` relation; verify existence and state
5. Self-review check: `idea.authorId !== userId`
6. `prisma.$transaction`:
   a. `ideaReview.update({ where: { ideaId }, data: { decision, comment: trimmed, decidedAt: new Date() } })`
   b. `idea.update({ data: { status: decision } })` — `'ACCEPTED'` or `'REJECTED'`
   c. `auditLog.create({ action: 'IDEA_REVIEWED', metadata: { ..., commentSummary: comment.slice(0, 100) } })`
7. `revalidatePath('/admin')`; `revalidatePath('/ideas/${ideaId}')`
8. Return `{ success: true, ideaId, decision }`

### Error responses

| Error                   | User-facing message                              |
| ----------------------- | ------------------------------------------------ |
| `COMMENT_REQUIRED`      | "A comment is required (minimum 10 characters)." |
| `ALREADY_REVIEWED`      | "This idea has already been reviewed."           |
| `SELF_REVIEW_FORBIDDEN` | "You cannot review your own idea."               |
| `INVALID_STATE`         | "This idea is not currently under review."       |

---

## abandonReviewAction

**File**: `lib/actions/abandon-review.ts`  
**Description**: SUPERADMIN-only. Resets an `UNDER_REVIEW` idea back to `SUBMITTED`, deletes the in-progress `IdeaReview` row, and writes an `IDEA_REVIEW_ABANDONED` audit entry. All in a single `prisma.$transaction`.

### Input

```typescript
export async function abandonReviewAction(ideaId: string): Promise<AbandonReviewResult>

type AbandonReviewResult = { success: true; ideaId: string } | { error: AbandonReviewError }

type AbandonReviewError =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN_ROLE' // only SUPERADMIN may call this
  | 'IDEA_NOT_FOUND'
  | 'INVALID_STATE' // idea is not UNDER_REVIEW
  | 'REVIEW_NOT_FOUND' // no IdeaReview row — data inconsistency; log and return error
  | 'SERVER_ERROR'
```

### Success path

1. `auth()` → verify session
2. Role check: must be `SUPERADMIN` (not just ADMIN)
3. Fetch idea + `review` relation; verify `idea.status === 'UNDER_REVIEW'`
4. `prisma.$transaction`:
   a. `ideaReview.delete({ where: { ideaId } })` — removes in-progress stub
   b. `idea.update({ data: { status: 'SUBMITTED' } })`
   c. `auditLog.create({ action: 'IDEA_REVIEW_ABANDONED', metadata: { ideaId, originalReviewerId: review.reviewerId, abandonedByAdminId: userId } })`
5. `revalidatePath('/admin')`; `revalidatePath('/ideas/${ideaId}')`
6. Return `{ success: true, ideaId }`

---

## updateDisplayNameAction

**File**: `lib/actions/update-display-name.ts`  
**Description**: Updates the authenticated user's `displayName`. Validates min 1, max 50, non-empty after trim.

### Input

```typescript
export async function updateDisplayNameAction(displayName: string): Promise<UpdateDisplayNameResult>

type UpdateDisplayNameResult =
  | { success: true }
  | { error: 'UNAUTHENTICATED' | 'VALIDATION_ERROR' | 'SERVER_ERROR'; message?: string }
```

### Validation (Zod)

```typescript
export const DisplayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty.')
    .max(50, 'Display name must be 50 characters or fewer.'),
})
```

---

## updatePasswordAction

**File**: `lib/actions/update-password.ts`  
**Description**: Changes the authenticated user's password after verifying the current password. New password must meet complexity requirements (min 8, 1 uppercase, 1 number).

### Input

```typescript
export async function updatePasswordAction(input: {
  currentPassword: string
  newPassword: string
}): Promise<UpdatePasswordResult>

type UpdatePasswordResult =
  | { success: true }
  | {
      error: 'UNAUTHENTICATED' | 'WRONG_CURRENT_PASSWORD' | 'VALIDATION_ERROR' | 'SERVER_ERROR'
      message?: string
    }
```

### Validation (Zod)

```typescript
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
})
```

### Success path

1. `auth()` → `userId`
2. Validate with `ChangePasswordSchema`
3. Fetch user from DB (re-read `passwordHash`)
4. `comparePassword(currentPassword, user.passwordHash)` → if false return `WRONG_CURRENT_PASSWORD` ("Current password is incorrect.")
5. `hashPassword(newPassword)` (bcrypt cost 12)
6. `db.user.update({ where: { id: userId }, data: { passwordHash: hashed } })`

---

## Shared Validation File

**File**: `lib/validations/review.ts`

```typescript
import { z } from 'zod'

export const FinalizeReviewSchema = z.object({
  ideaId: z.string().cuid(),
  decision: z.enum(['ACCEPTED', 'REJECTED']),
  comment: z.string().trim().min(10, 'A comment is required (minimum 10 characters).'),
})

export type FinalizeReviewInput = z.infer<typeof FinalizeReviewSchema>
```

**File**: `lib/validations/user.ts` (new — extends existing pattern)

```typescript
import { z } from 'zod'

export const DisplayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name cannot be empty.')
    .max(50, 'Display name must be 50 characters or fewer.'),
})

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one number.'),
})
```
