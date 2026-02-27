# Implementation Plan: Multi-Stage Review

**Branch**: `001-multi-stage-review` | **Date**: 2026-02-26 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-multi-stage-review/spec.md`

## Summary

Implement a configurable, per-category multi-stage review pipeline (EPIC-V2-04). When `FEATURE_MULTI_STAGE_REVIEW_ENABLED=true`, idea reviews route through an ordered sequence of `ReviewPipelineStage` steps instead of the V1 `IdeaReview` single-decision path. Admins claim Stage 1, complete stages (PASS / ESCALATE / ACCEPTED / REJECTED), and the system auto-advances through the pipeline. SUPERADMIN resolves escalations. A pipeline config UI at `/admin/review-config` allows SUPERADMIN to manage stage sequences per category.

Technical approach: new Prisma models (`ReviewPipeline`, `ReviewPipelineStage`, `IdeaStageProgress`) + 4 Server Actions + feature-flag branching at V1/V2 divergence points. Zero new third-party dependencies.

## Technical Context

**Language/Version**: TypeScript 5.4 / Node.js 24
**Primary Dependencies**: Next.js 16.1.6 (App Router, Server Actions), React 19, Prisma 7.4.1, Zod 3.24, Tailwind CSS, shadcn/ui, NextAuth v5 (Auth.js)
**Storage**: Neon PostgreSQL (via Prisma)
**Testing**: Vitest 2.x (unit + integration), Playwright (E2E)
**Target Platform**: Vercel (Edge-compatible Server Actions; no Edge Runtime for DB-touching actions)
**Project Type**: Web application (Next.js App Router monolith under `innovatepam-portal/`)
**Performance Goals**: Stage claim transaction ≤ 500 ms p95; escalation queue page load ≤ 1 s p95
**Constraints**: No new npm dependencies; Prisma schema changes must be backward-compatible; `IdeaReview` model preserved for V1 in-flight compatibility
**Scale/Scope**: ~10–50 concurrent reviewers; ≤ 5 categories; ≤ 10 stages per pipeline

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

Constitution file is present but unpopulated (template state) — no active gates are defined. No violations detected. Proceeding to Phase 0.

**Post-design re-check (Phase 1)**:

- No new top-level projects introduced (all changes within `innovatepam-portal/`)
- No Repository pattern introduced (Server Actions → Prisma directly, consistent with existing codebase)
- No "clever" abstractions: feature-flag branch is a simple `if` at call site
- Backward compatibility preserved: `IdeaReview` model untouched, V1 path unchanged when flag is `false`

✅ No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/001-multi-stage-review/
├── plan.md              ← this file
├── spec.md              ← feature specification (complete)
├── research.md          ← Phase 0 decisions R-001 through R-009 (complete)
├── data-model.md        ← Phase 1: schema, enums, seed, validation rules (complete)
├── quickstart.md        ← Phase 1: dev setup + manual test walkthrough (complete)
├── checklists/
│   ├── requirements.md  ← requirements checklist (complete)
│   └── data-model.md    ← data model quality checklist (complete)
├── contracts/
│   ├── claim-stage.md         ← claimStage() Server Action contract (complete)
│   ├── complete-stage.md      ← completeStage() Server Action contract (complete)
│   ├── resolve-escalation.md  ← resolveEscalation() Server Action contract (complete)
│   └── pipeline-crud.md       ← createPipeline / updatePipeline / deletePipeline (complete)
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created by /speckit.plan)
```

### Source Code (innovatepam-portal/)

```text
innovatepam-portal/
│
├── prisma/
│   ├── schema.prisma              MODIFY — add ReviewPipeline, ReviewPipelineStage,
│   │                                       IdeaStageProgress, StageOutcome enum,
│   │                                       AuditAction additions, Idea relation
│   ├── seed.ts                    MODIFY — upsert 5 default pipelines (one per category)
│   └── migrations/
│       └── <timestamp>_add_multi_stage_review/   NEW — migration files
│
├── lib/
│   ├── env.ts                     MODIFY — add FEATURE_MULTI_STAGE_REVIEW_ENABLED flag
│   ├── generated/prisma/          REGENERATE — prisma generate after migration
│   │
│   ├── actions/
│   │   ├── claim-stage.ts         NEW — claimStage(ideaId) Server Action
│   │   ├── complete-stage.ts      NEW — completeStage(stageProgressId, outcome, comment)
│   │   ├── resolve-escalation.ts  NEW — resolveEscalation(stageProgressId, action, comment)
│   │   └── pipeline-crud.ts       NEW — createPipeline / updatePipeline / deletePipeline
│   │
│   ├── validations/
│   │   └── pipeline.ts            NEW — Zod schemas: CreatePipelineSchema, UpdatePipelineSchema,
│   │                                     CompleteStageSchema, ResolveEscalationSchema
│   │
│   └── state-machine/
│       └── idea-status.ts         MODIFY — document V2 trigger semantics in comments
│                                            (no new states; action semantics updated)
│
├── app/
│   ├── admin/
│   │   ├── review/
│   │   │   ├── page.tsx                    MODIFY — add escalation queue tab (FR-020)
│   │   │   └── [id]/
│   │   │       └── stage/
│   │   │           └── [stageId]/
│   │   │               └── page.tsx        NEW — stage completion page for admin
│   │   └── review-config/
│   │       └── page.tsx                    NEW — pipeline configuration page (SUPERADMIN only)
│   │
│   └── (main)/
│       └── ideas/
│           └── [id]/
│               └── page.tsx                MODIFY — add stage progress stepper (FR-017)
│
├── components/
│   ├── admin/
│   │   ├── stage-completion-panel.tsx      NEW — outcome selector + comment form
│   │   ├── escalation-queue.tsx            NEW — list of escalated ideas
│   │   └── resolve-escalation-form.tsx     NEW — SUPERADMIN PASS/REJECT resolution form
│   │
│   ├── pipeline/
│   │   ├── pipeline-config-form.tsx        NEW — full pipeline CRUD UI (Client Component)
│   │   └── stage-row.tsx                   NEW — single stage row with up/down reorder
│   │
│   └── ideas/
│       └── stage-progress-stepper.tsx      NEW — horizontal stepper on idea detail page
│
└── tests/
    ├── unit/
    │   └── actions/
    │       ├── claim-stage.test.ts          NEW
    │       ├── complete-stage.test.ts       NEW
    │       ├── resolve-escalation.test.ts   NEW
    │       └── pipeline-crud.test.ts        NEW
    └── e2e/
        └── multi-stage-review.spec.ts       NEW
```

## Complexity Tracking

No constitution violations detected. Section not applicable.
