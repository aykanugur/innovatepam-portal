# Quickstart: Multi-Stage Review

**Feature**: EPIC-V2-04 Multi-Stage Review Pipeline
**Branch**: `001-multi-stage-review`

---

## Prerequisites

- Node.js 22+, pnpm 9+
- PostgreSQL (Neon or local)
- `.env.local` configured (see `.env.example`)

---

## 1. Environment Setup

Add the feature flag to `.env.local`:

```bash
# .env.local
FEATURE_MULTI_STAGE_REVIEW_ENABLED=true
```

All other existing env vars remain the same. The flag defaults to `'false'` in `lib/env.ts`; setting it to `'true'` activates all multi-stage review code paths.

---

## 2. Database Migration

```bash
cd innovatepam-portal

# Generate Prisma migration
pnpm prisma migrate dev --name add-multi-stage-review

# Verify migration ran
pnpm prisma studio
```

Expected new tables: `ReviewPipeline`, `ReviewPipelineStage`, `IdeaStageProgress`

---

## 3. Seed Default Pipelines

```bash
# Run seed (idempotent — safe to re-run)
pnpm prisma db seed
```

This creates 5 default pipelines, one per category, each with 2 stages:

- **Stage 1**: Initial Review (`isDecisionStage=false`)
- **Stage 2**: Final Decision (`isDecisionStage=true`)

Verify in Prisma Studio or:

```bash
pnpm tsx -e "
  const { db } = await import('./lib/db');
  const pipelines = await db.reviewPipeline.findMany({ include: { stages: true } });
  console.log(JSON.stringify(pipelines, null, 2));
"
```

---

## 4. Install Dependencies (no new deps expected)

All required packages are already in `package.json`. No new dependencies for this feature.

```bash
pnpm install
```

---

## 5. Run Development Server

```bash
pnpm dev
```

---

## 6. Manual Test Flow

### Step 1: Submit an Idea (as EMPLOYEE)

1. Log in as any EMPLOYEE user (or seed one)
2. Navigate to `/ideas/new`
3. Select any category (e.g., "Process Improvement")
4. Fill form and submit → Idea status: `SUBMITTED`

### Step 2: Claim Stage 1 (as ADMIN)

1. Log in as ADMIN
2. Navigate to `/admin/review`
3. Find the submitted idea in the pending queue
4. Click **"Start Review"** → calls `claimStage(ideaId)`
5. Verify: Idea status → `UNDER_REVIEW`, Stage 1 now shows as active

### Step 3: Complete Stage 1 with PASS (as ADMIN)

1. Navigate to `/admin/review/[ideaId]/stage/[stage1ProgressId]`
2. Select outcome: **PASS**
3. Enter comment (min 10 chars)
4. Submit → calls `completeStage(stageProgressId, 'PASS', comment)`
5. Verify: Stage 1 `completedAt` set, Stage 2 `startedAt` set

### Step 4: Complete Stage 2 (Decision Stage) with ACCEPTED

1. Stage 2 is now active on the same review page
2. Select outcome: **ACCEPTED**
3. Enter comment
4. Submit → calls `completeStage(stageProgressId, 'ACCEPTED', comment)`
5. Verify: Idea status → `ACCEPTED`

### Optional: Test Escalation Path

1. Complete Stage 1 with **ESCALATE** instead of PASS
2. Log in as SUPERADMIN
3. Navigate to `/admin/review` → Escalation Queue tab
4. Find escalated idea
5. Select **PASS** or **REJECT** and submit → calls `resolveEscalation(...)`

### Optional: Test Pipeline Config (as SUPERADMIN)

1. Log in as SUPERADMIN
2. Navigate to `/admin/review-config`
3. Edit a pipeline (add a stage, reorder, change names)
4. Verify changes reflect immediately on new idea claims

---

## 7. Feature Flag Behaviour

When `FEATURE_MULTI_STAGE_REVIEW_ENABLED=false` (default):

- `/admin/review` shows the existing V1 single-stage review flow (unchanged)
- `claimStage`, `completeStage`, `resolveEscalation` return `{ code: 'FEATURE_DISABLED' }` immediately
- No new pipeline config UI visible

To test V1 fallback:

```bash
# Remove or set to false
FEATURE_MULTI_STAGE_REVIEW_ENABLED=false
```

---

## 8. Run Tests

```bash
# Unit tests
pnpm test:unit

# Integration tests (requires DB)
pnpm test:integration

# E2E tests (requires dev server running on :3000)
pnpm test:e2e --grep "multi-stage"
```

Key test files (to be created during implementation):

- `tests/unit/actions/claim-stage.test.ts`
- `tests/unit/actions/complete-stage.test.ts`
- `tests/unit/actions/resolve-escalation.test.ts`
- `tests/unit/actions/pipeline-crud.test.ts`
- `tests/e2e/multi-stage-review.spec.ts`

---

## 9. Audit Log Verification

Query audit log to verify all events:

```ts
// In prisma studio or a script:
prisma.auditLog.findMany({
  where: {
    action: {
      in: ['STAGE_STARTED', 'STAGE_COMPLETED', 'PIPELINE_CREATED', 'PIPELINE_UPDATED'],
    },
  },
  orderBy: { createdAt: 'desc' },
  take: 20,
})
```

---

## 10. Rollback

To disable the feature without migration rollback:

```bash
# In .env.local:
FEATURE_MULTI_STAGE_REVIEW_ENABLED=false
```

All data remains intact. V1 review flow resumes immediately.
