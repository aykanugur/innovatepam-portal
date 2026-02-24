# Environment Contract: Authentication & Role Management

**Feature**: 001-auth-rbac  
**Inherits**: All variables from 001-foundation (13 existing vars in `.env.example`)

---

## New Variables (this feature)

| Variable                             | Required                                       | Default | Description                                                                                 |
| ------------------------------------ | ---------------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                        | **Yes**                                        | —       | Auth.js v5 session signing secret. Min 32 chars. Generate with `npx auth secret`.           |
| `NEXTAUTH_URL`                       | **Yes**                                        | —       | Canonical app URL. Used in verification email links. E.g. `http://localhost:3000`           |
| `RESEND_API_KEY`                     | When `FEATURE_EMAIL_VERIFICATION_ENABLED=true` | —       | Resend API key. Format: `re_xxxxxxxx`. Get from resend.com/api-keys                         |
| `UPSTASH_REDIS_REST_URL`             | No                                             | —       | Upstash Redis REST endpoint. When absent, in-memory rate limiter is used.                   |
| `UPSTASH_REDIS_REST_TOKEN`           | No (required when URL set)                     | —       | Upstash Redis auth token.                                                                   |
| `SUPERADMIN_EMAIL`                   | Required for seed                              | —       | Email of the superadmin account created by `prisma db seed`. Must be `@epam.com`.           |
| `FEATURE_EMAIL_VERIFICATION_ENABLED` | No                                             | `true`  | Set to `false` in local dev to skip email sending; users are auto-verified on registration. |
| `FEATURE_USER_MANAGEMENT_ENABLED`    | No                                             | `false` | Set to `true` to expose admin user management UI and `/api/admin/users` endpoints.          |

---

## Updated `.env.example` Block

```bash
# ─── Auth.js v5 ────────────────────────────────────────────────────────────────
# Generate with: npx auth secret
AUTH_SECRET="your-32-char-min-secret-here"

# Canonical app URL (used in email verification links)
NEXTAUTH_URL="http://localhost:3000"

# ─── Email (Resend) ────────────────────────────────────────────────────────────
# Required when FEATURE_EMAIL_VERIFICATION_ENABLED=true
RESEND_API_KEY="re_your_api_key_here"

# ─── Rate Limiting (Upstash Redis) ─────────────────────────────────────────────
# Optional: omit for in-memory fallback (local dev / alpha)
UPSTASH_REDIS_REST_URL="https://your-redis.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_upstash_token"

# ─── Seed ──────────────────────────────────────────────────────────────────────
# Email of the superadmin account created by: npm run db:seed
SUPERADMIN_EMAIL="admin@epam.com"

# ─── Feature Flags ─────────────────────────────────────────────────────────────
# Set to false in local dev to skip email sending (users auto-verified)
FEATURE_EMAIL_VERIFICATION_ENABLED=true

# Set to true to enable admin user management UI
FEATURE_USER_MANAGEMENT_ENABLED=false
```

---

## Validation Rules

- `AUTH_SECRET`: Required at startup. App will throw if missing. Min 32 characters.
- `NEXTAUTH_URL`: Required. Must be a valid URL. Used to construct verification email links.
- `RESEND_API_KEY`: Checked at runtime when `sendVerificationEmail` is called. Throws if missing and verification enabled.
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`: Must both be set or both absent. Mixed state falls back to in-memory.
- `SUPERADMIN_EMAIL`: Only read during `prisma db seed`. Must end with `@epam.com`.

---

## Variables NOT Needed for This Feature

These were evaluated and confirmed unnecessary:

| Variable                      | Reason excluded                                             |
| ----------------------------- | ----------------------------------------------------------- |
| `FEATURE_PORTAL_ENABLED`      | Already exists from 001-foundation; no change needed        |
| `DATABASE_URL` / `DIRECT_URL` | Already exists from 001-foundation                          |
| OAuth client IDs/secrets      | OAuth is explicitly out of scope (spec Assumptions section) |
