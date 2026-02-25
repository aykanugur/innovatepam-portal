# User Story: blindReview Field & Migration

**Story ID**: US-036
**Epic**: EPIC-V2-05 — Blind Review
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 6 — Step 1
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** developer,
**I want to** add `blindReview Boolean @default(false)` to the `ReviewPipeline` model,
**so that** each pipeline has a persisted flag controlling whether submitter identity is masked for reviewers.

---

## Context & Motivation

Blind review is a display-layer feature, but it needs a reliable persistence mechanism. A boolean column on `ReviewPipeline` is the simplest possible implementation — it can be toggled by a SUPERADMIN, takes effect immediately on the next page load, and requires no new models or join tables.

---

## Acceptance Criteria

1. **Given** the migration is applied,
   **When** the `ReviewPipeline` table is inspected,
   **Then** a non-nullable `blindReview` column of type `boolean` exists with a `DEFAULT false` constraint.

2. **Given** existing `ReviewPipeline` rows before the migration,
   **When** the migration runs,
   **Then** all existing rows have `blindReview = false` — no data migration script required.

3. **Given** a newly created pipeline (via the config page or seed),
   **When** `blindReview` is not explicitly set,
   **Then** the value defaults to `false`.

4. **Given** `FEATURE_BLIND_REVIEW_ENABLED=false`,
   **When** the application reads any pipeline,
   **Then** the `blindReview` value is present in the DB but the masking logic never evaluates it — the feature flag short-circuits first.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                    | Expected Behavior                                                                                                            |
| --- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1   | Migration is run on a table with thousands of pipeline rows | Adding a non-nullable column with a `DEFAULT` value is a fast metadata-only DDL in PostgreSQL — no table rewrite required    |
| 2   | Prisma client is not regenerated after migration            | TypeScript compiler error — `blindReview` field missing from the `ReviewPipeline` type; developer must run `prisma generate` |

---

## UI / UX Notes

N/A — schema-only story.

---

## Technical Notes

- Add to `ReviewPipeline` model in `schema.prisma`:
  ```prisma
  blindReview Boolean @default(false) // Phase 6: when true, submitter identity is masked for ADMIN reviewers
  ```
- Run `prisma migrate dev --name add-blind-review-to-pipeline`.
- Run `prisma generate` to update the Prisma client.
- **Feature Flag**: `FEATURE_BLIND_REVIEW_ENABLED` — field is added unconditionally; feature flag is evaluated in application logic.

---

## Dependencies

| Dependency                                     | Type   | Status               | Blocker? |
| ---------------------------------------------- | ------ | -------------------- | -------- |
| EPIC-V2-04 — `ReviewPipeline` model must exist | Schema | Must be merged first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] `prisma migrate dev` applies cleanly — `blindReview` column present in `ReviewPipeline` table
- [ ] All existing pipeline rows have `blindReview = false` after migration
- [ ] Creating a new pipeline without setting `blindReview` defaults to `false`

### Automated Testing

- [ ] Integration: `prisma.reviewPipeline.create({})` — `blindReview` defaults to `false`
- [ ] Integration: `prisma.reviewPipeline.update({ data: { blindReview: true } })` — persists correctly

---

## Definition of Done

- [ ] `blindReview Boolean @default(false)` added to `ReviewPipeline` model
- [ ] Migration applied; all existing rows default to `false`
- [ ] Prisma client regenerated
- [ ] `git commit: feat(blind-review): add blindReview field to ReviewPipeline`
