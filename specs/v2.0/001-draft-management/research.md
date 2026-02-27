# Research: Draft Management

**Phase**: 0 — Outline & Research  
**Branch**: `001-draft-management`  
**Date**: 2026-02-26  
**Status**: COMPLETE — all NEEDS CLARIFICATION resolved

---

## Decision 1: Prisma Enum — Adding DRAFT to `IdeaStatus`

**Decision**: Add `DRAFT` as the first value in the `IdeaStatus` PostgreSQL enum, placed before `SUBMITTED`.

**Rationale**: PostgreSQL `ALTER TYPE ... ADD VALUE` appends to the end by default, but accepts `BEFORE` / `AFTER` position arguments. Placing `DRAFT` before `SUBMITTED` makes logical lifecycle order correct in the schema. Prisma v7 with `prisma-client` generator picks up new enum values on next `prisma generate`.

**Migration SQL**:

```sql
-- Add DRAFT to IdeaStatus enum before SUBMITTED
ALTER TYPE "IdeaStatus" ADD VALUE IF NOT EXISTS 'DRAFT' BEFORE 'SUBMITTED';
```

> ⚠️ This must be applied manually via the Neon dashboard SQL editor — `prisma migrate deploy` is blocked by the Rust TLS / OpenSSL 3.6.1 incompatibility on this machine.

**TypeScript side**: `lib/state-machine/idea-status.ts` defines its own `type IdeaStatus = '...'` (not imported from Prisma). Both the Prisma enum and the state machine type must be updated independently.

**Alternatives considered**:

- Adding `EXPIRED` as a 5th enum value — rejected per spec (Clarifications, Q1). A boolean `isExpiredDraft` column is less disruptive to the existing `switch (status)` statements.
- Separate `DraftIdea` model — rejected. Drafts share the full idea structure; a unified model avoids duplication and simplifies the DRAFT→SUBMITTED transition.

---

## Decision 2: Schema Changes for Optional Draft Fields

**Decision**: Make `title`, `description`, and `category` nullable on the `Idea` model (change `String` → `String?`) to allow empty drafts. `visibility` keeps its default (`PUBLIC`) and is never null. `attachmentPath` is already nullable and unchanged.

**Rationale**: The "Save Draft" requirement (FR-001) explicitly allows saving without required fields. Making the columns nullable is the only correct approach — using empty strings as sentinels would break the existing "title required" constraint logic on the submission path.

**Migration SQL** (appended to same migration as enum change):

```sql
-- Make title, description, category nullable for draft support
ALTER TABLE "Idea" ALTER COLUMN "title" DROP NOT NULL;
ALTER TABLE "Idea" ALTER COLUMN "description" DROP NOT NULL;
ALTER TABLE "Idea" ALTER COLUMN "category" DROP NOT NULL;

-- Add draft lifecycle columns
ALTER TABLE "Idea" ADD COLUMN IF NOT EXISTS "draftExpiresAt" TIMESTAMP(3);
ALTER TABLE "Idea" ADD COLUMN IF NOT EXISTS "isExpiredDraft" BOOLEAN NOT NULL DEFAULT false;

-- Add DRAFT_SAVED to AuditAction enum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DRAFT_SAVED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DRAFT_DELETED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'DRAFT_SUBMITTED';
```

**Existing rows**: All existing ideas have non-null title/description/category — making columns nullable is a safe backward-compatible change. Existing code paths that read `idea.title` will now see `string | null` from TypeScript — all such callsites must be audited.

**Alternatives considered**:

- Default value (`""` empty string) instead of nullable — rejected. Empty string would still pass `String` constraints but would cause confusing display bugs ("Untitled Draft" logic would need to be `!title || title.trim() === ""`). Nullable is cleaner.

---

## Decision 3: State Machine Extension

**Decision**: Extend `lib/state-machine/idea-status.ts` by:

1. Adding `'DRAFT'` to the `IdeaStatus` union type
2. Adding `'SUBMIT'` to the `ReviewAction` union type (author submits their own draft)
3. Adding a new `DRAFT` case in the switch and a role check: only the author can submit their draft, but the state machine doesn't enforce author identity (it enforces roles) — so `SUBMIT` is allowed for ALL roles (any role can submit their own draft) and blocked for terminal states
4. The existing `default: satisfies never` exhaustiveness guard surfaces any missed case at compile time

**New valid transition**:

```
DRAFT + SUBMIT (any role) → SUBMITTED
```

**All other transitions from DRAFT throw `InvalidTransitionError`.**

**Rationale**: The state machine is the canonical gatekeeper (per constitution conventions). Bypassing it for draft submission would create an untested transition path. Adding `SUBMIT` as a new action keeps the pattern clean and allows the existing `transition()` function to be the single source of truth.

