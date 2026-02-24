# Quickstart: Idea Submission & Discovery

**Feature**: `002-idea-submission`  
**Branch**: `002-idea-submission`

---

## Prerequisites

- Node.js 22+
- PostgreSQL (via Neon or local) with `DATABASE_URL` and `DIRECT_URL` set
- `.env.local` with all required variables (see below)
- `npm install` complete

---

## Environment Variables

Add the following to `.env.local` (on top of existing auth/DB vars):

```env
# Feature flags for this epic
FEATURE_FILE_ATTACHMENT_ENABLED="false"     # set "true" to enable file attachments

# Blob storage — required ONLY when FEATURE_FILE_ATTACHMENT_ENABLED=true
BLOB_READ_WRITE_TOKEN=""                    # From vercel.com → Storage → Blob → Token

# Upstash Redis — required for distributed rate limiting
# Falls back to in-memory (single-instance) if left blank
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
```

To provision a Vercel Blob store: `vercel storage add blob` (requires Vercel CLI + project linked).

---

## Database Setup

After pulling this branch, run the migration:

```bash
npm run db:generate    # regenerate Prisma client after schema changes
npm run db:migrate     # applies add-idea-audit-log migration
```

This creates the `AuditLog` table and `AuditAction` enum in your Postgres database.

To populate seed data (including example ideas):

```bash
npm run db:seed
```

---

## Install New Dependency

Vercel Blob is required when `FEATURE_FILE_ATTACHMENT_ENABLED=true`:

```bash
npm install @vercel/blob
```

---

## Run the App

```bash
npm run dev
```

Navigate to:

| Page        | URL                                |
| ----------- | ---------------------------------- |
| Submit Idea | `http://localhost:3000/ideas/new`  |
| Idea List   | `http://localhost:3000/ideas`      |
| Idea Detail | `http://localhost:3000/ideas/<id>` |
| My Ideas    | `http://localhost:3000/my-ideas`   |

---

## Testing

```bash
# Unit tests (Vitest)
npm run test:unit

# All tests with coverage
npm run test:coverage

# E2E tests (Playwright) — requires running dev server
npm run test:e2e
```

---

## Key Files for This Feature

| File                             | Purpose                                    |
| -------------------------------- | ------------------------------------------ |
| `app/(main)/ideas/page.tsx`      | US-009 Idea list page                      |
| `app/(main)/ideas/new/page.tsx`  | US-008 Submit idea form                    |
| `app/(main)/ideas/[id]/page.tsx` | US-010 Idea detail page                    |
| `app/(main)/my-ideas/page.tsx`   | US-011 My ideas page                       |
| `app/api/ideas/route.ts`         | GET (list) + POST (create) handlers        |
| `app/api/ideas/[id]/route.ts`    | GET (detail) + DELETE handlers             |
| `app/api/ideas/mine/route.ts`    | GET my ideas handler                       |
| `lib/validations/idea.ts`        | Zod schemas for idea inputs                |
| `lib/actions/create-idea.ts`     | Server action for idea creation            |
| `lib/actions/delete-idea.ts`     | Server action for idea deletion            |
| `lib/rate-limit.ts`              | Rate limiter (add `ideaSubmitRateLimiter`) |
| `components/ideas/`              | All idea UI components                     |
| `constants/categories.ts`        | Category slugs ↔ labels mapping            |
| `prisma/schema.prisma`           | AuditLog model + AuditAction enum          |

---

## Feature Flag Behaviour

| Flag state                                        | Effect                                                         |
| ------------------------------------------------- | -------------------------------------------------------------- |
| `FEATURE_FILE_ATTACHMENT_ENABLED=false` (default) | Attachment field hidden on form; `attachmentUrl` always `null` |
| `FEATURE_FILE_ATTACHMENT_ENABLED=true`            | Attachment field shown; Vercel Blob upload triggered on submit |

Toggle the flag in `.env.local` and restart the dev server to switch.
