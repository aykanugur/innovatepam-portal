# Contract: `GET /api/cron/expire-drafts`

**File**: `app/api/cron/expire-drafts/route.ts`  
**Trigger**: Vercel Cron (`vercel.json`) — daily at 02:00 UTC  
**Type**: Next.js Route Handler (`GET`)  
**Spec refs**: FR-009, FR-010, FR-017

---

## 1. Route

```
GET /api/cron/expire-drafts
```

---

## 2. Request

### Headers

| Header          | Required | Value                  |
| --------------- | -------- | ---------------------- |
| `Authorization` | Yes      | `Bearer {CRON_SECRET}` |

No query parameters. No request body.

### Vercel Cron Invocation (`vercel.json`)

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

> Vercel automatically sends `Authorization: Bearer {CRON_SECRET}` when `CRON_SECRET` is set in the project environment.

---

## 3. Authentication

```typescript
const authHeader = request.headers.get('Authorization')
const token = authHeader?.replace('Bearer ', '')

if (token !== env.CRON_SECRET) {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
```

`env.CRON_SECRET` is a validated `z.string().min(32)` env var. If missing from environment, the Zod schema throws at startup — the endpoint is never reached.

---

## 4. Logic

Executed inside a single `try/catch`. Timer starts before DB operations.

### Step 1 — Soft-delete expired drafts

Identify drafts where the 90-day expiry window has passed and the soft-delete flag has not yet been set:

```sql
UPDATE "Idea"
SET "isExpiredDraft" = true, "softDeletedAt" = NOW()
WHERE "status" = 'DRAFT'
  AND "isExpiredDraft" = false
  AND "draftExpiresAt" < NOW()
```

Prisma equivalent:

```typescript
const softDeleted = await db.idea.updateMany({
  where: {
    status: 'DRAFT',
    isExpiredDraft: false,
    draftExpiresAt: { lt: new Date() },
  },
  data: {
    isExpiredDraft: true,
    softDeletedAt: new Date(),
  },
})
```

`softDeletedCount = softDeleted.count`

### Step 2 — Hard-delete drafts 30 days after soft-delete

Identify drafts that were soft-deleted more than 30 days ago:

```typescript
const thirtyDaysAgo = subDays(new Date(), 30)

const hardDeleted = await db.idea.deleteMany({
  where: {
    status: 'DRAFT',
    isExpiredDraft: true,
    softDeletedAt: { lt: thirtyDaysAgo },
  },
})
```

`hardDeletedCount = hardDeleted.count`

> Attachments: no file cleanup (deferred per clarification Q2 — "test website").

### Step 3 — Emit structured log

```typescript
console.log(
  JSON.stringify({
    event: 'cron.expire-drafts',
    softDeleted: softDeletedCount,
    hardDeleted: hardDeletedCount,
    durationMs: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  })
)
```

This log is emitted on **every** cron run, including runs where both counts are 0 (FR-017).

---

## 5. Responses

### 200 — Success

```json
{
  "softDeleted": 3,
  "hardDeleted": 1,
  "durationMs": 142
}
```

### 401 — Unauthorized

```json
{ "error": "Unauthorized" }
```

Returned when `Authorization` header is missing, malformed, or token does not match `CRON_SECRET`.

### 500 — Internal Error

```json
{ "error": "Internal server error" }
```

Returned if either `updateMany` or `deleteMany` throws. The caught error is logged to `console.error` with the full stack, but the error message is NOT included in the 500 response body.

---

## 6. Full Handler Skeleton

```typescript
import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  // Auth
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (token !== env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()

  try {
    // Step 1: Soft-delete
    const softDeleted = await db.idea.updateMany({
      where: {
        status: 'DRAFT',
        isExpiredDraft: false,
        draftExpiresAt: { lt: new Date() },
      },
      data: {
        isExpiredDraft: true,
        softDeletedAt: new Date(),
      },
    })

    // Step 2: Hard-delete
    const hardDeleted = await db.idea.deleteMany({
      where: {
        status: 'DRAFT',
        isExpiredDraft: true,
        softDeletedAt: { lt: subDays(new Date(), 30) },
      },
    })

    const durationMs = Date.now() - startTime

    // Step 3: Structured log (always)
    console.log(
      JSON.stringify({
        event: 'cron.expire-drafts',
        softDeleted: softDeleted.count,
        hardDeleted: hardDeleted.count,
        durationMs,
        timestamp: new Date().toISOString(),
      })
    )

    return Response.json({
      softDeleted: softDeleted.count,
      hardDeleted: hardDeleted.count,
      durationMs,
    })
  } catch (error) {
    console.error('[cron/expire-drafts] Fatal error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

## 7. Idempotency

- **Soft-delete**: WHERE clause includes `isExpiredDraft = false` — re-running will not double-count.
- **Hard-delete**: WHERE clause includes `isExpiredDraft = true AND softDeletedAt < 30d ago` — safe to re-run; already deleted rows are simply not found.
- Running the cron twice within the same minute is safe.

---

## 8. Lazy Expiry (complementary pattern in UI)

The cron handles nightly cleanup. The UI also applies lazy expiry on draft read:

```typescript
// In the Drafts tab data-fetch (app/(main)/my-ideas/page.tsx):
const activeDrafts = await db.idea.findMany({
  where: {
    authorId: userId,
    status: 'DRAFT',
    isExpiredDraft: false,
    draftExpiresAt: { gt: new Date() }, // filter out lazily — cron hasn't run yet
  },
  orderBy: { draftExpiresAt: 'asc' }, // soonest to expire first (FR-004)
})
```

Drafts where `draftExpiresAt ≤ now()` but `isExpiredDraft = false` are treated as expired by the UI without requiring a DB write. The nightly cron later materialises the `isExpiredDraft = true` flag.

---

## 9. Environment Requirements

| Variable       | Type              | Where used                  |
| -------------- | ----------------- | --------------------------- |
| `CRON_SECRET`  | `string (min 32)` | Auth check in every request |
| `DATABASE_URL` | `string`          | Prisma `db` client          |

Both must be set in Vercel project settings (Production + Preview environments).
