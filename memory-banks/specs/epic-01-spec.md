# Technical Implementation Specification — EPIC-01: Foundation & Infrastructure

**Stories**: US-001 · US-002 · US-003  
**Epic**: EPIC-01 — Foundation & Infrastructure  
**Branch**: `main` / baseline (these stories are pre-requisites for all feature branches)  
**Status**: In Progress (T001–T011 of 001-auth-rbac have satisfied the scaffold portions; see §7 for delta)  
**Last Updated**: 2026-02-24  
**Author**: AI Agent (speckit.specify)

---

## ⛔ Scope Guard — What This Spec Is NOT

Epic-01 is **infrastructure only**. The following are explicitly out of scope:

| Out of Scope                                              | Lives In                |
| --------------------------------------------------------- | ----------------------- |
| NextAuth.js configuration, JWT sessions, `auth.config.ts` | EPIC-02 / 001-auth-rbac |
| RBAC enforcement (`middleware.ts`, role checks)           | EPIC-02 / 001-auth-rbac |
| Email verification logic (Resend, `lib/email.ts`)         | EPIC-02 / 001-auth-rbac |
| Rate limiting (`lib/rate-limit.ts`, Upstash)              | EPIC-02 / 001-auth-rbac |
| Password hashing (`lib/hash.ts`)                          | EPIC-02 / 001-auth-rbac |
| Any login/register UI or API routes                       | EPIC-02 / 001-auth-rbac |
| Idea CRUD, review workflow                                | EPIC-03                 |

Epic-01 tasks must not import from `next-auth`, `lib/auth.config.ts`, `lib/hash.ts`, `lib/email.ts`, or `lib/rate-limit.ts`.

---

## 1. Stories Overview

### US-001 — Next.js Project Scaffold

**Priority**: P1 · **Estimate**: XS · **Sprint**: Day 1 AM  
**Statement**: Initialize Next.js with TypeScript, Tailwind CSS v4, shadcn/ui, ESLint, and Prettier so all subsequent feature work starts from a consistent, production-ready foundation.

**Acceptance Criteria**:

| AC ID    | Criterion                                                                             |
| -------- | ------------------------------------------------------------------------------------- |
| AC-001-1 | `npm run build` completes with zero TypeScript errors and zero Next.js build warnings |
| AC-001-2 | `npm run lint` reports zero errors and zero warnings                                  |
| AC-001-3 | A shadcn/ui `Button` component renders on `/` with Tailwind styles applied            |
| AC-001-4 | `.prettierrc` is committed; VS Code auto-formats `.ts`/`.tsx` on save                 |

---

### US-002 — Database & Prisma Schema Setup

**Priority**: P1 · **Estimate**: S · **Sprint**: Day 1 AM  
**Statement**: Connect Prisma to a managed PostgreSQL instance and define the initial schema with `User`, `Idea`, and `IdeaReview` models so all feature epics have a stable data layer.

**Acceptance Criteria**:

| AC ID    | Criterion                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| AC-002-1 | `npx prisma migrate dev --name init` completes without errors; `User`, `Idea`, `IdeaReview` tables created |
| AC-002-2 | `npx prisma studio` shows all three tables with correct columns and relationships                          |
| AC-002-3 | `prisma.user.findMany()` returns `[]` without error — confirms connectivity                                |

---

### US-003 — Environment Configuration & Vercel Deployment

**Priority**: P1 · **Estimate**: XS · **Sprint**: Day 1 AM  
**Statement**: Configure all environment variables with a documented `.env.example` and deploy the scaffold to Vercel so the CI/CD pipeline is verified on Day 1.

**Acceptance Criteria**:

| AC ID    | Criterion                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------- |
| AC-003-1 | `npm run dev` starts without errors and `/` returns HTTP 200 when `.env.local` is populated                |
| AC-003-2 | Push to `main` triggers a Vercel deployment that completes without errors; production URL returns HTTP 200 |
| AC-003-3 | `.env.example` lists all required variable names (no values) with a comment describing each                |
| AC-003-4 | `.env.local` is NOT tracked by git (present in `.gitignore`)                                               |

---

## 2. Current Implementation Status

