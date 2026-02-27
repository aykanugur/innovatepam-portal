# InnovatEPAM Portal

An internal EPAM employee innovation management platform. Employees submit ideas, admins evaluate them through a configurable multi-stage review pipeline, and results are tracked with analytics.

**Stack**: Next.js 15 (App Router) · TypeScript · Prisma 7 · PostgreSQL (Neon) · Auth.js v5 · Tailwind CSS v4 · shadcn/ui · Vercel

**Current version**: V2.0-dev (multi-stage review pipeline)  
**V1.0 tag**: `v1.0.0` — Phase 1 MVP complete

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in: DATABASE_URL, NEXTAUTH_SECRET, RESEND_API_KEY, BLOB_READ_WRITE_TOKEN

# 3. Run database migrations
npx prisma migrate dev

# 4. Seed the database (optional)
npx tsx prisma/seed.ts

# 5. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
innovatepam-portal/
│
├── app/                          # Next.js App Router — pages & API routes
│   ├── (auth)/                   # Route group — unauthenticated layout
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── verify-email/page.tsx
│   ├── (main)/                   # Route group — authenticated user layout
│   │   ├── ideas/                # /ideas — idea list + new + detail + edit
│   │   │   ├── page.tsx
│   │   │   ├── new/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── [id]/edit/page.tsx
│   │   └── my-ideas/page.tsx     # /my-ideas — user's own ideas + drafts
│   ├── admin/                    # Admin-only pages (ADMIN + SUPERADMIN)
│   │   ├── page.tsx              # /admin — dashboard + queue
│   │   ├── review/[id]/          # Review idea (stage view)
│   │   │   └── stage/[stageId]/  # Stage-level review
│   │   ├── resolve/[progressId]/ # Resolve escalation (SUPERADMIN)
│   │   ├── review-config/        # Pipeline config (SUPERADMIN)
│   │   ├── users/page.tsx        # User management (SUPERADMIN)
│   │   └── analytics/page.tsx    # Analytics dashboard
│   ├── api/                      # REST Route Handlers
│   │   ├── auth/                 # Auth.js + register + verify-email
│   │   ├── ideas/                # CRUD, upload, mine
│   │   ├── attachments/[id]/     # Attachment proxy/delete
│   │   ├── admin/users/          # Role management
│   │   ├── cron/expire-drafts/   # Vercel cron — auto-expire stale drafts
│   │   └── test/                 # Seed/cleanup (test environments only)
│   ├── dashboard/page.tsx        # Post-login redirect hub
│   ├── forbidden/page.tsx        # 403 error page
│   ├── settings/page.tsx         # User settings
│   ├── error.tsx                 # Global error boundary
│   ├── not-found.tsx             # 404 page
│   ├── layout.tsx                # Root layout (font, toaster, session)
│   └── globals.css               # Tailwind v4 base + CSS tokens
│
├── components/                   # React components
│   ├── admin/                    # Admin-specific UI (queue, stage panel, escalation)
│   ├── analytics/                # Chart components (Recharts-based)
│   ├── auth/                     # Login/register forms, role selector
│   ├── ideas/                    # Idea card, form, detail, draft UI, score section
│   ├── pipeline/                 # Pipeline config form, stage row
│   ├── settings/                 # Display name + password forms
│   └── ui/                       # shadcn/ui primitives (button, alert, tabs, etc.)
│
├── lib/                          # Server-side business logic
│   ├── actions/                  # All Next.js Server Actions
│   │   ├── claim-stage.ts        # ADMIN claims a pipeline stage
│   │   ├── complete-stage.ts     # ADMIN completes with PASS/REJECT/ESCALATE
│   │   ├── resolve-escalation.ts # SUPERADMIN resolves escalated stage
│   │   ├── pipeline-crud.ts      # SUPERADMIN pipeline CRUD
│   │   ├── create-idea.ts        # Submit or save new idea
│   │   ├── save-draft.ts         # Auto-save draft
│   │   ├── submit-draft.ts       # Promote DRAFT → SUBMITTED
│   │   ├── delete-draft.ts       # Delete a saved draft
│   │   ├── finalize-review.ts    # V1 review finalizer (legacy path)
│   │   ├── start-review.ts       # V1 claim review (legacy path)
│   │   ├── abandon-review.ts     # Abandon a claimed stage
│   │   ├── delete-idea.ts        # SUPERADMIN hard-delete
│   │   ├── scoring-analytics.ts  # Score aggregation for analytics
│   │   ├── update-user-role.ts   # SUPERADMIN role management
│   │   ├── update-display-name.ts
│   │   ├── update-password.ts
│   │   ├── login.ts / logout.ts
│   ├── state-machine/
│   │   └── idea-status.ts        # Pure idea status transition validator
│   ├── validations/              # Zod schemas (idea, pipeline, review, user, draft)
│   ├── generated/prisma/         # Prisma generated client (do not edit)
│   ├── auth-utils.ts             # hasRole() + session helpers
│   ├── blind-review.ts           # maskAuthorIfBlind() — EPIC-V2-05
│   ├── db.ts                     # Prisma client singleton
│   ├── email.ts                  # Resend email sender
│   ├── env.ts                    # Validated environment variables (Zod)
│   ├── rate-limit.ts             # Upstash rate limiter
│   ├── storage.ts                # Vercel Blob helpers
│   ├── api-error.ts              # Typed API error factory
│   └── utils.ts                  # cn() + general utilities
│
├── constants/                    # Static data constants
│   ├── categories.ts             # VALID_CATEGORY_SLUGS + labels (5 fixed categories)
│   ├── field-templates.ts        # Per-category dynamic form field definitions
│   ├── scoring-criteria.ts       # Scoring criteria tag options
│   ├── status-badges.ts          # IdeaStatus → badge variant mapping
│   └── allowed-mime-types.ts     # Attachment MIME type allowlist
│
├── types/                        # TypeScript type declarations
│   ├── field-template.ts         # FieldTemplate type (smart forms)
│   └── next-auth.d.ts            # Augmented Session/JWT types (role, id)
│
├── prisma/                       # Database
│   ├── schema.prisma             # Single source of truth for data model
│   ├── seed.ts                   # Dev seed (admin user + sample ideas)
│   └── migrations/               # All applied migrations (do not edit)
│       ├── 20260224111629_init/
│       ├── 20260224144215_add_idea_audit_log/
│       ├── 20260224170327_epic04_evaluation_workflow/
│       ├── 20260226072900_multi_media_attachments/
│       ├── 20260226180321_add_multi_stage_review/
│       ├── 20260226192945_add_blind_review_to_pipeline/    ← EPIC-V2-05
│       ├── 20260226200428_add_idea_score_model/
│       └── 20260226_draft_management/
│
├── scripts/                      # One-off admin scripts (run with tsx)
│   ├── promote-superadmin.ts     # Promote a user to SUPERADMIN by email
│   ├── create-user.ts            # Create a user programmatically
│   └── migrate-v1-attachments.ts # One-time migration of legacy attachment URLs
│
├── tests/                        # All automated tests
│   ├── unit/                     # Vitest unit tests (mocked DB)
│   │   ├── actions/              # Server action tests
│   │   ├── lib/                  # Utility tests (blind-review, etc.)
│   │   ├── state-machine.test.ts
│   │   ├── review-validation.test.ts
│   │   ├── user-validation.test.ts
│   │   ├── auth-utils.test.ts
│   │   └── env-validation.test.ts
│   ├── integration/              # Vitest integration tests (real DB)
│   │   ├── create-idea-dynamic.test.ts
│   │   └── review-workflow.test.ts
│   └── e2e/                      # Playwright end-to-end tests
│       ├── auth.spec.ts
│       ├── idea-submission.spec.ts
│       ├── review-workflow.spec.ts
│       ├── rbac.spec.ts
│       └── smart-forms.spec.ts
│
├── specs/                        # Product & feature specifications
│   ├── prd-innovatepam.md        # V1 Product Requirements Document
│   ├── epics/                    # V1 Epic files (EPIC-01 to EPIC-04)
│   ├── stories/                  # V1 User Stories (US-001 to US-016)
│   │   ├── epic-01/  (US-001–003)
│   │   ├── epic-02/  (US-004–007)
│   │   ├── epic-03/  (US-008–011)
│   │   └── epic-04/  (US-012–016)
│   ├── 001-foundation/           # V1 sprint spec (foundation)
│   ├── 001-auth-rbac/            # V1 sprint spec (auth + RBAC)
│   ├── 002-idea-submission/      # V1 sprint spec (idea submission)
│   ├── 003-evaluation-qa/        # V1 sprint spec (evaluation + QA)
│   └── v2.0/                     # ← V2.0 all specs live here
│       ├── prd-v2.0.md           # V2.0 PRD
│       ├── epics/                # V2 Epics (EPIC-V2-01 to V2-06)
│       ├── stories/              # V2 User Stories (US-017 to US-044)
│       │   ├── epic-v2-01/  (US-017–020) Smart Forms
│       │   ├── epic-v2-02/  (US-021–025) Multi-Media Attachments
│       │   ├── epic-v2-03/  (US-026–030) Draft Management
│       │   ├── epic-v2-04/  (US-031–035) Multi-Stage Review
│       │   ├── epic-v2-05/  (US-036–039) Blind Review ✅
│       │   └── epic-v2-06/  (US-040–044) Scoring System ⏳
│       ├── 001-smart-forms/      # Smart forms sprint spec
│       ├── 001-multi-media-attachments/
│       ├── 001-draft-management/
│       ├── 001-multi-stage-review/
│       ├── 001-blind-review/     # Blind review sprint spec (COMPLETE)
│       └── 001-idea-submission/  # V2 idea submission updates
│
├── memory-banks/                 # AI assistant context files (load before coding)
│   ├── README.md                 # Index — what to load and when
│   ├── architecture/overview.md  # System architecture, tech stack, ADRs
│   ├── conventions/coding-standards.md  # Naming, file structure, patterns
│   ├── domain/glossary.md        # Business terms, state machines, rules
│   ├── roles/rbac.md             # Full permission matrix
│   ├── specs/
│   │   ├── epic-01-spec.md       # V1 epic status + AC reference
│   │   └── epic-v2-spec.md       # V2 epic status tracker
│   └── workflows/development-process.md  # Branching, committing, deploying
│
├── public/                       # Static assets
│   ├── auth-video.mp4            # Login page background video
│   ├── auth-video-2.mp4
│   └── uploads/                  # Local dev attachment storage (gitignored content)
│
├── .specify/                     # GH SpecKit tooling (do not edit manually)
│   ├── memory/constitution.md    # Project governance document (highest authority)
│   ├── templates/                # Spec/plan/story/epic templates
│   └── scripts/                  # SpecKit automation scripts
│
├── auth.ts                       # Auth.js v5 configuration
├── proxy.ts                      # Auth.js middleware (route protection + RBAC)
├── next.config.ts                # Next.js configuration
├── prisma.config.ts              # Prisma client configuration
├── vercel.json                   # Vercel cron + deployment config
├── vitest.config.ts              # Test runner config + coverage scope
├── playwright.config.ts          # E2E test config
├── tsconfig.json                 # TypeScript strict config
├── components.json               # shadcn/ui registry config
├── postcss.config.mjs            # Tailwind v4 PostCSS config
├── eslint.config.mjs             # ESLint flat config
├── TEST-REPORT.md                # Latest test + coverage report
└── package.json
```

---

## Available Scripts

```bash
# Development
npm run dev           # Start dev server (http://localhost:3000)
npm run build         # Production build (TypeScript check + Next.js compile)
npm run start         # Run production build locally

