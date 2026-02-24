# Implementation Plan: Foundation & Infrastructure

**Branch**: `001-foundation` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-foundation/spec.md`

## Summary

Establish the complete project foundation for InnovateEPAM Portal: Next.js 16 App Router scaffold with TypeScript strict mode, Tailwind CSS v4 CSS-first design system, shadcn/ui component library, Prisma v7 schema (User + Idea + IdeaReview + VerificationToken), Neon PostgreSQL with PgBouncer, and Vercel auto-deploy pipeline. All four database tables are created in a single initial migration so that EPIC-02 (auth) requires no additional schema changes.

## Technical Context

**Language/Version**: TypeScript 5.4+ / Node.js 20.9+ (Next.js 16 requirement)  
**Primary Dependencies**: Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, Prisma v7.4.1, Zod, Vitest v4, Playwright  
**Storage**: PostgreSQL via Neon — `DATABASE_URL` (PgBouncer pooled) + `DIRECT_URL` (direct for Prisma CLI migrations)  
**Testing**: Vitest v4 (unit/integration, jsdom, ≥80% coverage) + Playwright (E2E, chromium)  
**Target Platform**: Vercel (auto-deploy on `main` push), Node.js 20.x runtime  
**Project Type**: Full-stack web application (Next.js monolith, no separate backend)  
**Performance Goals**: Home page FCP <1.5s on Vercel Edge; DB queries <100ms for simple reads  
**Constraints**: Zero TypeScript errors, zero ESLint warnings, zero build warnings; no `@ts-ignore`; shadcn/ui must be compatible with Tailwind v4 CSS-first  
**Scale/Scope**: ~50 internal EPAM employees initial user base; single-region Neon DB

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Pre-Design Gates

| Gate | Status | Notes |
|---|---|---|
| Simplest possible approach | ✅ PASS | Next.js monolith on Vercel — no micro-services, no separate API |
| Uses only approved stack | ✅ PASS | Next.js 16, Tailwind v4, Prisma v7, Neon, Vitest, Playwright — all pre-approved |
| No added complexity without justification | ✅ PASS | Foundation work; any complexity is inherent to the stack |
| All four entities in one migration | ✅ PASS | FR-005 explicitly requires this; no incremental schema risk |
| No secrets committed | ✅ PASS | `.env.local` in `.gitignore`; `.env.example` committed with placeholders only |

### Post-Design Re-check (Phase 1)

| Gate | Status | Notes |
|---|---|---|
| Schema covers all epics Day 1 | ✅ PASS | User + Idea + IdeaReview + VerificationToken in initial migration |
| Tailwind v4 ↔ shadcn/ui compatibility resolved | ✅ PASS | shadcn `canary` supports Tailwind v4 CSS-vars; `@theme` in `globals.css` |
| Prisma v7 adapter pattern applied | ✅ PASS | `@prisma/adapter-pg`, `prisma.config.ts`, output `lib/generated/prisma` |
| `displayName` NOT NULL enforced at app layer | ✅ PASS | Derived from email local-part before any DB insert; DB constraint enforces |
| Category constants — no migration on change | ✅ PASS | String column in DB; list lives in `constants/idea-categories.ts` |

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── env.contract.md
│   └── categories.contract.md
└── tasks.md             # Phase 2 output (speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
innovatepam-portal/
├── app/                         # Next.js App Router — all routes
│   ├── layout.tsx               # Root layout (Tailwind @theme, fonts)
│   ├── page.tsx                 # Home page (renders at least one shadcn Button)
│   ├── globals.css              # Tailwind v4 @import + @theme tokens
│   └── favicon.ico
├── components/
│   └── ui/                      # shadcn/ui auto-generated components
├── constants/
│   └── idea-categories.ts       # Predefined Idea.category values (FR-016)
├── lib/
│   ├── db.ts                    # Prisma Client singleton (adapter-pg)
│   └── generated/
│       └── prisma/              # Prisma v7 generated client output
├── prisma/
│   ├── schema.prisma            # Schema (generator + datasource, no URLs)
│   └── migrations/              # Version-controlled migration files
├── prisma.config.ts             # Prisma v7 config (DB URLs, schema path)
├── __tests__/
│   ├── unit/                    # Vitest unit tests
│   └── e2e/                     # Playwright E2E tests
├── .env.example                 # 13 documented vars (no real secrets)
├── .env.local                   # Local secrets — gitignored
├── next.config.ts
├── tsconfig.json
├── vitest.config.ts
├── playwright.config.ts
├── postcss.config.mjs
├── components.json              # shadcn/ui config
└── package.json
```

**Structure Decision**: Single Next.js 16 App Router monolith. No `src/` directory — files at repo root following Next.js convention. `lib/` for utilities and generated Prisma client. `components/ui/` for shadcn. `constants/` for application-layer constants. `__tests__/` for all test types.

## Phase 0: Research → `research.md`

Research tasks dispatched and consolidated in [research.md](./research.md).

| Topic | Status |
|---|---|
| Tailwind v4 CSS-first → shadcn/ui compatibility | ✅ Resolved |
| Prisma v7 adapter pattern + prisma.config.ts | ✅ Resolved |
| Next.js 16 + Turbopack + Tailwind v4 PostCSS | ✅ Resolved |
| Neon PgBouncer connection patterns | ✅ Resolved |
| Vercel deploy config for Next.js 16 | ✅ Resolved |

## Phase 1: Design artifacts

| Artifact | Status | Link |
|---|---|---|
| Data model | ✅ Complete | [data-model.md](./data-model.md) |
| Env contract | ✅ Complete | [contracts/env.contract.md](./contracts/env.contract.md) |
| Categories contract | ✅ Complete | [contracts/categories.contract.md](./contracts/categories.contract.md) |
| Quickstart | ✅ Complete | [quickstart.md](./quickstart.md) |

## Complexity Tracking

> No constitution violations — infrastructure work, simplest possible approach. No tracking required.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