> The 001-auth-rbac branch (T001–T011) has satisfied several EPIC-01 concerns as side effects. This section audits exact status.

### US-001 Status

| Item                       | Status        | Notes                                                                |
| -------------------------- | ------------- | -------------------------------------------------------------------- |
| Next.js 16 app scaffolded  | ✅ DONE       | `app/layout.tsx`, `app/page.tsx` present                             |
| TypeScript strict mode     | ✅ DONE       | `tsconfig.json` with `"strict": true`                                |
| Tailwind CSS v4            | ✅ DONE       | `postcss.config.mjs` present; `globals.css` with Tailwind directives |
| ESLint configured          | ✅ DONE       | `eslint.config.mjs` present                                          |
| **shadcn/ui installed**    | ❌ MISSING    | No `components/ui/` directory; Button not on `/`                     |
| **Prettier `.prettierrc`** | ❌ MISSING    | Not listed in project root                                           |
| **lint-staged / husky**    | ❌ MISSING    | Not in `package.json` devDependencies                                |
| `npm run build` passes     | ⚠️ UNVERIFIED | TypeScript passes; full Next.js build with shadcn pending            |
| `npm run lint` passes      | ⚠️ UNVERIFIED | Needs verification after shadcn/ui install                           |

### US-002 Status

| Item                                                        | Status      | Notes                                                                                                     |
| ----------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------- |
| Prisma v7 installed                                         | ✅ DONE     | `prisma@7.4.1`, `@prisma/adapter-pg`, `@prisma/client`                                                    |
| `prisma.config.ts` with url/directUrl                       | ✅ DONE     | `defineConfig` with `DIRECT_URL ?? DATABASE_URL`                                                          |
| `prisma/schema.prisma` (v7 format)                          | ✅ DONE     | `provider="prisma-client"`, `output="../lib/generated/prisma"`                                            |
| `lib/db.ts` singleton with PrismaPg adapter                 | ✅ DONE     | Edge-safe PrismaClient                                                                                    |
| `User` model + `Role` enum                                  | ✅ DONE     | Traceability comments present                                                                             |
| `VerificationToken` model                                   | ✅ DONE     | EPIC-02 concern; present in schema                                                                        |
| **`Idea` model**                                            | ❌ MISSING  | US-002 requires this                                                                                      |
| **`IdeaReview` model**                                      | ❌ MISSING  | US-002 requires this                                                                                      |
| **`IdeaStatus` enum**                                       | ❌ MISSING  | US-002 requires this                                                                                      |
| **`IdeaVisibility` enum**                                   | ❌ MISSING  | US-002 requires this                                                                                      |
| **`User.ideas` / `User.reviews` relations**                 | ❌ MISSING  | Required for full schema                                                                                  |
| **`verificationToken` / `verificationTokenExpiry` on User** | ⚠️ DIVERGED | Story uses inline fields; current schema uses separate `VerificationToken` model (EPIC-02 decision, keep) |
| Migration run                                               | ❌ BLOCKED  | Requires `.env.local` with real Neon credentials                                                          |
| Prisma Studio connectivity verified                         | ❌ BLOCKED  | Requires migration first                                                                                  |

### US-003 Status

| Item                                      | Status         | Notes                                    |
| ----------------------------------------- | -------------- | ---------------------------------------- |
| `.env.example` exists                     | ✅ DONE        | Present in project root                  |
| `DATABASE_URL` + `DIRECT_URL` documented  | ✅ DONE        | With Neon/PgBouncer examples             |
| `AUTH_SECRET` / `NEXTAUTH_URL` documented | ✅ DONE        | (EPIC-02 vars — ok to keep)              |
| `SUPERADMIN_EMAIL` documented             | ✅ DONE        |                                          |
| Feature flags documented                  | ✅ DONE        | All 5 flags present                      |
| **`PORTAL_ENABLED` description comment**  | ⚠️ NEEDS CHECK | US-003 requires description per variable |
| `.env.local` in `.gitignore`              | ⚠️ UNVERIFIED  | `.gitignore` not yet inspected           |
| **Vercel deployment live**                | ❌ PENDING     | Not deployed yet                         |