# Code Quality
npm run lint          # ESLint check (zero warnings = CI pass)

# Testing
npm run test:unit        # Unit tests (Vitest, mocked DB)
npm run test:integration # Integration tests (Vitest, requires DB)
npm run test:watch       # Watch mode — unit tests (TDD RED/GREEN loop)
npm run test:coverage    # Full coverage report (≥80% threshold)
npm run test:e2e         # Playwright E2E tests (requires running server)
npm run test:ci          # Full CI gate: type-check + lint + unit + integration + coverage + build

# Database
npx prisma migrate dev          # Apply pending migrations (dev)
npx prisma migrate deploy       # Apply migrations (production)
npx prisma studio               # Open Prisma Studio (DB GUI)
npx tsx prisma/seed.ts          # Seed dev database

# Admin Scripts
npx tsx scripts/promote-superadmin.ts --email=you@epam.com
npx tsx scripts/create-user.ts
npx tsx scripts/migrate-v1-attachments.ts
```

---

## Environment Variables

Copy `.env.example` to `.env.local`. All required variables:

| Variable                             | Required | Description                                                  |
| ------------------------------------ | :------: | ------------------------------------------------------------ |
| `DATABASE_URL`                       |    ✅    | Neon PostgreSQL connection string (with `?sslmode=require`)  |
| `DIRECT_URL`                         |    ✅    | Non-pooled URL for Prisma migrations                         |
| `NEXTAUTH_SECRET`                    |    ✅    | 32+ character random secret for JWT signing                  |
| `NEXTAUTH_URL`                       |    ✅    | Full app URL (`http://localhost:3000` for dev)               |
| `RESEND_API_KEY`                     |    ✅    | Resend API key for email verification                        |
| `EMAIL_FROM`                         |    ✅    | Sender address (`noreply@yourdomain.com`)                    |
| `BLOB_READ_WRITE_TOKEN`              |    ✅    | Vercel Blob token for file attachments                       |
| `UPSTASH_REDIS_REST_URL`             | Optional | Rate limiting (falls back to in-memory if absent)            |
| `UPSTASH_REDIS_REST_TOKEN`           | Optional | Rate limiting                                                |
| `FEATURE_EMAIL_VERIFICATION_ENABLED` | Optional | `'true'` to require email verification (default: `'false'`)  |
| `FEATURE_FILE_ATTACHMENT_ENABLED`    | Optional | `'true'` to enable file uploads (default: `'false'`)         |
| `FEATURE_MULTI_STAGE_REVIEW_ENABLED` | Optional | `'true'` to enable V2 pipeline (default: `'false'`)          |
| `FEATURE_BLIND_REVIEW_ENABLED`       | Optional | `'true'` to enable blind review masking (default: `'false'`) |
| `CRON_SECRET`                        | Optional | Bearer token for Vercel cron job authentication              |

