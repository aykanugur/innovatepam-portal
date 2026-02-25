# User Story: IdeaScore Model, Migration, Criteria Seed & Audit Action

**Story ID**: US-040
**Epic**: EPIC-V2-06 — Scoring System
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 7 — Step 1
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** developer,
**I want to** create the `IdeaScore` Prisma model with a database-level range check constraint, add the `IDEA_SCORED` audit action, and create the `SCORING_CRITERIA` constant,
**so that** the scoring system has a complete, validated data foundation before UI or business logic is built.

---

## Context & Motivation

Without the DB schema in place, the star rating UI (US-041) and analytics queries (US-044) have nothing to write to or read from. Getting the data model right first — including the `@@unique([ideaId])` constraint and the raw SQL check constraint — prevents a costly schema revision after the UI is in place.

---

## Acceptance Criteria

1. **Given** the migration is applied,
   **When** the `IdeaScore` table is inspected,
   **Then** it has columns: `id (cuid)`, `ideaId (unique FK → Idea)`, `reviewerId (FK → User)`, `score (int)`, `criteria (text[])`, `recordedAt (timestamptz default now)`.

2. **Given** the migration is applied,
   **When** `\d "IdeaScore"` is run in psql,
   **Then** the check constraint `IdeaScore_score_range` is listed, enforcing `score >= 1 AND score <= 5`.

3. **Given** the `AuditAction` enum in the schema,
   **When** it is inspected after migration,
   **Then** `IDEA_SCORED` is a valid enum value.

4. **Given** `SCORING_CRITERIA` is imported from `constants/scoring-criteria.ts`,
   **When** it is used,
   **Then** it is an array of exactly 5 strings: `["Technical Feasibility", "Strategic Alignment", "Cost Efficiency", "Employee Impact", "Innovation Level"]`.

5. **Given** the `Idea` model,
   **When** it is inspected after migration,
   **Then** it has a `score IdeaScore? @relation("IdeaScore")` optional relation.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                            | Expected Behavior                                                                                                                        |
| --- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Two `IdeaScore` rows created for the same `ideaId` (race condition) | `@@unique([ideaId])` constraint causes `P2002` on the second insert; application catches and returns `409`                               |
| 2   | `criteria` column with a PostgreSQL array of strings                | Prisma maps `String[]` to `text[]` — column accepts any array of strings; criteria content is validated at the application layer via Zod |
| 3   | Migration run on a non-empty `Idea` table                           | `IdeaScore` is a new table; existing ideas simply have no `score` relation — no backfill needed                                          |

---

## UI / UX Notes

N/A — data layer only.

---

## Technical Notes

- New model in `schema.prisma`:
  ```prisma
  model IdeaScore {
    id         String   @id @default(cuid())
    ideaId     String   @unique
    idea       Idea     @relation("IdeaScore", fields: [ideaId], references: [id], onDelete: Cascade)
    reviewerId String
    reviewer   User     @relation("UserScores", fields: [reviewerId], references: [id])
    score      Int
    criteria   String[]
    recordedAt DateTime @default(now())
    @@index([score])
  }
  ```
- After `prisma migrate dev`, edit the generated migration SQL to add:
  ```sql
  ALTER TABLE "IdeaScore" ADD CONSTRAINT "IdeaScore_score_range" CHECK (score >= 1 AND score <= 5);
  ```
- Add `IDEA_SCORED` to `AuditAction` enum in `schema.prisma`.
- Create `constants/scoring-criteria.ts`:
  ```ts
  export const SCORING_CRITERIA = [
    'Technical Feasibility',
    'Strategic Alignment',
    'Cost Efficiency',
    'Employee Impact',
    'Innovation Level',
  ] as const
  export type ScoringCriterion = (typeof SCORING_CRITERIA)[number]
  ```
- **Feature Flag**: `FEATURE_SCORING_ENABLED` — does not affect migration or constant creation.

---

## Dependencies

| Dependency                   | Type  | Status                 | Blocker? |
| ---------------------------- | ----- | ---------------------- | -------- |
| All other EPIC-V2-06 stories | Story | Must follow this story | No       |

---

## Test Plan

### Manual Testing

- [ ] `prisma migrate dev` applies — `IdeaScore` table with `IdeaScore_score_range` constraint exists
- [ ] `IDEA_SCORED` enum value present in DB
- [ ] Insert `IdeaScore` row with `score = 0` → DB check constraint error
- [ ] Insert `IdeaScore` row with `score = 6` → DB check constraint error
- [ ] Insert two `IdeaScore` rows with the same `ideaId` → unique constraint error

### Automated Testing

- [ ] Integration: `prisma.ideaScore.create({ data: { score: 3, ... } })` succeeds
- [ ] Integration: creating duplicate `IdeaScore` for same `ideaId` throws `P2002`
- [ ] Unit: `SCORING_CRITERIA` has exactly 5 items; each is a non-empty string

---

## Definition of Done

- [ ] `IdeaScore` model + `IdeaScore_score_range` check constraint migrated
- [ ] `IDEA_SCORED` added to `AuditAction` enum
- [ ] `SCORING_CRITERIA` constant exported from `constants/scoring-criteria.ts`
- [ ] `Idea.score` optional relation added
- [ ] `git commit: feat(scoring): IdeaScore model, migration, criteria seed, audit action`