---

## 3. RED Phase Tests

All tests below must be **written first and confirmed failing** before the corresponding implementation task begins. This enforces the TDD contract.

### 3.1 US-001 Tests — `__tests__/epic-01/scaffold.test.ts`

```typescript
// __tests__/epic-01/scaffold.test.ts
// RED Phase — all tests must FAIL before US-001 implementation tasks begin

import { describe, it, expect } from 'vitest'

describe('US-001 — Project Scaffold', () => {
  // AC-001-3: shadcn/ui Button is importable (fails until shadcn installed)
  it('AC-001-3: shadcn Button component can be imported without errors', async () => {
    const { Button } = await import('@/components/ui/button')
    expect(Button).toBeDefined()
    expect(typeof Button).toBe('function')
  })

  // AC-001-4: .prettierrc exists in project root (fails until file created)
  it('AC-001-4: .prettierrc exists and contains valid JSON with project conventions', async () => {
    const fs = await import('fs/promises')
    const path = await import('path')
    const prettierrcPath = path.join(process.cwd(), '.prettierrc')
    const content = await fs.readFile(prettierrcPath, 'utf-8')
    const config = JSON.parse(content)
    expect(config.semi).toBe(false)
    expect(config.singleQuote).toBe(true)
    expect(config.tabWidth).toBe(2)
  })

  // AC-001-4: package.json has prettier + lint-staged devDeps
  it('AC-001-4: package.json includes lint-staged and husky as devDependencies', async () => {
    const fs = await import('fs/promises')
    const content = await fs.readFile('package.json', 'utf-8')
    const pkg = JSON.parse(content)
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
    expect(allDeps['lint-staged']).toBeDefined()
    expect(allDeps['husky']).toBeDefined()
    expect(allDeps['prettier']).toBeDefined()
  })

  // AC-001-3: components/ui/button.tsx file exists at expected path
  it('AC-001-3: components/ui/button.tsx file exists (shadcn installed)', async () => {
    const fs = await import('fs/promises')
    const path = await import('path')
    const buttonPath = path.join(process.cwd(), 'components', 'ui', 'button.tsx')
    const stat = await fs.stat(buttonPath)
    expect(stat.isFile()).toBe(true)
  })
})
```

**Build / Lint Gates (manual — not Vitest)**:

- `npm run build` → 0 errors, 0 warnings _(AC-001-1)_
- `npm run lint` → 0 errors, 0 warnings _(AC-001-2)_

---

### 3.2 US-002 Tests — `__tests__/epic-01/schema-models.test.ts`

```typescript
// __tests__/epic-01/schema-models.test.ts
// RED Phase — all tests must FAIL before US-002 schema additions are applied

import { describe, it, expect } from 'vitest'
import { db } from '@/lib/db'

describe('US-002 — Prisma Schema: Idea + IdeaReview Models', () => {
  // AC-002-1: Idea model exists on PrismaClient (fails until model added)
  it('AC-002-1: db.idea property exists on PrismaClient', () => {
    expect(db.idea).toBeDefined()
    expect(typeof db.idea.findMany).toBe('function')
  })

  // AC-002-1: IdeaReview model exists on PrismaClient
  it('AC-002-1: db.ideaReview property exists on PrismaClient', () => {
    expect(db.ideaReview).toBeDefined()
    expect(typeof db.ideaReview.findMany).toBe('function')
  })

  // AC-002-1: IdeaStatus enum values are accessible
  it('AC-002-1: IdeaStatus enum has all required values', async () => {
    const { IdeaStatus } = await import('@/lib/generated/prisma/client')
    expect(IdeaStatus.SUBMITTED).toBe('SUBMITTED')
    expect(IdeaStatus.UNDER_REVIEW).toBe('UNDER_REVIEW')
    expect(IdeaStatus.ACCEPTED).toBe('ACCEPTED')
    expect(IdeaStatus.REJECTED).toBe('REJECTED')
  })

  // AC-002-1: IdeaVisibility enum values are accessible
  it('AC-002-1: IdeaVisibility enum has required values', async () => {
    const { IdeaVisibility } = await import('@/lib/generated/prisma/client')
    expect(IdeaVisibility.PUBLIC).toBe('PUBLIC')
    expect(IdeaVisibility.PRIVATE).toBe('PRIVATE')
  })

  // AC-002-3: db.user.findMany() returns array without throwing (connectivity)
  // Note: This tests schema structure only — actual DB connectivity requires .env.local
  it('AC-002-3: User model is queryable from db singleton', () => {
    expect(db.user).toBeDefined()
    expect(typeof db.user.findMany).toBe('function')
    expect(typeof db.user.create).toBe('function')
  })

  // AC-002-1: User model now has relations to Idea and IdeaReview
  it('AC-002-1: db.user has idea and review relation fields accessible', () => {
    // Verifies PrismaClient generated with relational fields
    // These exist on model delegates after schema addition + prisma generate
    expect(db.user).toBeDefined()
    // If Idea relation not yet generated, db.idea will be undefined — RED
    expect(db.idea).toBeDefined()
  })
})
```