---

## Data Model — Key Entities

```
User ──┬──< Idea ──┬──< IdeaAttachment
       │            ├──< IdeaStageProgress >──── PipelineStage >── ReviewPipeline
       │            ├──< IdeaScore
       │            └──── IdeaReview (V1 legacy)
       └──< AuditLog
```

| Model                   | Purpose                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `User`                  | Registered EPAM employee with `role: USER/ADMIN/SUPERADMIN`     |
| `Idea`                  | Innovation submission; `status` follows state machine lifecycle |
| `IdeaAttachment`        | One or many files attached to an idea (Vercel Blob URLs)        |
| `IdeaReview`            | V1 single-reviewer decision record                              |
| `ReviewPipeline`        | SUPERADMIN-configured named pipeline per category               |
| `PipelineStage`         | Ordered stage within a pipeline; one is `isDecisionStage`       |
| `IdeaStageProgress`     | Per-idea per-stage reviewer assignment + outcome                |
| `IdeaScore`             | 1–5 star score assigned at decision stage (EPIC-V2-06)          |
| `AuditLog`              | Immutable record of all state transitions                       |
| `VerificationToken`     | Email verification tokens                                       |
| `CategoryFieldTemplate` | Dynamic form field config per category (smart forms)            |

### Idea Status State Machine

