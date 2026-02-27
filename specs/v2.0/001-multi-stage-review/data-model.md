# Data Model: Multi-Stage Review

**Phase**: 1 — Design
**Date**: 2026-02-26
**Branch**: `001-multi-stage-review`

---

## 1. New Enums

### StageOutcome

```prisma
enum StageOutcome {
  PASS
  ESCALATE
  ACCEPTED
  REJECTED
}
```

Valid on which stage type:

- `PASS` / `ESCALATE` → non-decision stages only (`isDecisionStage = false`)
- `ACCEPTED` / `REJECTED` → decision stage only (`isDecisionStage = true`)

### AuditAction additions

```prisma
// Append to existing AuditAction enum:
STAGE_STARTED          // admin claimed Stage 1, IdeaStageProgress rows created
STAGE_COMPLETED        // admin (or SUPERADMIN resolver) completed a stage
PIPELINE_CREATED       // SUPERADMIN created a new custom pipeline
PIPELINE_UPDATED       // SUPERADMIN edited an existing pipeline
```

---

## 2. New Models

### ReviewPipeline

```prisma
model ReviewPipeline {
  id           String               @id @default(cuid())
  name         String               // display name, e.g. "Default 2-Stage", "Product Review"
  categorySlug String               @unique // FK-by-convention to CATEGORIES constant
  isDefault    Boolean              @default(false)
  createdAt    DateTime             @default(now())
  updatedAt    DateTime             @updatedAt

  stages ReviewPipelineStage[]
}
```

**Constraints**:

- `categorySlug @unique` — one pipeline per category at any time
- `isDefault = true` pipelines cannot be deleted (enforced in Server Action, not DB)
- `name` is required; no max enforced at DB level (Zod handles max 80 chars)

---

### ReviewPipelineStage

```prisma
model ReviewPipelineStage {
  id              String   @id @default(cuid())
  pipelineId      String
  name            String   // max 60 chars (Zod-validated)
  description     String?
  order           Int      // 1-based, contiguous
  isDecisionStage Boolean  @default(false)
  createdAt       DateTime @default(now())

  pipeline ReviewPipeline     @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  progress IdeaStageProgress[]

  @@unique([pipelineId, order])
  @@index([pipelineId, order])
}
```

**Constraints**:

- `@@unique([pipelineId, order])` — no two stages can share the same order within a pipeline
- Exactly one `isDecisionStage = true` per pipeline (Zod-validated; not a DB constraint)
- `name` max 60 chars validated via Zod in `pipeline-crud.ts`
- `onDelete: Cascade` — when a pipeline is deleted, its stages are deleted (blocked by IdeaStageProgress guard if in-flight)

---

### IdeaStageProgress

```prisma
model IdeaStageProgress {
  id          String        @id @default(cuid())
  ideaId      String
  stageId     String
  reviewerId  String?       // set when admin claims the stage
  outcome     StageOutcome? // null until stage is completed
  comment     String?       // null until stage is completed; min 10, max 2000 chars
  startedAt   DateTime?     // set when stage becomes active
  completedAt DateTime?     // set when outcome is recorded
  createdAt   DateTime      @default(now())

  idea     Idea               @relation(fields: [ideaId], references: [id], onDelete: Cascade)
  stage    ReviewPipelineStage @relation(fields: [stageId], references: [id])
  reviewer User?              @relation(fields: [reviewerId], references: [id])

  @@unique([ideaId, stageId])
  @@index([ideaId])
  @@index([stageId])
  @@index([outcome])  // for escalation queue query
}
```

**Constraints**:

- `@@unique([ideaId, stageId])` — one progress row per stage per idea
- `outcome` is null until the admin completes the stage
- `reviewerId` null until a stage is claimed
- `@@index([outcome])` — supports efficient escalation queue query (`WHERE outcome = 'ESCALATE'`)

---

## 3. Idea Model Update

Add relation to `IdeaStageProgress`:

```prisma
// In existing Idea model, add:
stageProgress IdeaStageProgress[]
```

---

## 4. IdeaReview Soft-Deprecation

Add doc comment to `IdeaReview` model in schema.prisma:

```prisma
// DEPRECATED in V2.0: use IdeaStageProgress for new ideas.
// Kept for V1 in-flight review compatibility. Scheduled for removal in V3.0.
model IdeaReview {
  ...
}
```

---

## 5. State Transitions

### New valid transitions (added to `lib/state-machine/idea-status.ts`)

The state machine is not extended with new states — `UNDER_REVIEW`, `ACCEPTED`, `REJECTED` are unchanged. What changes is the _action semantics_:

- `START_REVIEW` (ADMIN | SUPERADMIN) → `SUBMITTED → UNDER_REVIEW`
  - V2 path: creates `IdeaStageProgress` rows for all pipeline stages
  - V1 path: creates `IdeaReview` row (unchanged)
- `ACCEPT` (ADMIN | SUPERADMIN) → `UNDER_REVIEW → ACCEPTED` — triggered by `ACCEPTED` outcome on decision stage
- `REJECT` (ADMIN | SUPERADMIN) → `UNDER_REVIEW → REJECTED` — triggered by `REJECTED` outcome on decision stage

The `ESCALATE` outcome does **not** change `Idea.status` — idea stays `UNDER_REVIEW`.

---

## 6. Seed Data

Default pipelines seeded for all 5 categories:

| categorySlug           | Pipeline Name  | Stage 1                                  | Stage 2                                 |
| ---------------------- | -------------- | ---------------------------------------- | --------------------------------------- |
| `process-improvement`  | Default Review | Initial Review (`isDecisionStage=false`) | Final Decision (`isDecisionStage=true`) |
| `new-product-service`  | Default Review | Initial Review                           | Final Decision                          |
| `cost-reduction`       | Default Review | Initial Review                           | Final Decision                          |
| `employee-experience`  | Default Review | Initial Review                           | Final Decision                          |
| `technical-innovation` | Default Review | Initial Review                           | Final Decision                          |

All seeded with `isDefault = true`. Seed is idempotent (upsert by `categorySlug`).

---

## 7. Validation Rules Summary

| Field                       | Rule                                                                           | Enforcement                                  |
| --------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| `ReviewPipelineStage.name`  | Required, max 60 chars                                                         | Zod in `pipeline-crud.ts`                    |
| `ReviewPipeline.name`       | Required, max 80 chars                                                         | Zod in `pipeline-crud.ts`                    |
| Decision stage count        | Exactly 1 per pipeline                                                         | Zod refinement on stage array                |
| `IdeaStageProgress.comment` | Min 10 chars, max 2000 chars when present                                      | Zod in `complete-stage.ts`                   |
| Outcome vs stage type       | `PASS`/`ESCALATE` only on non-decision; `ACCEPTED`/`REJECTED` only on decision | Zod in `complete-stage.ts`                   |
| Stage deletion guard        | Block if `IdeaStageProgress` with `completedAt=null` exists                    | Server Action runtime check → 409            |
| Pipeline deletion guard     | Block if any stage progress is in-flight for this pipeline                     | Server Action runtime check → 409            |
| Default pipeline deletion   | Always blocked                                                                 | Server Action check (`isDefault=true`) → 403 |
| Stage completer identity    | Only the `reviewerId` who claimed the stage may complete it                    | Server Action runtime check → 403            |