> **Note on AC-002-3 (live connectivity)**: `prisma.user.findMany()` returning `[]` with no errors is an integration test requiring a real database. Mark this test as `integration` and gate it behind `INTEGRATION=true` env flag. It runs in CI only, not local unit test suite.

```typescript
// __tests__/epic-01/schema-connectivity.integration.test.ts
// Runs only with INTEGRATION=true and .env.local pointing to real Neon DB

import { describe, it, expect } from 'vitest'
import { db } from '@/lib/db'

describe.skipIf(!process.env.INTEGRATION)('US-002 — Live DB Connectivity (AC-002-3)', () => {
  it('AC-002-3: prisma.user.findMany() returns empty array without error', async () => {
    const users = await db.user.findMany()
    expect(Array.isArray(users)).toBe(true)
  })

  it('AC-002-3: prisma.idea.findMany() returns empty array without error', async () => {
    const ideas = await db.idea.findMany()
    expect(Array.isArray(ideas)).toBe(true)
  })

  it('AC-002-3: prisma.ideaReview.findMany() returns empty array without error', async () => {
    const reviews = await db.ideaReview.findMany()
    expect(Array.isArray(reviews)).toBe(true)
  })
})
```

---

### 3.3 US-003 Tests — `__tests__/epic-01/env-config.test.ts`

```typescript
// __tests__/epic-01/env-config.test.ts
// RED Phase — tests verify documentation correctness of .env.example

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

describe('US-003 — Environment Configuration', () => {
  const envExample = readFileSync(join(process.cwd(), '.env.example'), 'utf-8')
  const gitignore = readFileSync(join(process.cwd(), '.gitignore'), 'utf-8')

  // AC-003-3: .env.example must declare all required variable names
  const requiredVars = [
    'DATABASE_URL',
    'DIRECT_URL',
    'AUTH_SECRET',
    'NEXTAUTH_URL',
    'RESEND_API_KEY',
    'SUPERADMIN_EMAIL',
    'PORTAL_ENABLED',
    'FEATURE_EMAIL_VERIFICATION_ENABLED',
    'FEATURE_USER_MANAGEMENT_ENABLED',
    'FEATURE_FILE_ATTACHMENT_ENABLED',
    'FEATURE_ANALYTICS_ENABLED',
  ]

  requiredVars.forEach((varName) => {
    it(`AC-003-3: .env.example declares ${varName}`, () => {
      expect(envExample).toContain(varName)
    })
  })

  // AC-003-3: Each variable has a comment describing it
  it('AC-003-3: .env.example has comments (# characters) describing variables', () => {
    const commentLines = envExample.split('\n').filter((l) => l.startsWith('#'))
    expect(commentLines.length).toBeGreaterThan(5)
  })

  // AC-003-4: .env.local must be in .gitignore
  it('AC-003-4: .gitignore contains .env.local entry', () => {
    expect(gitignore).toContain('.env.local')
  })

  // AC-003-4: .env*.local must be in .gitignore (Next.js default pattern)
  it('AC-003-4: .gitignore contains .env*.local or .env.local pattern', () => {
    const hasLocalPattern = gitignore.includes('.env*.local') || gitignore.includes('.env.local')
    expect(hasLocalPattern).toBe(true)
  })
})
```