**Alternatives considered**:

- Direct Prisma status update without going through state machine — rejected. Bypasses all existing guards and breaks exhaustiveness checking.
- Separate `submitDraft()` function that skips the state machine — rejected. Same reason.

---

## Decision 4: `isExpiredDraft` Boolean vs `EXPIRED` Enum Value

**Decision**: `isExpiredDraft Boolean @default(false)` column on `Idea` model.

**Rationale**: Adding `EXPIRED` to `IdeaStatus` would require updating every `switch (idea.status)` in the codebase (12+ callsites identified via `grep -r "IdeaStatus\|\.status"`) just to add a `case 'EXPIRED': break` no-op, risking missed cases and regressions. The boolean column approach:

- Is invisible to existing status-based code
- Allows efficient queries: `WHERE status = 'DRAFT' AND "isExpiredDraft" = false AND "draftExpiresAt" > NOW()`
- Keeps the status enum representing the submission lifecycle, not the data retention state

**`softDeletedAt` timestamp**: A separate `softDeletedAt DateTime?` column tracks when `isExpiredDraft` was set to true, enabling the 30-day hard-delete window without a separate table scan keyed on a boolean.

**Migration SQL** (included in Decision 2 block above — `isExpiredDraft` and `draftExpiresAt` columns).

---

## Decision 5: `saveDraft` Server Action Pattern

**Decision**: `lib/actions/save-draft.ts` — Server Action (not a Route Handler API) following the exact same pattern as `lib/actions/create-idea.ts`.

**Key behaviors**:

1. Get session via `auth()` — redirect to login if unauthenticated
2. Check `FEATURE_DRAFT_ENABLED` flag — return error action result if false
3. Apply `draftSaveLimiter.limit(userId)` — return `{ error: "rate_limit" }` if exceeded
4. Parse body with `SaveDraftSchema` (Zod — title ≤ 150, description ≤ 5000, lengths only, all fields optional)
5. Check active draft count: `WHERE authorId = userId AND status = 'DRAFT' AND isExpiredDraft = false AND draftExpiresAt > now()` — reject if ≥ 10 AND this is a new draft (no `id` in payload)
6. Upsert: if `id` present → update that draft's fields + reset `draftExpiresAt` to `now() + 90d`; if no `id` → create new DRAFT record
7. Return `{ draftId }` to client — client updates URL to `/ideas/[draftId]/edit` to enable subsequent upserts

**Server Action vs Route Handler**: Server Actions allow direct `revalidatePath('/my-ideas')` calls and integrate cleanly with React form patterns. The upload and cron endpoints use Route Handlers because they're called from outside React/form contexts.

---

## Decision 6: Draft Rate Limiter — `createDraftSaveLimiter()`

**Decision**: Add a new exported factory function `createDraftSaveLimiter()` to `lib/rate-limit.ts`, mirroring the existing `createInMemoryLimiter()` but with `LIMIT = 30` and the same 15-minute window.

**Implementation**:

```typescript
function createDraftSaveLimiter(): RateLimiterLike {
  // Same structure as createInMemoryLimiter()
  // LIMIT = 30, WINDOW_MS = 15 * 60 * 1000
}

export const draftSaveLimiter: RateLimiterLike = process.env.UPSTASH_REDIS_REST_URL
  ? new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(30, '15 m') })
  : createDraftSaveLimiter()
```

**Key**: Uses the same `userId` as the identifier (not IP) to prevent per-user abuse regardless of IP.

---

## Decision 7: `/my-ideas` Tab Layout

**Decision**: Use shadcn/ui `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent`. The `Tabs` component is **NOT yet installed** in `components/ui/` (verified 2026-02-26). Must run `npx shadcn@latest add tabs` in `innovatepam-portal/` before implementing the my-ideas redesign.

**Tab structure**:

```tsx
<Tabs defaultValue="submitted">
  <TabsList>
    <TabsTrigger value="submitted">Submitted</TabsTrigger>
    <TabsTrigger value="drafts">Drafts {draftCount > 0 && <Badge>{draftCount}</Badge>}</TabsTrigger>
  </TabsList>
  <TabsContent value="submitted">{/* existing idea list */}</TabsContent>
  <TabsContent value="drafts">
    <DraftsTab drafts={drafts} />
  </TabsContent>
</Tabs>
```

**Data fetching**: The page remains a Server Component. Both `ideas` (submitted) and `drafts` are fetched in parallel via `Promise.all([db.idea.findMany(...), db.idea.findMany(...)])`.

---

## Decision 8: `/ideas/[id]/edit` Route

**Decision**: New page at `app/(main)/ideas/[id]/edit/page.tsx`.

**Pattern**: Server Component that:

