# Quickstart: Evaluation Workflow, Admin Tools & Quality Gate

**Feature**: `003-evaluation-qa` | **Date**: 2026-02-24

---

## Prerequisites

- Node.js 20+, npm
- PostgreSQL via Neon (local `.env.local` configured)
- Active session on branch `003-evaluation-qa`

---

## 1. Apply the Database Migration

```bash
cd innovatepam-portal

# Creates migration file + applies to local DB
npx prisma migrate dev --name epic04_evaluation_workflow
```

This migration:

- Makes `IdeaReview.decision` and `IdeaReview.comment` nullable
- Adds `IdeaReview.startedAt` (default `now()`) and `IdeaReview.decidedAt` (nullable)
- Adds `IDEA_REVIEW_STARTED`, `IDEA_REVIEWED`, `IDEA_REVIEW_ABANDONED` to `AuditAction` enum

Verify:

```bash
npx prisma studio
# Open IdeaReview table — confirm new columns shown
```

---

## 2. Re-generate the Prisma Client

```bash
npx prisma generate
```

Confirm `lib/generated/prisma/` is updated and `IdeaReview.decision` is now typed as `ReviewDecision | null`.

---

## 3. Seed Test Data

```bash
npm run db:seed
```

The seeder creates:

- 1 SUPERADMIN user (`SUPERADMIN_EMAIL` from `.env.local`)
- 1 ADMIN user (`admin@innovatepam.test` / `AdminPass1`)
- 3 SUBMITTER users
- Ideas in all statuses: `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`

To verify the review workflow end-to-end in the browser:

1. Log in as the ADMIN user
2. Navigate to `/admin` — confirm stat cards and pending queue
3. Click "Review" on a `SUBMITTED` idea
4. Click "Start Review" — verify status changes to `UNDER_REVIEW`
5. Enter a comment (≥ 10 chars), click "Accept" or "Reject"
6. Verify read-only decision card appears; log in as submitter and verify `/ideas/<id>` shows the decision

---

## 4. Run the Development Server

```bash
npm run dev
```

New routes available:
| URL | Auth | Role | Story |
|-----|------|------|-------|
| `/admin` | ✅ | ADMIN+ | US-013 |
| `/admin/review/<ideaId>` | ✅ | ADMIN+ | US-012 |
| `/admin/analytics` | ✅ | SUPERADMIN | US-014 (P3, flag-gated) |
| `/settings` | ✅ | Any | US-015 |

---

## 5. Run Unit Tests

```bash
npm run test:unit
# or with watch:
npm run test -- --watch
```

New unit test files:

- `__tests__/unit/state-machine.test.ts` — pure function coverage for all transitions
- `__tests__/unit/review-validation.test.ts` — Zod schema boundary tests
- `__tests__/unit/user-validation.test.ts` — display name + password schemas

---

## 6. Run Full Coverage Report

```bash
npm run test:coverage
```

Target: ≥ 80% across all four metrics (lines, branches, functions, statements). Coverage excludes `lib/generated/**`, `lib/db.ts`, `app/layout.tsx`, `components/ui/**`.

If coverage drops below 80%, check:

- New Server Actions in `lib/actions/` have corresponding unit or integration tests
- `lib/state-machine/idea-status.ts` is fully covered (all error branches)

---

## 7. Run E2E Tests

```bash
# Start dev server first (or let Playwright start it automatically):
npm run test:e2e
```

Four critical-path specs (all must pass before GA):
| Spec file | Path covered |
|-----------|-------------|
| `__tests__/e2e/auth.spec.ts` | Register → login → land on `/ideas` |
| `__tests__/e2e/idea-submission.spec.ts` | Submit idea → appears in idea list |
| `__tests__/e2e/review-workflow.spec.ts` | Admin starts review → accepts → submitter sees decision |
| `__tests__/e2e/rbac.spec.ts` | Submitter attempts admin action → access denied |

---

## 8. Type-Check and Lint

```bash
npm run type-check    # must be 0 errors
npm run lint          # must be 0 warnings (--max-warnings 0)
```

---

## 9. CI Pipeline (GitHub Actions)

The CI pipeline runs on every push:

```
lint → type-check → test:coverage (≥80% gate) → build
```

> **Important**: The CI was updated for this epic to run `npm run test:coverage` (not `test:unit`) so the 80% gate blocks failed deployments.

---

## Common Issues

| Issue                                                  | Fix                                                                  |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| `P2002 Unique constraint failed on IdeaReview.ideaId`  | Idea already under review — expected concurrency guard behaviour     |
| `IdeaReview.decision` TypeScript error after migration | Run `npx prisma generate` to refresh the client                      |
| Coverage below 80%                                     | Check untested branches in `lib/state-machine/idea-status.ts`        |
| E2E tests hang                                         | Check `npm run dev` is running on port 3000 before Playwright starts |
| Abandon Review button not visible                      | Confirm logged-in user role is `SUPERADMIN`                          |