**E2E Smoke Test — `__tests__/e2e/homepage.spec.ts`**:

```typescript
// __tests__/e2e/homepage.spec.ts
// Playwright E2E — RED until shadcn Button renders on /

import { test, expect } from '@playwright/test'

test.describe('US-001 / US-003 — Homepage baseline', () => {
  test('AC-001-3 / AC-003-1: GET / returns HTTP 200', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('AC-001-3: shadcn Button is rendered on homepage', async ({ page }) => {
    await page.goto('/')
    // Button must be present with shadcn class signature
    const button = page.locator('button').first()
    await expect(button).toBeVisible()
    // shadcn Button uses 'inline-flex' in its base class
    await expect(button).toHaveClass(/inline-flex/)
  })
})
```

---

## 4. Technical Task Breakdown

### US-001 Tasks

#### T-E01-001 — Install and configure shadcn/ui

**AC**: AC-001-3  
**Files to create/modify**:

- `components.json` (created by `npx shadcn@latest init`)
- `components/ui/button.tsx` (added by `npx shadcn@latest add button`)
- `app/page.tsx` — add `<Button>Hello InnovatEPAM</Button>` to verify render

**Commands**:

```bash
npx shadcn@latest init
# Select: style=default, color=slate, CSS variables=yes, tailwind.config=no (v4 uses CSS)
npx shadcn@latest add button
```

**Constraint**: Tailwind v4 uses CSS-first config (`@theme` in globals.css), not `tailwind.config.ts` — ensure `shadcn init` doesn't create a conflicting config file.

---

#### T-E01-002 — Add Prettier + lint-staged + husky

**AC**: AC-001-4  
**Files to create/modify**:

- `.prettierrc` (create): `{ "semi": false, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5" }`
- `.prettierignore` (create): `node_modules .next lib/generated`
- `package.json` (modify): add `devDependencies`, `lint-staged`, `prepare` script

**Commands**:

```bash
npm install --save-dev prettier lint-staged
npx husky init
echo "npx lint-staged" > .husky/pre-commit
```

**`package.json` additions**:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  }
}
```

---

#### T-E01-003 — Verify build and lint pass (gate check)

**AC**: AC-001-1, AC-001-2  
**This is a verification task — no file creation.** Run:

```bash
npm run build    # must exit 0, zero TypeScript errors
npm run lint     # must exit 0, zero warnings
```

Fix any ESLint errors introduced by shadcn/ui components. Common issues:

- `@typescript-eslint/no-unused-vars` on shadcn helper types → add to eslint ignore
- `react/display-name` on forwarded refs → add display name

---

### US-002 Tasks

#### T-E01-004 — Add Idea, IdeaReview models to schema.prisma

**AC**: AC-002-1  
**Files to modify**:

- `prisma/schema.prisma`

**Schema additions** (append after `VerificationToken` model):

```prisma
// US-002 AC-1 — IdeaStatus lifecycle state machine
enum IdeaStatus {
  SUBMITTED    // initial state — all new ideas
  UNDER_REVIEW // admin has picked up the idea
  ACCEPTED     // admin decision positive
  REJECTED     // admin decision negative
}

// US-002 AC-1 — Visibility control
enum IdeaVisibility {
  PUBLIC  // visible to all authenticated users
  PRIVATE // visible to author + admins only
}

// US-002 AC-1 — Core idea entity (EPIC-03 builds CRUD on top of this)
model Idea {
  id             String         @id @default(cuid())
  title          String
  description    String
  category       String
  status         IdeaStatus     @default(SUBMITTED)
  visibility     IdeaVisibility @default(PUBLIC)
  attachmentPath String?        // FEATURE_FILE_ATTACHMENT_ENABLED
  authorId       String
  author         User           @relation(fields: [authorId], references: [id])
  review         IdeaReview?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@map("ideas")
}

