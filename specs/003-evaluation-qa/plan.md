# Implementation Plan: Evaluation Workflow, Admin Tools & Quality Gate

**Branch**: `003-evaluation-qa` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/003-evaluation-qa/spec.md` (EPIC-04, US-012/013/014/015/016)

## Summary

Close the InnovatEPAM Portal innovation loop by (1) giving ADMIN users a structured Start Review → Accept/Reject workflow with mandatory comment and full audit trail; (2) providing a live admin dashboard showing pipeline counts and a pending-review queue; (3) implementing a SUPERADMIN "Abandon Review" escape hatch that resets stuck `UNDER_REVIEW` ideas; (4) adding profile/settings management (display name + password change, P2); (5) adding a SUPERADMIN analytics page (P3, flag-gated); and (6) writing the full test suite (unit, integration, E2E) to hit ≥ 80% coverage across all four Vitest thresholds. GA deployment is gated on all tests passing.

Technical approach: Prisma migration making `IdeaReview.decision`/`comment` nullable + adding `startedAt`/`decidedAt` timestamps + three new `AuditAction` enum values → pure state-machine function at `lib/state-machine/idea-status.ts` → five new Server Actions (start-review, finalize-review, abandon-review, update-display-name, update-password) → new RSC pages at `/admin/review/[id]`, `/settings`, `/admin/analytics` → `revalidatePath` for live dashboard freshness → Vitest unit + integration tests + four Playwright E2E critical-path tests.

## Technical Context

**Language/Version**: TypeScript 5.4+ / Node.js 20.9+
**Primary Dependencies**: Next.js 16 (App Router), React 19, Auth.js v5, Prisma v7.4.1 (`@prisma/adapter-pg`), Zod 3, Tailwind v4, shadcn/ui, Vitest 2, Playwright 1.50, `@upstash/ratelimit`, `@vercel/blob`
**Storage**: PostgreSQL via Neon — `DATABASE_URL` (pooled, PgBouncer) + `DIRECT_URL` (non-pooled for Prisma CLI migrations)
**Testing**: Vitest v2 (unit + integration, jsdom, ≥80% lines/branches/functions/statements) + Playwright (E2E, chromium, 4 critical paths)
**Target Platform**: Vercel (serverless, auto-deploy from `main` branch)
**Project Type**: Full-stack web application (Next.js monolith)
**Performance Goals**: Review page load < 2s P95; admin dashboard load < 2s P95
**Constraints**: Zero TypeScript errors, zero ESLint warnings, zero test failures before GA; coverage ≥ 80%; all state transitions validated by pure state-machine function before DB writes
**Scale/Scope**: Alpha — < 50 internal EPAM admins, < 500 ideas at launch

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

_Constitution is a placeholder template (no project-specific rules ratified). Standard quality bars applied: TypeScript strict, Zod validation at all boundaries, Vitest unit tests, 80% coverage gate, Playwright E2E for all happy paths._

### Pre-Design Gates

| Gate                                 | Status  | Notes                                                                                         |
| ------------------------------------ | ------- | --------------------------------------------------------------------------------------------- |
| Simplest possible approach           | ✅ PASS | Stays within the existing Next.js monolith; no new services, no new packages                  |
| Uses only approved stack             | ✅ PASS | All packages already in `package.json`; zero new dependencies                                 |
| Input validation at all boundaries   | ✅ PASS | `lib/validations/review.ts` and `lib/validations/user.ts` (Zod) used in every Server Action   |
| State machine is pure + testable     | ✅ PASS | `lib/state-machine/idea-status.ts` has no side effects; unit-tested exhaustively              |
| Audit logging on all state mutations | ✅ PASS | All three review events written inside the same `$transaction` as the state change            |
| Feature flag isolation (analytics)   | ✅ PASS | `FEATURE_ANALYTICS_ENABLED` gate via `notFound()` at page entry point                         |
| Self-review prevention at all layers | ✅ PASS | UI hides buttons + Server Action re-checks; defence-in-depth                                  |
| Schema migration additive-only       | ✅ PASS | Two columns made nullable (non-destructive), two added with defaults, three enum values added |

### Post-Design Re-check (Phase 1)

| Gate                                        | Status  | Notes                                                                                           |
| ------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| `IdeaReview` two-step creation matches spec | ✅ PASS | `decision?`/`comment?` nullable; `startedAt` defaults now; `decidedAt` nullable until finalized |
| `AuditAction` enum extended cleanly         | ✅ PASS | Three new values; `ALTER TYPE ADD VALUE` is non-destructive in Postgres 12+                     |
| Concurrency guard confirmed                 | ✅ PASS | `IdeaReview.ideaId @unique` + in-transaction `findUnique` pre-check (R-005)                     |
| Coverage config unchanged                   | ✅ PASS | `vitest.config.ts` thresholds and exclusions verified; no new paths need excluding              |
| `revalidatePath` called correctly           | ✅ PASS | `/admin` + `/ideas/<id>` revalidated at end of every review mutation action                     |

## Project Structure

### Documentation (this feature)

```text
specs/003-evaluation-qa/
├── spec.md          ✅ Feature specification (with 5 clarifications baked in)
├── plan.md          ✅ This file
├── research.md      ✅ Phase 0 output — 8 resolved decisions
├── data-model.md    ✅ Phase 1 output — schema changes + state machine
├── quickstart.md    ✅ Phase 1 output — local dev + test runbook
├── contracts/
│   └── review.md    ✅ Phase 1 output — 5 Server Action contracts
└── tasks.md         ❌ Phase 2 output (speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
innovatepam-portal/
│
├── prisma/
│   ├── schema.prisma                            # MODIFIED: IdeaReview + AuditAction changes
│   └── migrations/
│       └── 20260224000000_epic04_evaluation_workflow/
│           └── migration.sql                    # NEW: additive migration
│
├── lib/
│   ├── state-machine/
│   │   └── idea-status.ts                       # NEW: pure transition fn + error types
│   ├── actions/
│   │   ├── start-review.ts                      # NEW: SUBMITTED → UNDER_REVIEW
│   │   ├── finalize-review.ts                   # NEW: UNDER_REVIEW → ACCEPTED/REJECTED
│   │   ├── abandon-review.ts                    # NEW: UNDER_REVIEW → SUBMITTED (SUPERADMIN)
│   │   ├── update-display-name.ts               # NEW: User.displayName (US-015)
│   │   └── update-password.ts                   # NEW: User.passwordHash (US-015)
│   └── validations/
│       ├── review.ts                            # NEW: FinalizeReviewSchema
│       └── user.ts                              # NEW: DisplayNameSchema, ChangePasswordSchema
│
├── app/
│   ├── admin/
│   │   ├── page.tsx                             # MODIFIED: full live-count dashboard (US-013)
│   │   ├── review/
│   │   │   └── [id]/
│   │   │       └── page.tsx                     # NEW: review workflow page (US-012)
│   │   └── analytics/
│   │       └── page.tsx                         # NEW: analytics (US-014, P3, flag-gated)
│   └── settings/
│       └── page.tsx                             # NEW: profile + password (US-015)
│
├── components/
│   ├── admin/
│   │   ├── review-action-panel.tsx              # NEW: Start Review / Accept / Reject
│   │   ├── decision-card.tsx                    # NEW: read-only outcome after finalize
│   │   ├── abandon-review-button.tsx            # NEW: SUPERADMIN-only reset
│   │   ├── dashboard-stats.tsx                  # NEW: stat cards
│   │   └── pending-queue.tsx                    # NEW: oldest-first SUBMITTED table
│   ├── settings/
│   │   ├── display-name-form.tsx                # NEW: US-015 name form
│   │   └── password-change-form.tsx             # NEW: US-015 password form
│   └── analytics/
│       ├── ideas-by-category-chart.tsx          # NEW (P3): bar chart
│       ├── submission-trend-chart.tsx           # NEW (P3): line chart
│       └── top-contributors-table.tsx          # NEW (P3): leaderboard
│
├── __tests__/
│   ├── unit/
│   │   ├── state-machine.test.ts                # NEW: all transition + error paths
│   │   ├── review-validation.test.ts            # NEW: FinalizeReviewSchema boundary tests
│   │   └── user-validation.test.ts              # NEW: DisplayName + ChangePassword schemas
│   ├── integration/
│   │   └── review-workflow.test.ts              # NEW: DB-level action tests
│   └── e2e/
│       ├── helpers/
│       │   ├── auth.ts                          # NEW: shared login helpers
│       │   └── seed.ts                          # NEW: per-spec seed/cleanup
│       ├── auth.spec.ts                         # NEW: path (a) register → login → /ideas
│       ├── idea-submission.spec.ts              # NEW: path (b) submit → appears in list
│       ├── review-workflow.spec.ts              # NEW: path (c) admin review → decision
│       └── rbac.spec.ts                         # NEW: path (d) submitter → access denied
│
├── app/api/
│   └── test/
│       ├── seed/route.ts                        # NEW: test-only seed endpoint
│       └── cleanup/route.ts                     # NEW: test-only cleanup endpoint
│
└── proxy.ts                                     # MODIFIED: add /settings to isProtected
```

**Structure Decision**: Stays within the existing Next.js App Router monolith. No new packages, no new services. All new Server Actions follow the `lib/actions/` pattern (auth → validate → state machine → DB transaction → revalidate → return). Admin-facing components isolated under `components/admin/`.

## Open Decisions (resolved in research.md)

| Item                                             | Research ref | Decision                                                            |
| ------------------------------------------------ | ------------ | ------------------------------------------------------------------- |
| IdeaReview schema (nullable fields + timestamps) | R-001        | `decision?`, `comment?`, add `startedAt`, `decidedAt`               |
| AuditAction enum extensions                      | R-002        | Three additive values; metadata shapes defined in data-model.md     |
| State machine implementation                     | R-003        | Pure function at `lib/state-machine/idea-status.ts`                 |
| Dashboard freshness mechanism                    | R-004        | `revalidatePath('/admin')` at end of each review Server Action      |
| Concurrency guard                                | R-005        | `IdeaReview.ideaId @unique` + in-transaction `findUnique` pre-check |
| Proxy route protection for `/settings`           | R-006        | Add `/settings` to `isProtected` in `proxy.ts`                      |
| Coverage gate CI                                 | R-007        | Update CI to run `npm run test:coverage` (not `test:unit`)          |
| E2E seed/cleanup strategy                        | R-008        | Test-only API routes guarded by `NODE_ENV === 'test'`               |

## Complexity Tracking

No constitution violations. No added complexity beyond linear feature scope.
