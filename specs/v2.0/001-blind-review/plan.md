# Implementation Plan: Blind Review for Idea Evaluation Pipelines

**Branch**: `001-blind-review` | **Date**: 2026-02-26 | **Spec**: [spec.md](spec.md)  
**Input**: Feature specification from `/specs/001-blind-review/spec.md`

## Summary

Add a `blindReview` toggle to evaluation pipelines so that SUPERADMIN can enable identity masking: ADMINs reviewing ideas in UNDER_REVIEW status see author name as "Anonymous" while SUPERADMINs and the idea author always see the real identity. Audit logs are explicitly exempt. The change ships behind a `FEATURE_BLIND_REVIEW_ENABLED` environment flag.

**Technical approach** (from research.md):

1. One additive Prisma migration (`blindReview Boolean @default(false)` on `ReviewPipeline`)
2. Feature flag in `lib/env.ts` (same pattern as 6 existing flags)
3. Pure masking function in `lib/blind-review.ts` with 5-condition predicate
4. Function called at 4 server-side call sites: idea detail RSC, `/api/ideas/[id]` GET, two admin review pages
5. `updatePipeline()` extended to persist the new field (SUPERADMIN guard, per-field)
6. UI toggle (Switch + Tooltip + amber Alert) in `PipelineConfigForm`, SUPERADMIN-only

## Technical Context

**Language/Version**: TypeScript 5.x / Node.js 22 (Next.js 15 App Router)  
**Primary Dependencies**: Next.js 15, Prisma 7, shadcn/ui (Switch, Tooltip, Alert), Zod, Auth.js v5  
**Storage**: PostgreSQL via Prisma (Supabase). Migration adds one `BOOLEAN NOT NULL DEFAULT false` column.  
**Testing**: Vitest (unit); existing thresholds ≥ 80% statements / branches / functions  
**Target Platform**: Vercel (SSR + Route Handlers)  
**Project Type**: Full-stack web application (Next.js App Router + Prisma ORM)  
**Performance Goals**: Masking overhead < 100ms on idea detail page loads (SC-006). Pipeline lookup is a single indexed read (`categorySlug` unique index already exists).  
**Constraints**: Masking function must be server-side only. No client-side exposure of author identity logic.  
**Scale/Scope**: 5 pipeline categories; masking applied at point of read for ideas in UNDER_REVIEW status only.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

The constitution template contains only placeholder text (no filled principles). No gates are defined for this project. All decisions in research.md follow established in-project patterns — no novel architectural choices.

**Post-design re-check**: ✅ No violations. The masking function is a pure utility (testable in isolation), the schema change is additive (no existing behaviour altered), and all call sites are server-side (no client-side exposure).

## Project Structure

### Documentation (this feature)

```text
specs/001-blind-review/
├── plan.md              ← this file
├── research.md          ← Phase 0: all 5 unknowns resolved
├── data-model.md        ← Phase 1: schema diff + masking logic
├── quickstart.md        ← Phase 1: step-by-step implementation guide
├── contracts/
│   └── api.md           ← Phase 1: modified endpoints + new internal module
├── checklists/
│   └── requirements.md  ← spec quality checklist (all 14 items pass)
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT yet created)
```

### Source Code Layout (innovatepam-portal/)

```text
prisma/
├── schema.prisma                        ← ADD: blindReview Boolean on ReviewPipeline
└── migrations/
    └── 20260226_add_blind_review_to_pipeline/  ← NEW migration

lib/
├── blind-review.ts                      ← NEW: maskAuthorIfBlind() pure function
├── env.ts                               ← MODIFY: add FEATURE_BLIND_REVIEW_ENABLED
├── validations/
│   └── pipeline.ts                      ← MODIFY: add blindReview to UpdatePipelineSchema
└── actions/
    └── pipeline-crud.ts                 ← MODIFY: updatePipeline accepts blindReview

app/
├── (main)/ideas/[id]/page.tsx           ← MODIFY: apply masking to authorName prop
├── api/ideas/[id]/route.ts              ← MODIFY: apply masking in GET handler
├── admin/
│   ├── review-config/page.tsx           ← MODIFY: pass hasActiveReviews + featureFlagEnabled
│   └── review/
│       ├── [id]/page.tsx                ← MODIFY: apply masking + audit log comment
│       └── [id]/stage/[stageId]/page.tsx ← MODIFY: apply masking + audit log comment

components/
└── pipeline/
    └── pipeline-config-form.tsx         ← MODIFY: add Switch toggle + Tooltip + amber Alert

tests/
└── unit/
    └── lib/
        └── blind-review.test.ts         ← NEW: 8+ masking unit tests

.env.local                               ← MODIFY: add FEATURE_BLIND_REVIEW_ENABLED=false
.env.example                             ← MODIFY: add FEATURE_BLIND_REVIEW_ENABLED=false
```

**Structure Decision**: Single Next.js App Router project. No new packages or layers. All changes are additive to the existing architecture — one new utility file, one new migration, modifications to 9 existing files.

## Complexity Tracking

> No constitution violations. No complexity justification required.

## Implementation Strategy

- **MVP**: Phases 1–3 (schema + feature flag + pipeline toggle). Delivers US1 and US4 — a SUPERADMIN can enable blind review on a pipeline. The toggle works end-to-end but masking is not yet active.
- **Full delivery**: Phases 4–6 add the masking function, all 4 call sites, audit log exemption comments, and unit tests — completing US2 and US3.
- **Phases 3–5 are sequentially dependent**: masking call sites (Phase 4) require the `blindReview` field (Phase 2) and the masking function (Phase 4, T008). Phases 4 call-site tasks (T009–T012) are parallel once T008 is done.