// US-002 AC-1 — One review per idea (unique on ideaId)
model IdeaReview {
  id         String     @id @default(cuid())
  ideaId     String     @unique
  idea       Idea       @relation(fields: [ideaId], references: [id])
  reviewerId String
  reviewer   User       @relation("ReviewedBy", fields: [reviewerId], references: [id])
  decision   IdeaStatus
  comment    String
  createdAt  DateTime   @default(now())

  @@map("idea_reviews")
}
```

**User model additions** (add relations to existing `User` model):

```prisma
// Add inside model User { ... }
ideas   Idea[]       @relation
reviews IdeaReview[] @relation("ReviewedBy")
```

---

#### T-E01-005 — Regenerate Prisma client

**AC**: AC-002-1  
**Command**:

```bash
npx prisma generate
```

This regenerates `lib/generated/prisma/` to include `IdeaStatus`, `IdeaVisibility`, `db.idea`, `db.ideaReview` delegates. The RED tests in `schema-models.test.ts` become GREEN after this step.

---

#### T-E01-006 — Run initial migration (requires real DB credentials)

**AC**: AC-002-1, AC-002-2, AC-002-3  
**Precondition**: `.env.local` must be populated with real Neon `DATABASE_URL` + `DIRECT_URL`.

```bash
# Ensure .env.local is in place with real Neon credentials
npx prisma migrate dev --name init
```

**Expected**: Creates `User`, `VerificationToken`, `Idea`, `IdeaReview` tables in PostgreSQL.  
**Verify via Prisma Studio**:

```bash
npx prisma studio
# Confirm: users, verification_tokens, ideas, idea_reviews tables visible
```

---

### US-003 Tasks

#### T-E01-007 — Audit and complete .env.example

**AC**: AC-003-3  
**File to modify**: `.env.example`

Ensure the following variables are documented with descriptive comments (current file has most but check against full list):

```bash
# .env.example — All required environment variables
# Copy this file to .env.local and fill in the values

# ── Database (Neon PostgreSQL) ──────────────────────────────────────────────
DATABASE_URL=        # Pooled connection via PgBouncer: ?pgbouncer=true&connection_limit=1
DIRECT_URL=          # Direct connection (bypasses pool) — used by Prisma CLI for migrations

# ── NextAuth.js v5 ──────────────────────────────────────────────────────────
AUTH_SECRET=         # 32+ char random secret: openssl rand -base64 32
NEXTAUTH_URL=        # http://localhost:3000 (dev) | https://your-app.vercel.app (prod)

# ── Email Service (Resend) ──────────────────────────────────────────────────
RESEND_API_KEY=      # From https://resend.com/api-keys — required when FEATURE_EMAIL_VERIFICATION_ENABLED=true

# ── Rate Limiting (Upstash Redis) — optional ────────────────────────────────
UPSTASH_REDIS_REST_URL=    # Falls back to in-memory if omitted
UPSTASH_REDIS_REST_TOKEN=  # Falls back to in-memory if omitted

# ── Bootstrap ───────────────────────────────────────────────────────────────
SUPERADMIN_EMAIL=    # Email to promote to SUPERADMIN on first seed (prisma/seed.ts)

