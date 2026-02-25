# User Story: CategoryFieldTemplate Model & Seed

**Story ID**: US-017
**Epic**: EPIC-V2-01 — Smart Submission Forms
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 2 — Step 1
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** developer,
**I want to** create the `CategoryFieldTemplate` Prisma model and seed it with per-category field definitions,
**so that** the dynamic form system has a stable, schema-backed source of truth for which fields each idea category requires.

---

## Context & Motivation

Before dynamic form rendering can work, there must be a data model that maps a category name to an ordered list of field definitions (label, type, placeholder, required flag). Without this model and seed, the form rendering story (US-019) has no data contract to code against. This story is a pure data-layer prerequisite — no UI is involved.

---

## Acceptance Criteria

1. **Given** the migration is applied,
   **When** `prisma migrate dev` runs,
   **Then** the `CategoryFieldTemplate` table exists with columns: `id`, `category`, `fields` (JSON), `createdAt`, `updatedAt`.

2. **Given** the seed is executed (`npx prisma db seed`),
   **When** the database is queried for `CategoryFieldTemplate`,
   **Then** at least one row per `IdeaCategory` enum value exists containing a non-empty `fields` array.

3. **Given** the `fields` JSON for any category,
   **When** it is parsed,
   **Then** each entry conforms to: `{ label: string, type: "text" | "textarea" | "number" | "select", placeholder?: string, required: boolean, options?: string[] }`.

4. **Given** `FEATURE_SMART_FORMS_ENABLED=false`,
   **When** the seed runs,
   **Then** the `CategoryFieldTemplate` rows are still created — the feature flag only controls UI rendering, not data population.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                    | Expected Behavior                                                                             |
| --- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 1   | Seed runs twice (idempotency)                                               | `upsert` on `category` field — no duplicate rows created                                      |
| 2   | A `category` value in the seed does not match any `IdeaCategory` enum value | Prisma throws a type error at compile time — the seed file uses the typed `IdeaCategory` enum |
| 3   | `fields` contains a `type` value not in the union                           | TypeScript utility type `FieldDefinition` rejects it at compile time in the seed file         |

---

## UI / UX Notes

N/A — no user-facing UI in this story.

---

## Technical Notes

- New model in `prisma/schema.prisma`:
  ```prisma
  model CategoryFieldTemplate {
    id        String   @id @default(cuid())
    category  String   @unique // matches IdeaCategory enum string value
    fields    Json     // FieldDefinition[]
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  ```
- Define a TypeScript type `FieldDefinition` in `types/field-definition.ts` used by both the seed and form renderer.
- Seed in `prisma/seed.ts` — extend existing seed with `CategoryFieldTemplate` upserts. Each category gets ≥ 3 field definitions as a starting point.
- **Feature Flag**: `FEATURE_SMART_FORMS_ENABLED` — flag does not affect seed execution.

---

## Dependencies

| Dependency                                        | Type   | Status                 | Blocker? |
| ------------------------------------------------- | ------ | ---------------------- | -------- |
| `IdeaCategory` enum must exist in `schema.prisma` | Schema | Already exists in V1   | No       |
| US-018 — `dynamicFields` on Idea                  | Story  | Must follow this story | No       |

---

## Test Plan

### Manual Testing

- [ ] `prisma migrate dev` applies cleanly — no errors
- [ ] `npx prisma db seed` populates `CategoryFieldTemplate` with one row per category
- [ ] Running seed twice does not create duplicate rows

### Automated Testing

- [ ] Unit: `FieldDefinition` type rejects invalid `type` values at TypeScript compile time
- [ ] Integration: seeded rows retrieved by `prisma.categoryFieldTemplate.findMany()` match expected shape

---

## Definition of Done

- [ ] `CategoryFieldTemplate` migration applied
- [ ] Seed populates all categories (upsert-safe)
- [ ] `FieldDefinition` TypeScript type exported
- [ ] Zero TypeScript errors
- [ ] `git commit: feat(smart-forms): CategoryFieldTemplate model and seed`
