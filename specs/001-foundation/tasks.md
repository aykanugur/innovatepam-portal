# Tasks: Foundation & Infrastructure

**Branch**: `001-foundation`  
**Input**: `specs/001-foundation/` — plan.md, spec.md, data-model.md, contracts/, quickstart.md  
**Stories**: US-001 (P1), US-002 (P1), US-003 (P1)  
**Total tasks**: 36 | **Parallel opportunities**: 15 | **Test tasks**: 3

---

## Format: `[ID] [P?] [Story?] Description — file path`

- **[P]**: Safe to run in parallel (touches different files, no unresolved dependencies)
- **[US#]**: Implementation belongs to this user story phase
- All file paths are relative to repo root `innovatepam-portal/`

---

## Phase 1: Setup

**Purpose**: Install all dependencies, establish base configs required by all three user stories. Must complete in full before any user story work begins.

- [ ] T001 Add all required dependencies to `package.json` — `next@16`, `react@19`, `react-dom@19`, `typescript@^5.4`, `tailwindcss@4`, `@tailwindcss/postcss`, `postcss`, `prisma@7`, `@prisma/client@7`, `@prisma/adapter-pg`, `pg`, `zod`, `bcryptjs`, `prettier`, `husky`, `lint-staged`, `vitest@4`, `@vitejs/plugin-react`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@types/react`, `@types/react-dom`, `@types/node`, `@types/pg`, `@types/bcryptjs` in `package.json`
- [ ] T002 Run `npm install` to install all packages from T001
- [ ] T003 [P] Configure `tsconfig.json` — `strict: true`, `target: "ES2023"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `jsx: "preserve"`, `paths: { "@/*": ["./*"] }`, `include: ["**/*.ts","**/*.tsx"]` in `tsconfig.json`
- [ ] T004 [P] Configure `next.config.ts` — `framework: "nextjs"`, no custom webpack config (use Turbopack default), export typed `NextConfig` in `next.config.ts`
- [ ] T005 [P] Configure `postcss.config.mjs` — single plugin `"@tailwindcss/postcss": {}`, no `tailwindcss` v3 plugin in `postcss.config.mjs`
- [ ] T006 [P] Update `.gitignore` — ensure `.env.local`, `.next/`, `lib/generated/`, `node_modules/`, `coverage/`, `playwright-report/`, `test-results/` are all excluded in `.gitignore`
- [ ] T007 [P] Add `package.json` scripts: `"dev": "next dev"`, `"build": "next build"`, `"type-check": "tsc --noEmit"`, `"lint": "next lint"`, `"format": "prettier --write ."`, `"test": "vitest run"`, `"test:coverage": "vitest run --coverage"`, `"test:e2e": "playwright test"`, `"db:migrate": "prisma migrate dev"`, `"db:generate": "prisma generate"`, `"db:studio": "prisma studio"` in `package.json`
- [ ] T008 [P] Configure `vitest.config.ts` — `environment: "jsdom"`, `globals: true`, `setupFiles: ["vitest.setup.ts"]`, `resolve.alias: {"@": fileURLToPath(new URL(".", import.meta.url))}`, `coverage: { provider: "v8", thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 } }` in `vitest.config.ts`
- [ ] T009 [P] Create `vitest.setup.ts` — `import "@testing-library/jest-dom"` in `vitest.setup.ts`
- [ ] T010 [P] Configure `playwright.config.ts` — `testDir: "__tests__/e2e"`, `use: { baseURL: "http://localhost:3000", browserName: "chromium" }`, `webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true }` in `playwright.config.ts`

**Checkpoint**: All packages installed; base configs in place. `npm run type-check` may report errors until story phases add source files — this is expected at this stage.

---

## Phase 2: Foundational

**Purpose**: Create the `__tests__/` directory scaffold and the `lib/` directory so all user story phases can write to their correct locations without path conflicts.

**⚠️ CRITICAL**: All three user story phases assume these directories exist.

- [ ] T011 Create `__tests__/unit/` and `__tests__/e2e/` directories with `.gitkeep` placeholders so the directory structure exists before test files are added in `__tests__/unit/.gitkeep` and `__tests__/e2e/.gitkeep`
- [ ] T012 Create `lib/` directory with a placeholder `.gitkeep` (will be replaced by `lib/db.ts` and `lib/env.ts` in later phases) in `lib/.gitkeep`
- [ ] T013 Create `constants/` directory with a placeholder `.gitkeep` (will be replaced by `constants/idea-categories.ts` in US-002) in `constants/.gitkeep`

**Checkpoint**: `__tests__/unit/`, `__tests__/e2e/`, `lib/`, `constants/` all exist. User story phases may now proceed independently.

---

## Phase 3: User Story 1 — Consistent Project Foundation (Priority: P1) 🎯 MVP

**Goal**: Next.js 16 app compiles clean; Tailwind v4 CSS-first design system configured; shadcn/ui installed and rendering a Button on the home page; Prettier + ESLint configured; pre-commit hook enforces formatting automatically.

**Independent Test**: Run `npm run build && npm run lint && npm run type-check` from a fresh clone — all three exit code 0 with zero errors/warnings in project-authored files. Open `http://localhost:3000` — a styled shadcn `Button` is visible. Save any `.ts` file and stage it — the pre-commit hook reformats it automatically per `.prettierrc` rules (no semicolons, single quotes, 2-space indent).

- [ ] T014 [US1] Write `app/globals.css` — `@import "tailwindcss"` at top (NOT `@tailwind` directives); `@theme` block with semantic OKLCH tokens: `--color-background`, `--color-foreground`, `--color-primary`, `--color-primary-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-border`, `--color-ring`, `--color-destructive`; `@custom-variant dark (&:where(.dark, .dark *))` for dark mode; NO `tailwind.config.ts` created in `app/globals.css`
- [ ] T015 [US1] Run `npx shadcn@canary init` — select TypeScript=yes, style=default, base color=slate, CSS variables=yes, Tailwind config=globals.css (v4 path); this generates `components.json` and creates `components/ui/` directory in `components.json`
- [ ] T016 [US1] Add the shadcn `Button` component — run `npx shadcn@canary add button`; verify `components/ui/button.tsx` exists and uses `data-slot` attribute and CVA variants in `components/ui/button.tsx`
- [ ] T017 [US1] Write `app/layout.tsx` — import `"./globals.css"`; configure `Inter` font via `next/font/google`; set metadata `title: "InnovateEPAM Portal"`, `description: "Employee innovation submission portal"`; export `RootLayout` component with `<html lang="en">` in `app/layout.tsx`
- [ ] T018 [US1] Write `app/page.tsx` — import `Button` from `"@/components/ui/button"`; render a `<Button>Submit an Idea</Button>` so FR-003 acceptance scenario 3 is satisfied; page must be a React Server Component (`"use client"` NOT at top) in `app/page.tsx`
- [ ] T019 [P] [US1] Write `.prettierrc` — `{ "semi": false, "singleQuote": true, "tabWidth": 2, "trailingComma": "es5", "printWidth": 100 }` in `.prettierrc`
- [ ] T020 [P] [US1] Write `.prettierignore` — `.next/`, `lib/generated/`, `node_modules/`, `coverage/` in `.prettierignore`
- [ ] T021 [US1] Configure `eslint.config.mjs` — extend `next/core-web-vitals` and `typescript-eslint` strict; set `rules: { "no-console": "warn" }`; no `ignores` on project-authored files in `eslint.config.mjs`
- [ ] T022 [US1] Configure Husky + lint-staged — run `npx husky init`; write `.husky/pre-commit` to execute `npx lint-staged`; add `"lint-staged": { "*.{ts,tsx}": ["prettier --write", "eslint --fix"] }` to `package.json` in `.husky/pre-commit` and `package.json`
- [ ] T023 [US1] Run `npm run build`, `npm run lint`, `npm run type-check` and fix ALL errors/warnings in project-authored files until all three commands exit code 0 — fixes applied across `app/`, `components/`
- [ ] T024 [P] [US1] Write unit test confirming home page renders a `Button` element — `render(<Page />)` and `expect(screen.getByRole("button")).toBeInTheDocument()` using `@testing-library/react` in `__tests__/unit/home-page.test.tsx`

**Checkpoint**: `npm run build`, `npm run lint`, `npm run type-check` all exit 0. `npm run test` passes T024. Home page renders a styled Button. Pre-commit hook fires on `git commit`. US-001 independently verified.

---

## Phase 4: User Story 2 — Stable Data Schema (Priority: P1)

**Goal**: Prisma v7 schema with all 4 entities and 4 enums; initial migration applied to Neon; `lib/db.ts` singleton ready; `constants/idea-categories.ts` with Zod guard for FR-016.

**Independent Test**: With `DATABASE_URL` and `DIRECT_URL` set in `.env.local`, run `npx prisma migrate dev --name init` — exits 0, creates migration file under `prisma/migrations/`. Run `npx prisma studio` — four tables visible (`User`, `Idea`, `IdeaReview`, `VerificationToken`) with correct columns. Run `ideaCategorySchema.parse("Unknown Category")` in a test — throws `ZodError`.

- [ ] T025 [US2] Write `prisma/schema.prisma` — generator block: `provider = "prisma-client"`, `output = "../lib/generated/prisma"`; datasource block: `provider = "postgresql"` (no url/directUrl — moved to prisma.config.ts); 4 enums: `Role { SUBMITTER ADMIN SUPERADMIN }`, `IdeaStatus { SUBMITTED UNDER_REVIEW ACCEPTED REJECTED }`, `IdeaVisibility { PUBLIC PRIVATE }`, `ReviewDecision { ACCEPTED REJECTED }`; 4 models exactly as specified in data-model.md in `prisma/schema.prisma`
- [ ] T026 [US2] Write `prisma.config.ts` — `import 'dotenv/config'`; `defineConfig({ earlyAccess: true, schema: path.join(__dirname, "prisma/schema.prisma"), datasources: { db: { url: process.env.DATABASE_URL! } }, migrate: { async adapter(env) { const { PrismaPg } = await import("@prisma/adapter-pg"); return new PrismaPg({ connectionString: process.env.DIRECT_URL! }) } } })` in `prisma.config.ts`
- [ ] T027 [US2] Write `lib/db.ts` — import `PrismaClient` from `"../lib/generated/prisma"`; create `PrismaPg` adapter with `DATABASE_URL`; export singleton `db` using `globalForPrisma` pattern to prevent hot-reload connection exhaustion in Next.js dev in `lib/db.ts`
- [ ] T028 [US2] Write `constants/idea-categories.ts` — `IDEA_CATEGORIES` as-const tuple of 7 category strings; `IdeaCategory` type derived via `typeof IDEA_CATEGORIES[number]`; `ideaCategorySchema` as `z.enum(IDEA_CATEGORIES)` in `constants/idea-categories.ts`
- [ ] T029 [US2] Run `npx prisma migrate dev --name init` to create the initial migration — verifies Neon connection via `DIRECT_URL`; creates `prisma/migrations/[timestamp]_init/migration.sql` in `prisma/migrations/`
- [ ] T030 [US2] Run `npx prisma generate` to populate `lib/generated/prisma/` — remove `lib/.gitkeep` placeholder in `lib/generated/prisma/`
- [ ] T031 [P] [US2] Write Vitest unit tests for `constants/idea-categories.ts` — (1) all 7 values pass `ideaCategorySchema.parse()` without error; (2) `"Unknown Category"` throws `ZodError`; (3) empty string `""` throws `ZodError` in `__tests__/unit/idea-categories.test.ts`

**Checkpoint**: `prisma/migrations/` contains the init migration SQL. `lib/generated/prisma/` exists. `npm run test` passes T031. Prisma Studio shows all 4 tables. US-002 independently verified.

---

## Phase 5: User Story 3 — Deployment Confidence (Priority: P1)

**Goal**: `.env.example` documents all 13 variables with descriptions; `.env.local` is gitignored; `lib/env.ts` validates env vars at startup via Zod and names any missing variable; `proxy.ts` intercepts all routes when `PORTAL_ENABLED=false` and returns HTTP 503 HTML; Vercel auto-deploy pipeline live.

**Independent Test**: (1) Open `.env.example` — all 13 variables listed with comments, no real values. (2) Run `git ls-files --others --exclude-standard .env.local` — output empty (file is ignored). (3) Delete `DATABASE_URL` from `.env.local` and run `next dev` — app fails to start with a `ZodError` mentioning `DATABASE_URL`. (4) Set `PORTAL_ENABLED=false` and request any route — response status is 503 with HTML body. (5) Push to `main` and confirm Vercel deployment URL returns 200 within 60 seconds.

- [ ] T032 [US3] Write `.env.example` — all 13 variables from env.contract.md with inline comment describing each; placeholder values only (no real secrets); exact format from contracts/env.contract.md in `.env.example`
- [ ] T033 [P] [US3] Confirm `.env.local` is in `.gitignore` (should already be from T006); run `git check-ignore -v .env.local` and verify output confirms the rule in `.gitignore`
- [ ] T034 [US3] Write `lib/env.ts` — Zod `envSchema` with all 13 variables as defined in env.contract.md; call `envSchema.parse(process.env)` and export the result as `env`; if parse fails, the thrown `ZodError` details which variable is missing so startup fails with a clear, named error in `lib/env.ts`
- [ ] T035 [US3] Import `env` from `"@/lib/env"` in `app/layout.tsx` — a top-level import ensures Zod validation runs on every server render, failing fast if any variable is missing; keep `env` import as a side-effect call (`void env`) rather than embedding in JSX in `app/layout.tsx`
- [ ] T036 [US3] Write `proxy.ts` — Next.js 16 middleware (file must be named `proxy.ts` at repo root); read `process.env.PORTAL_ENABLED`; if value is `"false"`, return `new NextResponse("<html><body><h1>Service Unavailable</h1><p>InnovateEPAM Portal is temporarily offline for maintenance.</p></body></html>", { status: 503, headers: { "Content-Type": "text/html" } })`; matcher config: `{ matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] }` in `proxy.ts`
- [ ] T037 [US3] Connect GitHub repo `aykanugur/innovatepam-portal` to a new Vercel project; set all 13 environment variables for the Production environment in the Vercel dashboard; trigger first deploy and verify the production URL returns HTTP 200
- [ ] T038 [P] [US3] Write Vitest unit test for `lib/env.ts` — mock `process.env` without `DATABASE_URL`; call `envSchema.parse(process.env)`; assert that the thrown error is a `ZodError` and `error.issues[0].path` includes `"DATABASE_URL"` in `__tests__/unit/env-validation.test.ts`

**Checkpoint**: `.env.example` has 13 variables. `.env.local` is gitignored. `npm run test` passes T038. `PORTAL_ENABLED=false` returns 503 HTML. Vercel production URL returns 200 and auto-deploys on push. US-003 independently verified.

---

## Final Phase: Polish & Cross-Cutting

**Purpose**: Full quality gate pass across all three completed user stories; final commit.

- [ ] T039 Run `npm run build` from repo root — fix any interaction errors between T023 (lint fixes), T030 (generated Prisma client), T035 (env import in layout.tsx), T036 (proxy.ts) until exit code 0 with zero warnings in project-authored files
- [ ] T040 Run `npm run lint && npm run type-check` — fix any remaining ESLint or TypeScript issues in `app/`, `lib/`, `components/`, `constants/`, `proxy.ts` until both exit code 0
- [ ] T041 Run `npm run test:coverage` — all unit tests pass (T024, T031, T038); coverage ≥ 80% across lines, functions, branches, statements; fix any failing tests
- [ ] T042 Stage all changes with `git add -A`, commit with `git commit -m "feat(foundation): US-001 scaffold, US-002 schema, US-003 deploy — 001-foundation complete"`, push with `git push origin 001-foundation`

---

## Dependencies Graph

```
Phase 1 (T001–T010)
  └─ Phase 2 (T011–T013)
       ├─ Phase 3 US-001 (T014–T024)  ──────────────────────┐
       ├─ Phase 4 US-002 (T025–T031)  ────────────────────── Final (T039–T042)
       └─ Phase 5 US-003 (T032–T038)  ──────────────────────┘

Phase 3, Phase 4, Phase 5 are INDEPENDENT of each other after Phase 2.
```

**Story completion order** (all P1 — any order after Phase 2):
1. US-001 → clean build + design system (no external deps)
2. US-002 → requires Neon credentials in `.env.local`
3. US-003 → requires Vercel account access

---

## Parallel Execution Examples

### Within Phase 3 (US-001)
```
T019 (.prettierrc)  ─┐
T020 (.prettierignore)  ┤─ all parallel, different files
T024 (unit test)   ─┘
```

### Across US-002 and US-003 (after Phase 1+2)
```
T025–T031 (schema, migration, db.ts, categories)  ─┐
T032–T038 (env.example, env.ts, proxy.ts, Vercel)  ─┘  ← different agents/developers
```

---

## Implementation Strategy

**Suggested MVP scope**: US-001 only (T001–T024).

US-001 has no external dependencies (no Neon credentials, no Vercel account needed). It produces a fully passing build and is independently verifiable — it satisfies SC-001 (onboarding) and SC-002 (zero warnings) by itself.

**Increment 2**: US-002 (T025–T031) — requires only `.env.local` with Neon credentials.

**Increment 3**: US-003 (T032–T038) — requires Vercel account. Can be done last without blocking Increment 2.

**Format validation**: All 42 tasks follow `- [ ] T### [P?] [US#?] Description — file path` format. Phase 1+2 tasks have no story label (shared infrastructure). Polish phase tasks have no story label (cross-cutting). Every task includes an explicit file path.