# ── Feature Flags ───────────────────────────────────────────────────────────
PORTAL_ENABLED=true                        # Global kill switch — set false to return 503 everywhere
FEATURE_EMAIL_VERIFICATION_ENABLED=true   # Enables email verification flow (US-005)
FEATURE_USER_MANAGEMENT_ENABLED=true      # Enables admin/users UI (US-008)
FEATURE_FILE_ATTACHMENT_ENABLED=false     # Enables file upload on ideas (EPIC-03)
FEATURE_ANALYTICS_ENABLED=false           # Enables /admin/analytics (future)
```

---

#### T-E01-008 — Verify .gitignore covers .env.local

**AC**: AC-003-4  
**File to inspect/modify**: `.gitignore`

Next.js default `.gitignore` includes `.env*.local` — verify this pattern is present. If missing, add:

```
# local env files
.env*.local
```

Run `git status` to confirm `.env.local` does not appear as a tracked file.

---

#### T-E01-009 — Vercel deployment

**AC**: AC-003-2  
**This is an operational task, not a code change.**

Steps:

1. Connect GitHub repo to Vercel (Vercel dashboard → Import project)
2. Set all environment variables in Vercel dashboard (from `.env.example` list)
3. Set `DIRECT_URL` = Neon direct connection string (no PgBouncer suffix)
4. Set `DATABASE_URL` = Neon pooled connection string (with PgBouncer suffix)
5. Push to `main` → Vercel auto-deploys
6. Verify: production URL returns HTTP 200 on `GET /`

**Vercel-specific notes**:

- `NEXTAUTH_URL` must match the Vercel deployment URL (update after first deploy)
- Set `NODE_ENV=production` automatically by Vercel — no manual action needed
- Add `prisma generate` to Vercel build step if not already in `next.config.ts`

---

## 5. AC → Task Traceability Matrix

| AC ID    | Story  | Task(s)                                                         |
| -------- | ------ | --------------------------------------------------------------- |
| AC-001-1 | US-001 | T-E01-003 (build gate)                                          |
| AC-001-2 | US-001 | T-E01-003 (lint gate)                                           |
| AC-001-3 | US-001 | T-E01-001 (shadcn/ui install + Button on `/`)                   |
| AC-001-4 | US-001 | T-E01-002 (.prettierrc + lint-staged + husky)                   |
| AC-002-1 | US-002 | T-E01-004 (schema) + T-E01-005 (generate) + T-E01-006 (migrate) |
| AC-002-2 | US-002 | T-E01-006 (Prisma Studio verification)                          |
| AC-002-3 | US-002 | T-E01-006 (live connectivity test — integration flag)           |
| AC-003-1 | US-003 | T-E01-007 (env vars) + T-E01-008 (gitignore)                    |
| AC-003-2 | US-003 | T-E01-009 (Vercel deployment)                                   |
| AC-003-3 | US-003 | T-E01-007 (.env.example audit)                                  |
| AC-003-4 | US-003 | T-E01-008 (.gitignore verification)                             |

---

## 6. Definition of Done (Epic-01)

All items must be ✅ before EPIC-01 is closed:

### US-001 DoD

- [ ] `npm run build` exits 0, zero TypeScript errors, zero Next.js warnings
- [ ] `npm run lint` exits 0, zero errors/warnings
- [ ] `components/ui/button.tsx` present; `Button` renders on `/`
- [ ] `.prettierrc` committed with `semi: false, singleQuote: true, tabWidth: 2`
- [ ] `husky` pre-commit hook runs `lint-staged` on staged files
- [ ] `git log` shows commit: `chore: initialize Next.js 15 project`

### US-002 DoD

- [ ] `prisma/schema.prisma` has `User`, `Idea`, `IdeaReview`, `VerificationToken` models
- [ ] `IdeaStatus` and `IdeaVisibility` enums present in schema
- [ ] `lib/generated/prisma/` reflects all new models after `prisma generate`
- [ ] `npx prisma migrate dev --name init` completes without errors
- [ ] `npx prisma studio` shows 4 tables (users, verification_tokens, ideas, idea_reviews)
- [ ] `db.user.findMany()` returns `[]` (live DB required)
- [ ] `git commit: feat(db): add initial prisma schema`

### US-003 DoD

- [ ] `.env.example` has all 11 variables with descriptive comments
- [ ] `.env.local` does NOT appear in `git status`
- [ ] `.gitignore` contains `.env*.local` or `.env.local`
- [ ] Vercel production URL returns HTTP 200
- [ ] All env vars set in Vercel dashboard
- [ ] `git commit: chore: add env config and vercel deployment`

---

## 7. Test Execution Order

```
1. Write tests first (RED phase — all must FAIL):
   __tests__/epic-01/scaffold.test.ts           ← US-001
   __tests__/epic-01/schema-models.test.ts       ← US-002
   __tests__/epic-01/env-config.test.ts          ← US-003
   __tests__/e2e/homepage.spec.ts                ← US-001 + US-003

2. Confirm RED:
   npm run test -- epic-01      # 8+ failures expected

3. Implement tasks in order:
   T-E01-001 (shadcn) → T-E01-002 (prettier) → T-E01-003 (build/lint gate)
   T-E01-004 (schema) → T-E01-005 (generate) → T-E01-006 (migrate — needs .env.local)
   T-E01-007 (env.example) → T-E01-008 (gitignore) → T-E01-009 (vercel)

