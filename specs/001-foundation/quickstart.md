# Quickstart: InnovateEPAM Portal

**Feature**: Foundation & Infrastructure (`001-foundation`)  
**Success Criterion**: A developer who has never seen the project can clone, complete setup, and have a running local instance in under 10 minutes (SC-001).

---

## Prerequisites

- Node.js 20.9+ (`node --version`)
- pnpm 9+ (`pnpm --version`) or npm 10+
- Git
- A [Neon](https://neon.tech) PostgreSQL project with two connection strings (pooled + direct)
- A Vercel account (for deploy — optional for local dev)

---

## 1. Clone & Install

```sh
git clone https://github.com/aykanugur/innovatepam-portal.git
cd innovatepam-portal
npm install
```

---

## 2. Configure Environment Variables

```sh
cp .env.example .env.local
```

Open `.env.local` and fill in **all** required values:

```env
# ── Database (Neon) ───────────────────────────────────────────────────────────
DATABASE_URL="postgresql://..."         # Neon pooled connection string (PgBouncer)
DIRECT_URL="postgresql://..."          # Neon direct connection string (for migrations)

# ── Auth (NextAuth v5) ────────────────────────────────────────────────────────
AUTH_SECRET="your-32+-char-secret"     # Generate: openssl rand -base64 32
NEXTAUTH_URL="http://localhost:3000"   # Canonical URL for local dev

# ── Email (Resend) ────────────────────────────────────────────────────────────
RESEND_API_KEY="re_..."               # Required when FEATURE_EMAIL_VERIFICATION_ENABLED=true

# ── Rate Limiting (Upstash Redis) ─────────────────────────────────────────────
UPSTASH_REDIS_REST_URL="https://..."  # Falls back to in-memory if absent
UPSTASH_REDIS_REST_TOKEN="..."        # Falls back to in-memory if absent

# ── Seeding ───────────────────────────────────────────────────────────────────
SUPERADMIN_EMAIL="your.email@epam.com" # Auto-promoted to SUPERADMIN on first seed

# ── Feature Flags ─────────────────────────────────────────────────────────────
PORTAL_ENABLED="true"                  # false = maintenance mode for all routes
FEATURE_EMAIL_VERIFICATION_ENABLED="false"
FEATURE_USER_MANAGEMENT_ENABLED="false"
FEATURE_FILE_ATTACHMENT_ENABLED="false"
FEATURE_ANALYTICS_ENABLED="false"
```

> `.env.local` is gitignored and will never be committed.

---

## 3. Run Database Migration

```sh
npx prisma migrate dev --name init
```

This creates all four tables (`User`, `Idea`, `IdeaReview`, `VerificationToken`) in your Neon database via the direct connection string (`DIRECT_URL`).

Verify in Neon dashboard or with:
```sh
npx prisma studio
```

---

## 4. Generate Prisma Client

```sh
npx prisma generate
```

This generates the Prisma client into `lib/generated/prisma/`. Run this once after cloning and whenever `schema.prisma` changes.

---

## 5. Start Development Server

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the home page with a shadcn/ui Button rendered and styled (US-001, SC-001).

---

## 6. Verify Setup

```sh
# Type check
npm run type-check

# Lint
npm run lint

# Build (zero errors, zero warnings)
npm run build
```

All three must report zero errors. This satisfies FR-001, FR-002, SC-002.

---

## 7. Run Tests

```sh
# Unit tests (Vitest)
npm run test

# Unit tests with coverage (must be ≥80%)
npm run test:coverage

# E2E tests (Playwright — requires dev server running or run:
npm run test:e2e
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `Error: Environment variable not found: DATABASE_URL` | Check `.env.local` exists and `DATABASE_URL` is populated |
| `PrismaClientInitializationError` | Run `npx prisma generate` first |
| `Migration failed: connection timeout` | Confirm `DIRECT_URL` points to the Neon direct (non-pooled) endpoint |
| shadcn components not styled | Confirm `globals.css` has `@import "tailwindcss"` at the top |
| Turbopack build error with `@tailwind` directives | Replace with `@import "tailwindcss"` — do not mix v3 and v4 directives |
| `PORTAL_ENABLED=false` returns maintenance page | Set `PORTAL_ENABLED=true` in `.env.local` |

---

## Deploy to Vercel

1. Import the GitHub repo in [Vercel dashboard](https://vercel.com/new).
2. Set all 13 environment variables under **Project Settings → Environment Variables** (Production + Preview + Development).
3. Deploy. Vercel auto-runs `next build` and deploys to a `.vercel.app` URL.
4. Push any change to `main` → auto-redeploy triggers (FR-013, SC-004).

> For `DIRECT_URL` on Vercel deploy/build: Vercel's build environment runs `npx prisma generate`; migrations are applied separately via `prisma migrate deploy` in a CI step or the Neon dashboard.
