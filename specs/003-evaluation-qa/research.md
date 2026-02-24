# Phase 0 Research: Evaluation Workflow, Admin Tools & Quality Gate

**Feature**: `003-evaluation-qa` | **Date**: 2026-02-24  
**Resolved NEEDS CLARIFICATIONs**: 8 of 8

---

## R-001 — IdeaReview Schema Migration

**Question**: The current `IdeaReview` model has `decision ReviewDecision` (NOT NULL) and `comment String` (NOT NULL). The spec requires a two-step creation — row created at Start Review with no decision, updated in-place at finalization. Does the schema need to change?

**Decision**: Yes — two required migrations in a single Prisma migration file:

1. Make `IdeaReview.decision` optional (`ReviewDecision?`)
2. Make `IdeaReview.comment` optional (`String?`)
3. Add `IdeaReview.startedAt DateTime @default(now())` — timestamp when review was opened
4. Add `IdeaReview.decidedAt DateTime?` — null until finalized

**Rationale**: The spec explicitly requires the two-step model (Clarification Q3). Making fields nullable is the minimal schema change. Adding `startedAt` / `decidedAt` enables the "how long was the idea under review" calculation needed for future analytics and makes the read-only decision card complete.

**Migration strategy**: Single `prisma migrate dev` creating file `20260224_epic04_evaluation.sql`. Additive-only (no column drops, no renames) — rollback safe per ADR.

**Alternatives considered**:

- Separate `ReviewDraft` + `ReviewDecision` tables (two-table split) → rejected: unnecessary complexity; in-place update is simpler and transactionally correct.
- Keep decision NOT NULL, create a dummy `PENDING` enum value → rejected: pollutes `ReviewDecision` enum; confusing in type system.

---

## R-002 — AuditAction Enum Additions

**Question**: The current `AuditAction` enum has `IDEA_CREATED` and `IDEA_DELETED` only. Three new values are required. How are they added without breaking the existing audit pattern?

**Decision**: Add to the same `AuditAction` enum in one migration:

```
IDEA_REVIEW_STARTED  // fired when admin clicks Start Review
IDEA_REVIEWED        // fired when admin Accept/Reject decision is finalized
IDEA_REVIEW_ABANDONED // fired when SUPERADMIN resets UNDER_REVIEW → SUBMITTED
```

**AuditLog metadata field shapes (canonical)**:

| Action                  | Metadata fields                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `IDEA_REVIEW_STARTED`   | `{ ideaId: string, reviewerId: string, reviewerDisplayName: string }`                                |
| `IDEA_REVIEWED`         | `{ ideaId: string, reviewerId: string, decision: "ACCEPTED" \| "REJECTED", commentSummary: string }` |
| `IDEA_REVIEW_ABANDONED` | `{ ideaId: string, originalReviewerId: string, abandonedByAdminId: string }`                         |

`commentSummary` = first 100 characters of the comment (trimmed).

**Rationale**: Additive enum value — PostgreSQL ALTER TYPE ADD VALUE is safe and non-breaking. The existing `AuditLog.metadata: Json?` column already accepts arbitrary shapes — no column change needed.

---

## R-003 — State Machine Implementation Pattern

**Question**: How should the `SUBMITTED → UNDER_REVIEW → ACCEPTED/REJECTED` state machine be implemented such that it is (a) pure/testable, (b) reused across Server Actions, and (c) easily extended for the `UNDER_REVIEW → SUBMITTED` Abandon path?

**Decision**: Create `lib/state-machine/idea-status.ts` as a pure, side-effect-free module.

```typescript
// Full state transition table — source of truth
type IdeaStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED'
type ReviewAction = 'START_REVIEW' | 'ACCEPT' | 'REJECT' | 'ABANDON'

// Returns new status or throws a typed error
function transition(current: IdeaStatus, action: ReviewAction, actorRole: string): IdeaStatus
```