4. Confirm GREEN:
   npm run test -- epic-01      # 0 failures
   npm run test:e2e             # homepage spec passes
   npm run test:coverage        # ≥80% maintained
```

---

## 8. Assumptions & Constraints

| Assumption                                                           | Justification                                                                                      |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `VerificationToken` stays as a separate model (not inline on `User`) | EPIC-02 clarification Q2 resolved this; separate model gives cleaner TTL management                |
| shadcn/ui v4-compatible with Tailwind v4 CSS-first config            | Check release notes; if conflict, pin shadcn to latest stable and resolve in T-E01-001             |
| Vercel account + GitHub repo connection exist                        | US-003 pre-requisite; external blocker if not ready                                                |
| Real Neon DB credentials available for T-E01-006                     | Integration tests gated behind `INTEGRATION=true` to allow offline unit testing                    |
| `npm run test:coverage` threshold is ≥80% line coverage              | From `vitest.config.ts` — epic-01 tests should contribute to this without dropping below threshold |
| `.prettierrc` format aligns with existing ESLint config              | If conflicts arise (semi/quote rules), defer to ESLint — mark prettier as formatter, not linter    |

---

_Generated by `speckit.specify` · v1.0 · 2026-02-24_

---

## Spec File Index — V1.0 (Phase 1 MVP)

### PRD

- [specs/prd-innovatepam.md](../../specs/prd-innovatepam.md)

### Epics

- [EPIC-01 Foundation](../../specs/epics/EPIC-01-foundation.md)
- [EPIC-02 Auth & Roles](../../specs/epics/EPIC-02-auth-roles.md)
- [EPIC-03 Idea Submission](../../specs/epics/EPIC-03-idea-submission.md)
- [EPIC-04 Evaluation & QA](../../specs/epics/EPIC-04-evaluation-qa.md)

### User Stories

**EPIC-01 Foundation (US-001–003)**

- [US-001 Project scaffold](../../specs/stories/epic-01/US-001-project-scaffold.md)
- [US-002 Database & Prisma setup](../../specs/stories/epic-01/US-002-database-prisma-setup.md)
- [US-003 Env config & Vercel deploy](../../specs/stories/epic-01/US-003-env-config-vercel-deploy.md)

**EPIC-02 Auth & Roles (US-004–007)**

- [US-004 User registration](../../specs/stories/epic-02/US-004-user-registration.md)
- [US-005 Email verification](../../specs/stories/epic-02/US-005-email-verification.md)
- [US-006 Login / logout](../../specs/stories/epic-02/US-006-login-logout.md)
- [US-007 Route protection & RBAC](../../specs/stories/epic-02/US-007-route-protection-rbac.md)

**EPIC-03 Idea Submission (US-008–011)**

- [US-008 Submit idea form](../../specs/stories/epic-03/US-008-submit-idea-form.md)
- [US-009 Idea list page](../../specs/stories/epic-03/US-009-idea-list-page.md)
- [US-010 Idea detail page](../../specs/stories/epic-03/US-010-idea-detail-page.md)
- [US-011 My ideas page](../../specs/stories/epic-03/US-011-my-ideas-page.md)

**EPIC-04 Evaluation & QA (US-012–016)**

- [US-012 Evaluation workflow](../../specs/stories/epic-04/US-012-evaluation-workflow.md)
- [US-013 Admin dashboard](../../specs/stories/epic-04/US-013-admin-dashboard.md)
- [US-014 Analytics page](../../specs/stories/epic-04/US-014-analytics-page.md)
- [US-015 Profile & settings](../../specs/stories/epic-04/US-015-profile-settings.md)
- [US-016 Test suite & QA gate](../../specs/stories/epic-04/US-016-test-suite-qa-gate.md)

### Sprint Spec Folders

- [specs/001-foundation/](../../specs/001-foundation/)
- [specs/001-auth-rbac/](../../specs/001-auth-rbac/)
- [specs/002-idea-submission/](../../specs/002-idea-submission/)
- [specs/003-evaluation-qa/](../../specs/003-evaluation-qa/)
