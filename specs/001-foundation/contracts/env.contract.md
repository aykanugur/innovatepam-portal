# Contract: Environment Variables

**Feature**: Foundation & Infrastructure (`001-foundation`)  
**Spec reference**: FR-010, FR-011  
**File**: `.env.example` (version-controlled; no real secrets)

---

## Definition

This contract defines every environment variable required by the InnovateEPAM Portal. All 13 variables are established on Day 1 (FR-010). No variable may be added to the codebase without also being added to this contract and to `.env.example`.

### Rules

1. **No secret values committed** — `.env.example` contains only placeholder strings or descriptions.
2. **`.env.local` gitignored** — local secrets never enter version control (FR-011).
3. **All 13 variables required** — the application must start without errors when all are provided (SC-001); if a required variable is absent, it must fail with a clear error naming the missing variable.
4. **Feature flags default to `false`** — features are disabled by default; opt-in per environment.

---

## Variable Reference

### Database

| Variable | Required | Example Value | Description |
|---|---|---|---|
| `DATABASE_URL` | ✅ Yes | `postgresql://user:pass@pooler.neon.tech/dbname?sslmode=require` | Neon **pooled** (PgBouncer transaction mode) connection string. Used by `PrismaClient` at runtime. |
| `DIRECT_URL` | ✅ Yes | `postgresql://user:pass@ep-xxx.neon.tech/dbname?sslmode=require` | Neon **direct** connection string. Used by `prisma migrate` CLI only (bypasses PgBouncer, supports prepared statements). |

### Authentication

| Variable | Required | Example Value | Description |
|---|---|---|---|
| `AUTH_SECRET` | ✅ Yes | `your-32+-character-random-secret` | 32+ character secret used to sign NextAuth.js v5 session tokens and JWTs. Generate with: `openssl rand -base64 32`. |
| `NEXTAUTH_URL` | ✅ Yes | `http://localhost:3000` | Canonical application URL. Used by NextAuth.js for callback URL construction. Set to production URL on Vercel. |

### Email

| Variable | Conditional | Example Value | Description |
|---|---|---|---|
| `RESEND_API_KEY` | ⚠️ Required when `FEATURE_EMAIL_VERIFICATION_ENABLED=true` | `re_your_api_key` | Resend transactional email API key. Safe to leave blank when email verification is disabled. |

### Rate Limiting

| Variable | Optional | Example Value | Description |
|---|---|---|---|
| `UPSTASH_REDIS_REST_URL` | ⚠️ Optional | `https://your-instance.upstash.io` | Upstash Redis REST URL for distributed rate limiting. Falls back to in-memory rate limiter if absent (single-instance only). |
| `UPSTASH_REDIS_REST_TOKEN` | ⚠️ Optional | `your-upstash-token` | Upstash Redis REST token. Falls back to in-memory if absent. |

### Seeding

| Variable | Required | Example Value | Description |
|---|---|---|---|
| `SUPERADMIN_EMAIL` | ✅ Yes | `admin@epam.com` | Email address to auto-promote to `SUPERADMIN` role on first database seed. Used by `prisma/seed.ts`. |

### Feature Flags

All five feature flags are `string` typed (`"true"` / `"false"`). Default: `"false"`.

| Variable | Default | Description |
|---|---|---|
| `PORTAL_ENABLED` | `"true"` | Global kill switch. When `"false"`, all routes return a maintenance response. No page (authenticated or public) is accessible. |
| `FEATURE_EMAIL_VERIFICATION_ENABLED` | `"false"` | Enables email verification flow after user registration. Requires `RESEND_API_KEY`. |
| `FEATURE_USER_MANAGEMENT_ENABLED` | `"false"` | Enables the admin user management interface (list, deactivate, promote users). |
| `FEATURE_FILE_ATTACHMENT_ENABLED` | `"false"` | Enables file attachment upload on idea submission form. |
| `FEATURE_ANALYTICS_ENABLED` | `"false"` | Enables the analytics dashboard for admins. |

---

## `.env.example` Format

```env
# ── Database ──────────────────────────────────────────────────────────────────
# Neon pooled connection string (PgBouncer) — used at runtime
DATABASE_URL="postgresql://USER:PASSWORD@pooler.REGION.neon.tech/DBNAME?sslmode=require"
# Neon direct connection string — used by Prisma CLI for migrations
DIRECT_URL="postgresql://USER:PASSWORD@EP-ID.REGION.neon.tech/DBNAME?sslmode=require"

# ── Auth ──────────────────────────────────────────────────────────────────────
# 32+ char secret: openssl rand -base64 32
AUTH_SECRET=""
# Canonical app URL (http://localhost:3000 in dev, https://your-app.vercel.app in prod)
NEXTAUTH_URL="http://localhost:3000"

# ── Email (Resend) ────────────────────────────────────────────────────────────
# Required only when FEATURE_EMAIL_VERIFICATION_ENABLED=true
RESEND_API_KEY=""

# ── Rate Limiting (Upstash Redis) ─────────────────────────────────────────────
# Falls back to in-memory rate limiter if left blank (single-instance only)
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""

# ── Seeding ───────────────────────────────────────────────────────────────────
# Email to auto-promote to SUPERADMIN on first seed
SUPERADMIN_EMAIL=""

# ── Feature Flags ─────────────────────────────────────────────────────────────
PORTAL_ENABLED="true"
FEATURE_EMAIL_VERIFICATION_ENABLED="false"
FEATURE_USER_MANAGEMENT_ENABLED="false"
FEATURE_FILE_ATTACHMENT_ENABLED="false"
FEATURE_ANALYTICS_ENABLED="false"
```

---

## Validation

Runtime env var validation MUST be implemented in `lib/env.ts` using Zod:

```ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  RESEND_API_KEY: z.string().optional(),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  SUPERADMIN_EMAIL: z.string().email(),
  PORTAL_ENABLED: z.string().default('true'),
  FEATURE_EMAIL_VERIFICATION_ENABLED: z.string().default('false'),
  FEATURE_USER_MANAGEMENT_ENABLED: z.string().default('false'),
  FEATURE_FILE_ATTACHMENT_ENABLED: z.string().default('false'),
  FEATURE_ANALYTICS_ENABLED: z.string().default('false'),
})

export const env = envSchema.parse(process.env)
```

If any required variable is missing, Zod throws a `ZodError` with the variable name — satisfying the edge case requirement (fail with clear error, not a generic crash).
