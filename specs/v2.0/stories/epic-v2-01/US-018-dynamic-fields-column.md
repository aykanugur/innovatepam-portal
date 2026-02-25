# User Story: dynamicFields Column on Idea

**Story ID**: US-018
**Epic**: EPIC-V2-01 — Smart Submission Forms
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 2 — Step 2
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** developer,
**I want to** add a `dynamicFields Json?` column to the `Idea` model,
**so that** category-specific answers entered by a submitter are stored alongside the core idea fields without requiring a new table.

---

## Context & Motivation

Dynamic form data submitted by users must be persisted. The simplest non-destructive approach for V2.0 is a nullable `Json` column on `Idea`. This keeps all idea data in one row, avoids a foreign-key join on every idea read, and allows the schema to evolve as field definitions change in `CategoryFieldTemplate`.

---

## Acceptance Criteria

1. **Given** the migration is applied,
   **When** the `Idea` table schema is inspected,
   **Then** a nullable `dynamicFields` column of type `jsonb` exists.

2. **Given** an existing idea submitted before this migration,
   **When** the idea is read,
   **Then** `dynamicFields` is `null` — no data loss and no backfill required.

3. **Given** a new idea is submitted with dynamic field answers,
   **When** the `createIdea` Server Action persists the record,
   **Then** `dynamicFields` is stored as a JSON object where keys are field labels and values are the submitted answers.

4. **Given** `FEATURE_SMART_FORMS_ENABLED=false`,
   **When** an idea is submitted via the standard form,
   **Then** `dynamicFields` is stored as `null` — the column is present but unused.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                                          | Expected Behavior                                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | `dynamicFields` submitted with an unrecognised key (not in the current `CategoryFieldTemplate` for that category) | Server Zod schema validates against the current template; unknown keys are stripped (not stored)       |
| 2   | `dynamicFields` contains an XSS payload string                                                                    | Values stored as raw strings in JSON; rendering layer must escape them (React's default behaviour)     |
| 3   | Migration applied while ideas table is non-empty                                                                  | Adding a nullable column with no default is a non-destructive DDL operation — existing rows unaffected |

---

## UI / UX Notes

N/A — this story is schema-only. The UI for entering dynamic field values is in US-019.

---

## Technical Notes

- Add to `Idea` model in `schema.prisma`:
  ```prisma
  dynamicFields Json? // stores { [fieldLabel: string]: string | number }
  ```
- The `createIdea` and `updateIdea` Server Actions must accept `dynamicFields` as an optional input and pass it to the Prisma `create`/`update` call.
- Zod validation: build a dynamic Zod schema at runtime from the `CategoryFieldTemplate` for the submitted category, validate `dynamicFields` against it, and strip unknown keys using `.strip()`.
- **Feature Flag**: `FEATURE_SMART_FORMS_ENABLED` — when `false`, Server Actions accept but ignore `dynamicFields`; column stays `null`.

---

## Dependencies

| Dependency                                                              | Type  | Status                 | Blocker? |
| ----------------------------------------------------------------------- | ----- | ---------------------- | -------- |
| US-017 — `CategoryFieldTemplate` model (provides the Zod schema source) | Story | Must be done first     | Yes      |
| US-019 — Dynamic form rendering (consumes this column)                  | Story | Must follow this story | No       |

---

## Test Plan

### Manual Testing

- [ ] `prisma migrate dev` applies without errors — existing idea rows have `dynamicFields = null`
- [ ] Submit a new idea via the form — inspect DB row; `dynamicFields` contains the submitted answers

### Automated Testing

- [ ] Integration: `createIdea` with valid `dynamicFields` persists the JSON payload correctly
- [ ] Integration: `createIdea` with an unknown key in `dynamicFields` — unknown key is stripped before persisting
- [ ] Unit: Zod dynamic schema validator built from `CategoryFieldTemplate` rejects missing required fields

---

## Definition of Done

- [ ] `dynamicFields Json?` column migrated successfully
- [ ] `createIdea` Server Action accepts and persists `dynamicFields`
- [ ] Zod validation strips unknown keys and enforces required fields per template
- [ ] Existing V1 idea rows unaffected (`dynamicFields = null`)
- [ ] `git commit: feat(smart-forms): add dynamicFields column to Idea`