1. Calls `auth()` — redirect if unauthenticated
2. Fetches `db.idea.findUnique({ where: { id, authorId: userId, status: 'DRAFT' } })` — returns `null` if not found or not author
3. If `null` → `notFound()` (renders the existing `app/not-found.tsx`)
4. If expired (`isExpiredDraft = true` or `draftExpiresAt < now()`) → render read-only view with expiry message
5. Otherwise → render `<IdeaForm>` in "draft-edit" mode with all field values pre-filled

**No new authentication middleware needed** — `auth()` server-side check in the page is sufficient.

---

## Decision 9: Vercel Cron Configuration

**Decision**: Add `vercel.json` at `innovatepam-portal/vercel.json` (next to `package.json`) with:

```json
{
  "crons": [
    {
      "path": "/api/cron/expire-drafts",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Runs at 02:00 UTC daily. The route handler validates `Authorization: Bearer {CRON_SECRET}` header (standard Vercel Cron pattern).

**Lazy fallback**: The `saveDraft` Server Action and the edit page eagerly check `draftExpiresAt < now()` on every request — if the cron is late or missing, expiry is still enforced.

---

## Decision 10: localStorage Auto-Save Key & Restore Logic

**Decision**: Key format: `draft_autosave_${userId}_${draftId}`. Stored value:

```json
{
  "timestamp": 1740614400000,
  "title": "...",
  "description": "...",
  "category": "...",
  "visibility": "PUBLIC",
  "dynamicFields": {}
}
```

**Restore logic on resume**:

1. On `useEffect` mount, read localStorage key
2. Compare `parsed.timestamp > new Date(draft.updatedAt).getTime()`
3. If newer → show a persistent inline banner (not a toast — user needs to make a deliberate choice): "We found unsaved local changes from [relative time]. [Restore] [Dismiss]"
4. On Restore: apply localStorage values to form state
5. On Dismiss OR on any successful server save: delete the localStorage key

**Auto-save interval**: `setInterval(saveToLocalStorage, 60_000)` — cleared in `useEffect` cleanup.

---

## Decision 11: `CRON_SECRET` Environment Variable

**Decision**: New required env var `CRON_SECRET` added to `lib/env.ts`:

```typescript
CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters'),
```

This is a _new_ secret not present in the current codebase. Must be:

1. Generated and added to `.env.local` for development (`openssl rand -base64 32`)
2. Added to Vercel environment variables for production
3. Added to `CRON_SECRET` in any CI/test environments that hit the endpoint

---

## Decision 12: `DRAFT_SAVED` Audit Action

**Decision**: Add three new `AuditAction` enum values: `DRAFT_SAVED`, `DRAFT_DELETED`, `DRAFT_SUBMITTED`. These are written by the respective Server Actions. Keeps audit log completeness consistent with the existing IDEA\_\* pattern.

**Not auditing individual auto-saves** — only explicit user-triggered save, delete, and submit actions are logged.

---

## Summary Table

| Item            | Decision                                                                             | Source                         |
| --------------- | ------------------------------------------------------------------------------------ | ------------------------------ |
| Enum extension  | `ALTER TYPE "IdeaStatus" ADD VALUE 'DRAFT' BEFORE 'SUBMITTED'`                       | PostgreSQL docs                |
| Nullable fields | `title`, `description`, `category` become `String?`                                  | Spec FR-001                    |
| Expiry tracking | `isExpiredDraft Boolean`, `draftExpiresAt DateTime?`, `softDeletedAt DateTime?`      | Spec Clarifications Q1         |
| State machine   | Add `'DRAFT'` to union, add `'SUBMIT'` action, `DRAFT + SUBMIT → SUBMITTED`          | Spec FR-015                    |
| Save action     | Server Action `lib/actions/save-draft.ts`                                            | Existing pattern               |
| Rate limiter    | `draftSaveLimiter` in `lib/rate-limit.ts`, 30/15 min                                 | Spec FR-016, Clarifications Q4 |
| Tab layout      | shadcn/ui `Tabs` (already installed)                                                 | Codebase check                 |
| Edit route      | `app/(main)/ideas/[id]/edit/page.tsx`, Server Component + `notFound()`               | Next.js App Router             |
| Cron            | `vercel.json` crons + `app/api/cron/expire-drafts/route.ts`, `Authorization: Bearer` | Vercel Cron docs               |
| localStorage    | `draft_autosave_{userId}_{draftId}`, inline restore banner                           | Spec FR-011                    |
| `CRON_SECRET`   | New env var, min 32 chars, Zod validated                                             | Spec FR-017, new secret        |
| Audit log       | `DRAFT_SAVED`, `DRAFT_DELETED`, `DRAFT_SUBMITTED`                                    | Existing AuditAction pattern   |