Permitted transitions:
| Current | Action | Required role | Next |
|---------|--------|--------------|------|
| `SUBMITTED` | `START_REVIEW` | ADMIN or SUPERADMIN | `UNDER_REVIEW` |
| `UNDER_REVIEW` | `ACCEPT` | ADMIN or SUPERADMIN | `ACCEPTED` |
| `UNDER_REVIEW` | `REJECT` | ADMIN or SUPERADMIN | `REJECTED` |
| `UNDER_REVIEW` | `ABANDON` | SUPERADMIN only | `SUBMITTED` |
| any finalized | any | any | → throws `AlreadyReviewedError` |

The function is exported and imported by each Server Action. Server Actions call `transition()` first (throws on invalid), then execute DB writes inside `prisma.$transaction()`.

**Rationale**: Pure function is trivially unit-testable without DB mocks. Centralizing the table eliminates the risk of per-action drift. Matching the spec's "state machine" key entity exactly.

**Alternatives considered**:

- State machine inside Prisma middleware → rejected: hidden, untestable, couples DB to business logic.
- Per-action guard clauses (no shared function) → rejected: duplicates the transition table; risk of inconsistency.

---

## R-004 — Dashboard Freshness Mechanism

**Question**: FR-013 requires stat counts and the pending queue to reflect state after any review action "without requiring a manual reload." The spec is silent on the mechanism. How should this be implemented?

**Decision**: Use Next.js `revalidatePath` called at the end of each Server Action that mutates idea status.

```typescript
// End of startReview, finalizeReview, abandonReview actions:
revalidatePath('/admin')
revalidatePath(`/ideas/${ideaId}`)
```

The `/admin` page is a React Server Component with `cache: 'no-store'` — on next navigation the fresh query runs. Combined with `revalidatePath`, any client that re-renders after the action sees the updated counts.

**Rationale**: `revalidatePath` is the idiomatic Next.js 15/16 mechanism for on-demand cache invalidation after mutations. No WebSocket, polling, or SWR needed for an internal employee portal with low concurrency.

**Alternatives considered**:

- Polling (`setInterval` fetch every N seconds) → rejected: unnecessary network traffic; over-engineered for this scale.
- React Server Component streaming with `<Suspense>` refresh → rejected: adds client complexity without benefit.
- SWR / React Query client-side → rejected: the admin dashboard is SSR-first; adding a client data layer contradicts the RSC architecture.

---

## R-005 — Two-Step IdeaReview Creation Pattern (Concurrency Guard)

**Question**: The spec requires creating the `IdeaReview` row at Start Review with no decision. How does the concurrency guard work if two admins click Start Review simultaneously?

**Decision**: Use a unique constraint + `prisma.$transaction` + `createOrThrow` pattern:

```typescript
// In startReviewAction:
await db.$transaction(async (tx) => {
  // 1. Check that no IdeaReview row exists yet (guard)
  const existing = await tx.ideaReview.findUnique({ where: { ideaId } })
  if (existing) throw new IdeaAlreadyUnderReviewError()

  // 2. Create the review stub
  await tx.ideaReview.create({
    data: { ideaId, reviewerId, startedAt: new Date() },
  })

  // 3. Update idea status
  await tx.idea.update({ where: { id: ideaId }, data: { status: 'UNDER_REVIEW' } })
})
```

`IdeaReview.ideaId` already has `@unique` in the schema — the DB enforces uniqueness. The explicit check + unique constraint means the second concurrent write fails at the application layer (clean error message) or at the DB constraint (Prisma `P2002` error which we catch and rethrow).

**Rationale**: Double protection: application-layer check for readable error message + DB unique constraint as final safety net. Prisma `$transaction` with `serializable` level is not needed here because the unique constraint is sufficient.

---

## R-006 — Proxy.ts Route Protection Updates

**Question**: The current `proxy.ts` protects `/dashboard`, `/admin`, `/api/admin`. New routes `/admin/review/[id]`, `/settings`, `/admin/analytics` need protection. What changes are needed?