```
DRAFT ──► SUBMITTED ──► UNDER_REVIEW ──► ACCEPTED
                                      └──► REJECTED
```

---

## Feature Flags

All flags default to `'false'`. Set to `'true'` in `.env.local` to enable:

| Flag                                 | Feature                                 |
| ------------------------------------ | --------------------------------------- |
| `FEATURE_EMAIL_VERIFICATION_ENABLED` | Require email verification before login |
| `FEATURE_FILE_ATTACHMENT_ENABLED`    | Allow file uploads on idea submission   |
| `FEATURE_MULTI_STAGE_REVIEW_ENABLED` | Enable V2 multi-stage pipeline          |
| `FEATURE_BLIND_REVIEW_ENABLED`       | Enable author masking during review     |

---

## Architecture

See [memory-banks/architecture/overview.md](memory-banks/architecture/overview.md) for full details.

**Pattern**: Full-stack Next.js monolith deployed serverless on Vercel.

- Pages and data fetching → React Server Components (RSC)
- Mutations → Server Actions (no separate API layer needed)
- Auth → Auth.js v5 with `proxy.ts` middleware
- DB access → Prisma ORM (never from client)
- Validation → Zod schemas (shared client + server)

---

## Testing

See [TEST-REPORT.md](TEST-REPORT.md) for the latest test run results.

