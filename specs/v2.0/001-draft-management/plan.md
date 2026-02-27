# Implementation Plan: Draft Management

**Branch**: `001-draft-management` | **Date**: 2026-02-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/001-draft-management/spec.md`

## Summary

Add a `DRAFT` status to the idea lifecycle so any authenticated user can save a partially completed idea form server-side and return to it later. Includes: Prisma schema migration (new `DRAFT` enum value, `isExpiredDraft` boolean, `draftExpiresAt` timestamp, nullable title/description/category); state machine extension (`DRAFT → SUBMITTED`); new `saveDraft` Server Action; `/my-ideas` redesign with shadcn/ui `Tabs`; `/ideas/[id]/edit` route for draft resume; `GET /api/cron/expire-drafts` route handler; localStorage 60-second auto-save with restore-prompt; dedicated rate limiter (30/15 min); feature flag `FEATURE_DRAFT_ENABLED`.

## Technical Context

**Language/Version**: TypeScript 5.4, Node.js 22  
**Primary Dependencies**: Next.js 16 (App Router, Turbopack), React 19, Prisma v7, Auth.js v5, shadcn/ui (Radix UI), Tailwind CSS v4, Zod, @upstash/ratelimit (in-memory fallback active — no Redis)  
**Storage**: Neon PostgreSQL (TLS, `sslmode=require`); Prisma client output at `lib/generated/prisma`; no Redis in current env (in-memory rate limiter)  
**Testing**: Vitest (unit + integration), Playwright (E2E)  
**Target Platform**: Vercel (Next.js deployment); Vercel Cron for expiry job  
**Project Type**: Web application — full-stack Next.js (server components, server actions, route handlers)  
**Performance Goals**: Save-draft round-trip ≤ 3 s (SC-003); 0 draft ideas in admin queue  
**Constraints**: DB migrations cannot use `prisma migrate deploy` via CLI (Rust TLS / OpenSSL 3.6.1 incompatibility) — SQL must be applied manually via Neon dashboard SQL editor; in-memory rate limiter is process-scoped (single-instance only — acceptable for current alpha)  
**Scale/Scope**: Single-tenant alpha, ~50 users, ≤ 500 active drafts total

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

> The project constitution at `.specify/memory/constitution.md` contains no active principles (all template placeholders). No gates are derived from it.
>
> **Project-level conventions applied instead** (from `memory-banks/` and prior epic patterns):
>
> | Convention                                                              | Status | Notes                                                        |
> | ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
> | State machine is the sole transition enforcer (`lib/state-machine/`)    | PASS   | Will extend `idea-status.ts` — not bypass it                 |
> | Prisma migrations applied manually via Neon SQL editor                  | PASS   | CLI migrate deploy blocked by OpenSSL 3.6.1                  |
> | Feature flags in `lib/env.ts` via Zod `.default('false')`               | PASS   | `FEATURE_DRAFT_ENABLED` follows exact pattern                |
> | Rate limiting via `lib/rate-limit.ts` factory                           | PASS   | New `createDraftSaveLimiter()` export added to existing file |
> | Server Actions in `lib/actions/`                                        | PASS   | `save-draft.ts`, `delete-draft.ts` follow prior pattern      |
> | All authenticated routes use `auth()` session check + redirect          | PASS   | Edit route and cron route both gated                         |
> | shadcn/ui components only — no raw HTML interactive elements            | PASS   | Tabs, AlertDialog, Badge, Button from existing component set |
> | No TypeScript `any` — exhaustive switch with `default: satisfies never` | PASS   | State machine default clause maintained                      |
>
> **Result**: PASS — no violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-draft-management/
├── plan.md              ✓ this file
├── research.md          Phase 0 output
├── data-model.md        Phase 1 output
├── quickstart.md        Phase 1 output
├── contracts/
│   ├── save-draft.md    Phase 1 output
│   └── expire-cron.md   Phase 1 output
└── tasks.md             Phase 2 output (/speckit.tasks — not created here)
```

### Source Code (repository root — `innovatepam-portal/`)

```text
prisma/
├── schema.prisma                          MODIFY — add DRAFT enum value, isExpiredDraft, draftExpiresAt, make title/description/category nullable
└── migrations/
    └── 20260226_draft_management/
        └── migration.sql                  NEW — manual apply via Neon SQL editor

lib/
├── state-machine/
│   └── idea-status.ts                     MODIFY — add DRAFT to IdeaStatus type, add SUBMIT ReviewAction, extend transition()
├── actions/
│   ├── save-draft.ts                      NEW — upsert draft, enforce 10-limit, reset draftExpiresAt
│   └── delete-draft.ts                    NEW — author-only permanent delete
├── validations/
│   └── draft.ts                           NEW — SaveDraftSchema (title ≤ 150, description ≤ 5000, lengths only)
├── env.ts                                 MODIFY — add FEATURE_DRAFT_ENABLED, CRON_SECRET
└── rate-limit.ts                          MODIFY — add createDraftSaveLimiter() (30/15 min)

app/
├── (main)/
│   ├── my-ideas/
│   │   └── page.tsx                       MODIFY — redesign with shadcn/ui Tabs (Submitted | Drafts)
│   └── ideas/
│       └── [id]/
│           └── edit/
│               └── page.tsx               NEW — author-only draft resume form (pre-populated)
└── api/
    └── cron/
        └── expire-drafts/
            └── route.ts                   NEW — GET handler, CRON_SECRET auth, soft + hard delete, structured log

components/
├── ideas/
│   ├── idea-form.tsx                      MODIFY — add "Save Draft" button, loading state, localStorage auto-save, expiry warning banner
│   └── drafts-tab.tsx                     NEW — draft list, row, badge, Resume/Delete actions
└── ui/
    └── (shadcn components already present — Tabs, AlertDialog, Badge)

vercel.json                                NEW (or MODIFY) — add "crons" entry for expire-drafts

types/
└── next-auth.d.ts                         CHECK — no change expected (session type already has id, role)
```

**Structure Decision**: Single Next.js project (Option 2 from template — web application). All new code lives within `innovatepam-portal/`. No new packages or monorepo changes.

## Complexity Tracking

> No constitution violations requiring justification. Standard project patterns apply throughout.