**Decision**: Extend the proxy check for:

| Path               | Auth required | Role required                                                                     |
| ------------------ | ------------- | --------------------------------------------------------------------------------- |
| `/admin/review`    | ✅            | ADMIN or SUPERADMIN                                                               |
| `/settings`        | ✅            | any authenticated                                                                 |
| `/admin/analytics` | ✅            | SUPERADMIN only (enforced in page via `notFound()` + `FEATURE_ANALYTICS_ENABLED`) |

`/admin/review` falls under the existing `/admin` prefix check — no proxy change needed for basic auth protection. ADMIN+ role already enforced by the `/admin` block.

`/settings` must be added to the `isProtected` pattern — it requires authentication but no elevated role.

The analytics route (`/admin/analytics` = SUPERADMIN) is handled at the page level with `notFound()` + flag check; the proxy already handles ADMIN+ for `/admin/**`. The page itself does the SUPERADMIN re-check.

**Proxy change**: Add `/settings` path to the `isProtected` set.

---

## R-007 — Test Coverage Configuration (Already in Place)

**Question**: Is the ≥80% coverage gate already configured, or does it need to be set up?

**Decision**: Already configured — no changes needed. `vitest.config.ts` already specifies:

```typescript
thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }
```

Excludes already correct: `lib/generated/**`, `lib/db.ts`, `app/layout.tsx`, `components/ui/**`.

CI pipeline (`.github/workflows/ci.yml`) runs `npm run test:unit` — which maps to `vitest run __tests__/unit`. However, the CI currently runs unit tests only, not the full coverage report. The plan should update CI to run `npm run test:coverage` (not just `test:unit`) to enforce the 80% gate.

**Rationale**: The threshold config exists. CI needs to be updated to call the coverage command instead of the unit command so the gate blocks deployments.

---

## R-008 — E2E Test Infrastructure

**Question**: The E2E directory exists but is empty (`.gitkeep` only). Playwright is configured. What setup is needed before writing the four required critical-path tests?

**Decision**: No additional Playwright setup needed:

- `playwright.config.ts` already points to `__tests__/e2e/`, uses `localhost:3000`, starts dev server automatically.
- Test files to create: 4 spec files covering the 4 critical paths in US-016 AC-2.
- A `__tests__/e2e/helpers/` directory should house shared login utilities and seed utilities.

**E2E database seeding strategy**: Each E2E spec file uses a `beforeAll` that calls a Playwright `apiRequestContext` to POST seed data (via a dedicated `app/api/test/seed/route.ts` guarded by `NODE_ENV === 'test'`), then a `afterAll` that calls `app/api/test/cleanup/route.ts` to delete the seeded rows by test run ID.

**Alternatives considered**:

- Prisma seed script run before Playwright → rejected: tightly couples test runner to DB access; hard to reset per-spec.
- Fixed static seed data → rejected: order-dependent; breaks on re-runs without cleanup.

---

## Summary of All Decisions

| Item                   | Decision                                                                                 |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| IdeaReview schema      | Make `decision` and `comment` optional; add `startedAt`, `decidedAt`                     |
| AuditAction enum       | Add `IDEA_REVIEW_STARTED`, `IDEA_REVIEWED`, `IDEA_REVIEW_ABANDONED`                      |
| State machine          | Pure function at `lib/state-machine/idea-status.ts`; all Server Actions import it        |
| Dashboard freshness    | `revalidatePath('/admin')` called at end of every review Server Action                   |
| Concurrency guard      | Unique constraint on `IdeaReview.ideaId` + application-layer pre-check in `$transaction` |
| Proxy route protection | Add `/settings` to `isProtected`; `/admin/analytics` handled at page level               |
| Coverage gate CI       | Update CI to run `npm run test:coverage` instead of `npm run test:unit`                  |
| E2E infrastructure     | Use test-only seed/cleanup API routes; 4 spec files + shared helpers                     |