| Suite       | Location             | How to run                 | DB required? |
| ----------- | -------------------- | -------------------------- | ------------ |
| Unit        | `tests/unit/`        | `npm run test:unit`        | No           |
| Integration | `tests/integration/` | `npm run test:integration` | Yes (Neon)   |
| E2E         | `tests/e2e/`         | `npm run test:e2e`         | Yes + server |
| Watch (TDD) | `tests/unit/`        | `npm run test:watch`       | No           |
| CI gate     | all                  | `npm run test:ci`          | Yes          |

Coverage threshold: **≥80%** on statements, branches, functions, lines.  
Coverage scope: `lib/state-machine/**`, `lib/validations/**`, `lib/auth-utils.ts`, `lib/actions/pipeline-crud.ts`, `lib/actions/claim-stage.ts`, `lib/actions/complete-stage.ts`, `lib/actions/resolve-escalation.ts`, `lib/blind-review.ts`

---

## V2.0 Roadmap

| Epic       | Feature                               | Status                  |
| ---------- | ------------------------------------- | ----------------------- |
| EPIC-V2-01 | Smart Forms (dynamic category fields) | ✅ Complete             |
| EPIC-V2-02 | Multi-Media Attachments               | ✅ Complete             |
| EPIC-V2-03 | Draft Management                      | ✅ Complete             |
| EPIC-V2-04 | Multi-Stage Review Pipeline           | ✅ Complete             |
| EPIC-V2-05 | Blind Review                          | ✅ Complete (`3e0a7ce`) |
| EPIC-V2-06 | Scoring System                        | ⏳ Not started          |

---

## Key Files Reference

| File                                                                 | Purpose                                          |
| -------------------------------------------------------------------- | ------------------------------------------------ |
| [.specify/memory/constitution.md](.specify/memory/constitution.md)   | **Highest authority** — project governance rules |
| [memory-banks/README.md](memory-banks/README.md)                     | AI context loading guide                         |
| [specs/prd-innovatepam.md](specs/prd-innovatepam.md)                 | V1 Product Requirements                          |
| [specs/v2.0/prd-v2.0.md](specs/v2.0/prd-v2.0.md)                     | V2.0 Product Requirements                        |
| [prisma/schema.prisma](prisma/schema.prisma)                         | Database schema (source of truth)                |
| [lib/blind-review.ts](lib/blind-review.ts)                           | Blind review masking utility                     |
| [lib/state-machine/idea-status.ts](lib/state-machine/idea-status.ts) | Idea status transition rules                     |
| [proxy.ts](proxy.ts)                                                 | Route protection + RBAC middleware               |
| [auth.ts](auth.ts)                                                   | Auth.js v5 config                                |
| [lib/env.ts](lib/env.ts)                                             | Validated env vars                               |
| [TEST-REPORT.md](TEST-REPORT.md)                                     | Test results                                     |

---

_InnovatEPAM Portal — Built for EPAM employees to submit and track innovation ideas._  
_Last updated: 2026-02-27 | v2.0-dev_
