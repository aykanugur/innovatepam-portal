# Contract: `saveDraft` Server Action

**Route/Location**: `lib/actions/save-draft.ts`  
**Type**: Next.js Server Action (`'use server'`)  
**Spec refs**: FR-001, FR-002, FR-003, FR-011, FR-014, FR-016

---

## 1. Signature

```typescript
export async function saveDraft(
  input: SaveDraftInput
): Promise<{ draftId: string } | { error: string; code: DraftErrorCode }>
```

`SaveDraftInput` is defined in `lib/validations/draft.ts` (see data-model.md §4).

---

## 2. Inputs

| Field            | Type                              | Required | Constraints                                                 |
| ---------------- | --------------------------------- | -------- | ----------------------------------------------------------- |
| `id`             | `string (cuid)`                   | No       | If present → update; if absent → create                     |
| `title`          | `string \| null`                  | No       | `max(150)`                                                  |
| `description`    | `string \| null`                  | No       | `max(5000)`                                                 |
| `category`       | `string \| null`                  | No       | Free string (validated by Zod, normalised to null if empty) |
| `visibility`     | `'PUBLIC' \| 'PRIVATE'`           | No       | Defaults to `'PUBLIC'` on create                            |
| `dynamicFields`  | `Record<string, unknown> \| null` | No       | Passed through as JSON                                      |
| `attachmentUrls` | `string[]`                        | No       | Staged upload keys from EPIC-V2-02                          |

---

## 3. Pre-conditions (checked in this order)

1. **Authentication**: `auth()` must return a valid session. If not → `{ error: 'Unauthenticated', code: 'UNAUTHENTICATED' }`.
2. **Feature flag**: `env.FEATURE_DRAFT_ENABLED === 'true'`. If not → `{ error: 'Draft feature is not enabled', code: 'FEATURE_DISABLED' }`.
3. **Rate limit**: `draftSaveLimiter` (30 req / 15 min keyed on `userId`). If exceeded → `{ error: 'Too many save requests, please slow down', code: 'RATE_LIMITED' }`.
4. **Input validation**: Zod `SaveDraftSchema.safeParse(input)`. If invalid → `{ error: firstZodErrorMessage, code: 'VALIDATION_ERROR' }`.
5. **Active draft limit** (create only — skip when `id` is present):  
   Count where `authorId = userId AND status = 'DRAFT' AND isExpiredDraft = false AND draftExpiresAt > now()`.  
   If count ≥ 10 → `{ error: 'You have reached the maximum of 10 active drafts. Please delete a draft before creating a new one.', code: 'DRAFT_LIMIT_EXCEEDED' }`.
6. **Ownership** (update only — when `id` is present):  
   Fetch `Idea` by id. If not found or `authorId !== userId` or `status !== 'DRAFT'` → `{ error: 'Draft not found', code: 'NOT_FOUND' }`.

---

## 4. Core Logic

### Create path (no `id` in input)

```typescript
const draft = await db.idea.create({
  data: {
    title: input.title ?? null,
    description: input.description ?? null,
    category: input.category ?? null,
    visibility: input.visibility ?? 'PUBLIC',
    dynamicFields: input.dynamicFields ?? null,
    status: 'DRAFT',
    authorId: userId,
    draftExpiresAt: addDays(new Date(), 90),
    isExpiredDraft: false,
    softDeletedAt: null,
  },
})
```

Then handle attachments if `attachmentUrls` present — create `IdeaAttachment` records.

Then log:

```typescript
await db.auditLog.create({
  data: { action: 'DRAFT_SAVED', actorId: userId, ideaId: draft.id },
})
```

Return: `{ draftId: draft.id }`

### Update path (`id` present)

```typescript
const draft = await db.idea.update({
  where: { id: input.id },
  data: {
    title: input.title ?? null,
    description: input.description ?? null,
    category: input.category ?? null,
    visibility: input.visibility,
    dynamicFields: input.dynamicFields ?? null,
    draftExpiresAt: addDays(new Date(), 90), // reset 90-day clock on every save
    updatedAt: new Date(), // explicit to avoid Prisma @updatedAt edge cases
  },
})
```

Then log `DRAFT_SAVED`.

Return: `{ draftId: draft.id }`

---

## 5. Error Codes

```typescript
type DraftErrorCode =
  | 'UNAUTHENTICATED'
  | 'FEATURE_DISABLED'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'DRAFT_LIMIT_EXCEEDED'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
```

`INTERNAL_ERROR` is returned (with a generic message) if the Prisma call throws unexpectedly.

---

## 6. Success Response

```typescript
{
  draftId: string
} // cuid of created or updated draft
```

---

## 7. Rate Limit Contract Details

- **Limiter**: `draftSaveLimiter` exported from `lib/rate-limit.ts`
- **Window**: 15 minutes (sliding)
- **Limit**: 30 requests per user per window
- **Key**: `userId` (string)
- **Fallback**: In-memory (`@upstash/ratelimit` not required — same pattern as existing `createInMemoryLimiter()`)
- **On exceed**: Server Action returns `code: 'RATE_LIMITED'`; UI shows a toast (not inline banner)

---

## 8. `deleteDraft` Server Action (same file or `lib/actions/delete-draft.ts`)

```typescript
export async function deleteDraft(
  draftId: string
): Promise<{ success: true } | { error: string; code: DraftErrorCode }>
```

Pre-conditions: authenticated, feature flag (allow deletion even if flag is off — FR-014), ownership + status=DRAFT check.

Logic:

```typescript
await db.idea.delete({ where: { id: draftId } }) // permanent hard-delete
await db.auditLog.create({ data: { action: 'DRAFT_DELETED', actorId: userId, ideaId: draftId } })
// Caller must also clear localStorage key: draft_autosave_{userId}_{draftId}
```

> Attachments: no cleanup (deferred per clarification Q2 — "test website, no cleanup needed").

---

## 9. `submitDraft` Server Action (inline in `lib/actions/submit-draft.ts`)

```typescript
export async function submitDraft(
  draftId: string,
  formData: SubmitIdeaInput // full validation schema — title, description, category all REQUIRED
): Promise<{ ideaId: string } | { error: string; code: DraftErrorCode }>
```

Pre-conditions: authenticated, **feature flag not required** (submission always allowed if draft exists), ownership check, status=DRAFT check, full Zod validation (title required, description required, category required).

Logic:

```typescript
await db.idea.update({
  where: { id: draftId },
  data: {
    title: formData.title,
    description: formData.description,
    category: formData.category,
    visibility: formData.visibility,
    dynamicFields: formData.dynamicFields,
    status: 'SUBMITTED',
    draftExpiresAt: null, // clear expiry on submission
  },
})
await db.auditLog.create({ data: { action: 'DRAFT_SUBMITTED', actorId: userId, ideaId: draftId } })
```

Attachments already linked to `ideaId` — preserved automatically (no additional action).

Return: `{ ideaId: draftId }` (same id, different status)

---

## 10. localStorage Contract

The UI layer (client component) is responsible for localStorage. The Server Action has no knowledge of localStorage.

| Operation          | localStorage key                    | Action                                                   |
| ------------------ | ----------------------------------- | -------------------------------------------------------- |
| Auto-save snapshot | `draft_autosave_{userId}_{draftId}` | Set to JSON of current form state                        |
| Resume draft       | Read key on form mount              | Show inline restore banner if value differs from DB data |
| Delete draft       | After `deleteDraft()` succeeds      | Remove key                                               |
| Submit draft       | After `submitDraft()` succeeds      | Remove key                                               |

The `userId` in the key is the session user's id (not email). The `draftId` is the cuid returned by `saveDraft`.
