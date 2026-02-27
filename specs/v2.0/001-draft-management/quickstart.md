# Quickstart: Draft Management

**Branch**: `001-draft-management`  
**Spec**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md) | **Research**: [research.md](./research.md)

This guide is the single checklist a developer follows to get from a clean `001-draft-management` checkout to a running local environment with the draft feature working end-to-end.

---

## Prerequisites

- Node 20+, pnpm
- Neon account with access to the `innovatepam-portal` project dashboard
- Vercel CLI (optional — only needed for cron local testing)
- Working `.env.local` with `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` already set

---

## Step 1 — Check out the branch

```bash
git checkout 001-draft-management
cd innovatepam-portal
pnpm install
```

---

## Step 2 — Generate `CRON_SECRET`

```bash
openssl rand -base64 32
```

Copy the output. Add to `.env.local`:

```shell
CRON_SECRET="<paste output here>"
```

Minimum 32 characters. Zod will throw at startup if missing or too short.

---

## Step 3 — Enable the feature flag

Add to `.env.local`:

```shell
FEATURE_DRAFT_ENABLED="true"
```

When set to `"false"` (or absent), the Drafts tab is still visible (read-only) but creation and editing are blocked.

---

## Step 4 — Apply the database migration (Neon dashboard)

**Do not use `prisma migrate dev`** — CLI is blocked by Rust TLS / OpenSSL 3.6.1 incompatibility on this machine.

1. Open [Neon dashboard](https://console.neon.tech) → select the `innovatepam-portal` project
2. Click **SQL Editor**
3. Copy the full SQL block from [data-model.md §2](./data-model.md#2-migration-sql)
4. Paste into the editor and click **Run**
5. Verify with the query at the bottom of that block:

```sql
SELECT column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_name = 'Idea'
  AND column_name IN ('title','description','category','draftExpiresAt','isExpiredDraft','softDeletedAt');

SELECT enum_range(NULL::"IdeaStatus");
SELECT enum_range(NULL::"AuditAction");
```

Expected: `IdeaStatus` includes `DRAFT`; `AuditAction` includes `DRAFT_SAVED`, `DRAFT_DELETED`, `DRAFT_SUBMITTED`; all three new columns present.

---

## Step 5 — Regenerate Prisma client

```bash
npx prisma generate
```

This picks up the new enum values and nullable field types. TypeScript will now surface all callsites that need null-handling for `title`, `description`, `category`.

---

## Step 6 — Install shadcn/ui Tabs

The `Tabs` component is **not yet installed**. Run from inside `innovatepam-portal/`:

```bash
npx shadcn@latest add tabs
```

Verify:

```bash
ls components/ui/ | grep tab
# should output: tabs.tsx
```

---

## Step 7 — Check TypeScript errors

```bash
npx tsc --noEmit
```

Expected errors: nullable field accesses on `idea.title`, `idea.description`, `idea.category` in existing components. Fix each by adding `?? 'Untitled Draft'` (or similar) fallback. See [data-model.md §7](./data-model.md#7-callsite-audit--string--null-impact) for the known callsite list.

---

## Step 8 — Start the dev server

```bash
pnpm dev
```

---

## Step 9 — Manual smoke tests

### 9a — Create a draft

1. Log in as any user
2. Navigate to `/ideas/new` (or equivalent)
3. Fill in partial fields (e.g. title only)
4. Click "Save Draft"
5. Expected: redirect or toast confirming save; `/my-ideas` now shows a "Drafts" tab with the new entry

### 9b — Resume a draft

1. From the Drafts tab, click "Resume"
2. Expected: navigate to `/ideas/{draftId}/edit` with form pre-populated
3. Auto-save: make a change, wait for "Saving…" indicator, refresh — form should offer inline restore banner

### 9c — Submit a draft

1. From the edit page, fill all required fields and click "Submit"
2. Expected: `IdeaStatus` changes to `SUBMITTED`; idea moves from Drafts tab to ideas list; localStorage key cleared

### 9d — Delete a draft

1. From the Drafts tab, click "Delete" on any draft
2. Expected: confirm modal appears with exact text "Delete Draft?" / "This action cannot be undone."
3. Confirm → draft removed from list; localStorage key cleared

### 9e — Draft limit

1. Create 10 drafts (script or manual)
2. Attempt to create an 11th
3. Expected: error message "You have reached the maximum of 10 active drafts. Please delete a draft before creating a new one."

### 9f — Feature flag off

1. Set `FEATURE_DRAFT_ENABLED="false"` in `.env.local`, restart
2. Expected: Drafts tab still visible (read-only); "Save Draft" button disabled or absent; "Resume" button disabled

---

## Step 10 — Test the cron endpoint locally

```bash
# With server running on port 3000:
curl -X GET http://localhost:3000/api/cron/expire-drafts \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2 | tr -d '"')"
```

Expected 200 response:

```json
{ "softDeleted": 0, "hardDeleted": 0, "durationMs": <N> }
```

Test 401:

```bash
curl -X GET http://localhost:3000/api/cron/expire-drafts \
  -H "Authorization: Bearer wrongtoken"
# Expected: { "error": "Unauthorized" } with 401
```

---

## Step 11 — Run unit and integration tests

```bash
pnpm test:unit    # vitest — state machine, Zod schemas, rate-limiter
pnpm test:e2e     # playwright — Drafts tab, save/resume/delete/submit flows
```

---

## Environment Variable Reference

| Variable                | Required             | Example                          | Notes                                                        |
| ----------------------- | -------------------- | -------------------------------- | ------------------------------------------------------------ |
| `CRON_SECRET`           | Yes                  | `openssl rand -base64 32` output | Min 32 chars; add to Vercel env settings for staging/prod    |
| `FEATURE_DRAFT_ENABLED` | No (default `false`) | `"true"`                         | Set to `"true"` in dev; gate controls creation, not deletion |
| `DATABASE_URL`          | Yes                  | Neon connection string           | Already set                                                  |
| `AUTH_SECRET`           | Yes                  | —                                | Already set                                                  |

---

## Deployment Checklist

Before merging to `master`:

- [ ] `CRON_SECRET` added to Vercel project settings (Production + Preview)
- [ ] `FEATURE_DRAFT_ENABLED` added to Vercel (set `"false"` for initial dark launch if desired)
- [ ] Migration SQL applied to Production Neon database
- [ ] `npx prisma generate` committed (updated `lib/generated/` if applicable)
- [ ] `vercel.json` cron entry committed
- [ ] `tsc --noEmit` passes with zero errors
- [ ] All Playwright tests pass in CI

---

## Next Step

Run `/speckit.tasks` to generate the implementation task list.
