# Research: Foundation & Infrastructure

**Phase**: 0 — Outline & Research  
**Branch**: `001-foundation`  
**Date**: 2026-02-24

All topics that were NEEDS CLARIFICATION in the Technical Context have been resolved below.

---

## 1. Tailwind CSS v4 ↔ shadcn/ui Compatibility

**Decision**: Use `shadcn@canary` (≥ 2.5.0) with the Tailwind v4 CSS-vars init path.

**Rationale**:

- shadcn/ui v0 (stable) is built for Tailwind v3 (`tailwind.config.ts` + `@tailwind` directives). It cannot be used with Tailwind v4 without a wrapper shim.
- The `shadcn@canary` channel ships a Tailwind v4–first init that writes design tokens directly into `globals.css` under `@theme` and `@layer base` — no `tailwind.config.ts` generated.
- The `components.json` for the canary still controls style=default, color=slate, CSS variables=yes, but the output adapts to v4 CSS-first conventions.

**Init command**:
```sh
npx shadcn@canary init
# Select: TypeScript=yes, style=default, base color=slate, CSS variables=yes
# Tailwind config path → use globals.css (v4 CSS-first)
```

**Key constraints applied**:
- `@import "tailwindcss"` — NOT `@tailwind base/components/utilities` (v3 pattern removed in v4).
- All design tokens (`--color-background`, `--color-foreground`, `--color-primary`, etc.) defined under `@theme` in `globals.css`.
- Dark mode via `@custom-variant dark (&:where(.dark, .dark *))` — NOT `darkMode: "class"` in config.
- shadcn components use `data-slot` attributes for styling hooks; CVA for variants.
- No `tailwind.config.ts` created — v4 fully CSS-first.

**Alternatives considered**:
- Pin Tailwind to v3: rejected — spec and skill mandate v4.
- Custom CSS transforms to bridge v3 shadcn with v4: rejected — fragile, maintenance burden.

---

## 2. Prisma v7: Driver Adapter Pattern + `prisma.config.ts`

**Decision**: Use `@prisma/adapter-pg` with `PrismaClient` constructor; all DB config in `prisma.config.ts`.

**Rationale**:

Prisma v7 introduces mandatory breaking changes:
1. Generator provider changes: `prisma-client-js` → `prisma-client`.
2. `output` is required — client no longer generated into `node_modules`.
3. DB URLs (`url`, `directUrl`) deprecated in `schema.prisma` datasource; must move to `prisma.config.ts`.
4. All database connections now require a driver adapter.
5. Prisma ships as ESM; `"type": "module"` required in `package.json` (or use `ts-node` ESM loader).

**Schema pattern**:
```prisma
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // No url/directUrl here — moved to prisma.config.ts
}
```

**`prisma.config.ts` pattern**:
```ts
import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, 'prisma/schema.prisma'),
  datasources: {
    db: {
      url: process.env.DATABASE_URL!,
      // directUrl used by CLI for migrations (bypasses PgBouncer)
    },
  },
  migrate: {
    async adapter(env) {
      const { PrismaPg } = await import('@prisma/adapter-pg')
      return new PrismaPg({ connectionString: env.DIRECT_URL })
    },
  },
})
```

**`lib/db.ts` singleton pattern**:
```ts
import { PrismaClient } from '../lib/generated/prisma'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

**Import path**: `import { db } from '@/lib/db'` (after adding `@/*` path alias in `tsconfig.json`).

**Alternatives considered**:
- `@prisma/adapter-neon`: considered for native Neon WebSocket adapter; rejected for simplicity — `adapter-pg` works reliably with Neon's standard PostgreSQL endpoint, and PgBouncer pooling is handled at the connection string level.

---

## 3. Next.js 16 + Turbopack + Tailwind v4 PostCSS

**Decision**: Use `@tailwindcss/postcss` plugin with Turbopack; no `tailwind.config.ts`.

**Rationale**:

Next.js 16 defaults to Turbopack for `next dev`. Tailwind v4 ships its own PostCSS plugin `@tailwindcss/postcss` that replaces the v3 `tailwindcss` plugin. Next.js Turbopack invokes PostCSS automatically from `postcss.config.mjs`.

**`postcss.config.mjs`**:
```mjs
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
export default config
```

**`globals.css`** (top of file):
```css
@import "tailwindcss";

@theme {
  /* design tokens here */
}
```

**No `tailwind.config.ts`** — v4 reads config from CSS `@theme` only.

**`next.config.ts`**: no special Tailwind config needed; Turbopack picks up PostCSS automatically.

**Gotcha**: Do not mix `@tailwind base/components/utilities` directives; use only `@import "tailwindcss"`. The v4 migration removes those directives entirely.

**Alternatives considered**:
- `next dev --webpack`: rejected — Turbopack is the v16 default and is stable.
- Vite-based Tailwind integration: N/A — project is on Next.js, not Vite.

---

## 4. Neon PgBouncer Connection Patterns

**Decision**: Dual-URL pattern — `DATABASE_URL` (pooled) for app runtime, `DIRECT_URL` for Prisma migrate CLI.

**Rationale**:

Neon provides two connection string types:
1. **Pooled** (`pooler.neon.tech`, PgBouncer transaction mode) — low-latency, handles serverless cold starts, safe for concurrent Vercel function invocations.
2. **Direct** (`<project>.neon.tech`) — used by Prisma CLI (`prisma migrate deploy`) because prepared statements require a persistent connection that PgBouncer transaction mode does not support.

**`prisma.config.ts` uses**:
- `url: process.env.DATABASE_URL` (pooled) — runtime queries.
- `migrate.adapter` uses `process.env.DIRECT_URL` (direct) — CLI migrations only.

**`lib/db.ts` uses**:
- `DATABASE_URL` (pooled) for runtime `PrismaClient` adapter.

**Vercel environment variables**:
- `DATABASE_URL` → Neon pooled connection string.
- `DIRECT_URL` → Neon direct connection string.
- Both must be set in Vercel project settings under the appropriate environments (Production, Preview, Development).

**Alternatives considered**:
- Single URL (direct only): rejected — would exhaust Neon connection limits under concurrent Vercel invocations.
- `@prisma/adapter-neon` WebSocket adapter: rejected — adds complexity; `adapter-pg` with pooled URL is sufficient for this scale (~50 users).

---

## 5. Vercel Deploy Config for Next.js 16

**Decision**: Zero-config Vercel deployment via `vercel.json` with Node.js 20.x runtime.

**Rationale**:

Vercel auto-detects Next.js projects. Next.js 16 requires Node.js 20.x; Vercel's default runtime as of 2024 is Node.js 20.x. No custom `vercel.json` build commands are needed.

**`vercel.json`** (minimal — sets Node version and cron if needed later):
```json
{
  "framework": "nextjs"
}
```

**Auto-deploy trigger**: Connecting the GitHub repo to the Vercel project activates automatic deploys on every push to `main`. Preview deploys are created for all other branches.

**Environment variables in Vercel**: Set via dashboard or Vercel CLI (`vercel env add`). All 13 variables from `.env.example` (FR-010) must be configured for Production environment before the first deploy.

**Build command**: `next build` (Vercel default for Next.js).  
**Output directory**: `.next` (Vercel default).

**Feature flags**: `PORTAL_ENABLED`, `FEATURE_*` flags are set as plain environment variables — no Vercel Feature Flags SDK needed at this stage.

**Alternatives considered**:
- Custom `Dockerfile` + Vercel: rejected — overkill for a Next.js monolith on Vercel.
- Railway/Render: rejected — Vercel is the agreed hosting platform.
