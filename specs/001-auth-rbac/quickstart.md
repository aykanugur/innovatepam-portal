# Quickstart: Authentication & Role Management

**Branch**: `001-auth-rbac` | **Feature**: US-004, US-005, US-006, US-007

Get the auth system running locally in under 10 minutes.

---

## Prerequisites

- Node.js 24.x (`node --version`)
- Neon PostgreSQL database (from 001-foundation setup)
- `.env.local` with all 001-foundation vars
- Git branch: `001-auth-rbac` (`git branch --show-current`)

---

## Step 1 — Install New Dependencies

```bash
cd innovatepam-portal
npm install next-auth@beta bcryptjs @types/bcryptjs resend @upstash/ratelimit @upstash/redis
```

---

## Step 2 — Add New Environment Variables

Append these to your `.env.local` (see [contracts/env.contract.md](./contracts/env.contract.md) for full docs):

```bash
# Auth.js v5 secret (generate one-time)
npx auth secret >> .env.local

# Add these manually:
echo 'NEXTAUTH_URL="http://localhost:3000"' >> .env.local
echo 'SUPERADMIN_EMAIL="your.email@epam.com"' >> .env.local
echo 'FEATURE_EMAIL_VERIFICATION_ENABLED=false' >> .env.local   # skip email in local dev
echo 'FEATURE_USER_MANAGEMENT_ENABLED=true' >> .env.local

# Optional — Resend (only needed if FEATURE_EMAIL_VERIFICATION_ENABLED=true)
# echo 'RESEND_API_KEY="re_xxxx"' >> .env.local

# Optional — Upstash Redis (in-memory fallback used if absent)
# echo 'UPSTASH_REDIS_REST_URL="https://…"' >> .env.local
# echo 'UPSTASH_REDIS_REST_TOKEN="…"' >> .env.local
```

---

## Step 3 — Run the Database Migration

Add the new verification token fields to the `User` model and run the migration:

```bash
# 1. Edit prisma/schema.prisma to add verification fields (see data-model.md)
# 2. Run migration
npx prisma migrate dev --name add-verification-token

# Verify the migration applied:
npx prisma studio   # Optional: open browser-based schema viewer
```

Expected output:

```
✔  Generated Prisma Client
The following migration(s) have been applied:
  migrations/20250224_add-verification-token/migration.sql
```

---

## Step 4 — Seed the Superadmin Account

```bash
npm run db:seed
```

Expected output:

```
Superadmin seeded: your.email@epam.com
Temporary password: a3f8c9d2e1b0...  (change immediately)
```

Save the temporary password — you'll need it for first login.

---

## Step 5 — Start the Dev Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## Step 6 — Verify Auth Flows

### Registration (US-004)

1. Go to [http://localhost:3000/register](http://localhost:3000/register)
2. Register with `yourname@epam.com`
3. With `FEATURE_EMAIL_VERIFICATION_ENABLED=false`: account is immediately verified
4. You should be redirected to `/login`

### Login (US-006)

1. Go to [http://localhost:3000/login](http://localhost:3000/login)
2. Log in with the registered credentials
3. Should redirect to `/dashboard`

### Superadmin Login (US-007)

1. Log in with `SUPERADMIN_EMAIL` + the temporary password from Step 4
2. Navigate to [http://localhost:3000/admin/users](http://localhost:3000/admin/users)
3. Should see user list (requires `FEATURE_USER_MANAGEMENT_ENABLED=true`)

### Rate Limiting (FR-018)

1. Attempt login with wrong password 5 times in a row
2. 6th attempt should return "Too many login attempts. Try again in 15 minutes."

---

## Step 7 — Run Tests

```bash
# Unit tests (TDD — write before implementation)
npm run test:unit

# Coverage report
npm run test:coverage

# Type check
npx tsc --noEmit

# Lint
npm run lint
```

All tests should pass with ≥80% coverage before opening a PR.

---

## Common Issues

### `AUTH_SECRET` not set

```
Error: [next-auth][error][NO_SECRET]
```

**Fix**: Run `npx auth secret` and copy the output to `.env.local` as `AUTH_SECRET=…`

### Migration fails: column already exists

```
ERROR: column "verificationToken" of relation "User" already exists
```

**Fix**: The migration was already applied. Check with `npx prisma migrate status`.

### `bcryptjs` not found

```
Module not found: Can't resolve 'bcryptjs'
```

**Fix**: `npm install bcryptjs @types/bcryptjs`

### Resend error: `RESEND_API_KEY` missing

```
Error: API key is required
```

**Fix**: Set `FEATURE_EMAIL_VERIFICATION_ENABLED=false` in `.env.local` for local dev, or add `RESEND_API_KEY`.

---

## Scripts Reference

| Command                 | Description                            |
| ----------------------- | -------------------------------------- |
| `npm run dev`           | Start Next.js dev server               |
| `npm run build`         | Production build (must pass before PR) |
| `npm run lint`          | ESLint (0 warnings policy)             |
| `npm run test:unit`     | Run Vitest unit tests                  |
| `npm run test:coverage` | Coverage report (≥80% required)        |
| `npm run db:migrate`    | `prisma migrate dev`                   |
| `npm run db:seed`       | `prisma db seed` (creates superadmin)  |
| `npx prisma studio`     | Browser-based DB viewer                |
