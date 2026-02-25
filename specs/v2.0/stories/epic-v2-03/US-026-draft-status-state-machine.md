# User Story: DRAFT Status, draftExpiresAt & State Machine Update

**Story ID**: US-026
**Epic**: EPIC-V2-03 — Draft Management
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 4 — Step 1
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** developer,
**I want to** add `DRAFT` to the `IdeaStatus` enum and `draftExpiresAt` to the `Idea` model, and update the state machine,
**so that** ideas can exist in a pre-submission state that is invisible to reviewers and expires automatically if abandoned.

---

## Context & Motivation

The V1 state machine transitions: `SUBMITTED → UNDER_REVIEW → ACCEPTED | REJECTED`. Adding `DRAFT` is the first prerequisite for the entire draft flow. The state machine enforcer in `lib/state-machine/` must accept `DRAFT → SUBMITTED` as a valid transition and reject all other transitions from `DRAFT`. Without this foundational story, the Save Draft Server Action (US-027) cannot function correctly.

---

## Acceptance Criteria

1. **Given** the migration is applied,
   **When** the `IdeaStatus` enum in the database is inspected,
   **Then** `DRAFT` is a valid enum value alongside `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`.

2. **Given** the migration is applied,
   **When** the `Idea` table schema is inspected,
   **Then** a nullable `draftExpiresAt DateTime?` column exists.

3. **Given** the state machine is updated,
   **When** a transition from `DRAFT` to `SUBMITTED` is attempted,
   **Then** the state machine permits the transition.

4. **Given** the state machine is updated,
   **When** a transition from `DRAFT` to `UNDER_REVIEW` is attempted directly,
   **Then** the state machine throws a `InvalidTransitionError`.

5. **Given** all existing V1 code that switches on `IdeaStatus`,
   **When** TypeScript is compiled,
   **Then** zero `noImplicitReturns` or exhaustive switch errors occur — every switch either handles `DRAFT` or uses a satisfying `default` branch.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                    | Expected Behavior                                                                                                                     |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Migration adds `DRAFT` enum value to a PostgreSQL enum type | PostgreSQL `ALTER TYPE ... ADD VALUE` is used; this is a non-destructive DDL operation                                                |
| 2   | A `DRAFT` idea appears in the admin ideas list query        | The admin ideas query must explicitly exclude `DRAFT` status unless SUPERADMIN — added to query `where: { status: { not: 'DRAFT' } }` |
| 3   | A `SUBMITTER` searches for ideas and sees their own drafts  | The `/ideas` public list must exclude `DRAFT` — only `/my-ideas` (Drafts tab, US-028) shows drafts to the author                      |

---

## UI / UX Notes

N/A — schema and state machine only.

---

## Technical Notes

- Add `DRAFT` to the `IdeaStatus` enum in `schema.prisma`.
- Add `draftExpiresAt DateTime?` to the `Idea` model.
- Update `lib/state-machine/idea-state-machine.ts`:
  ```ts
  VALID_TRANSITIONS: {
    DRAFT: ['SUBMITTED'],
    SUBMITTED: ['UNDER_REVIEW'],
    UNDER_REVIEW: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: [],
    REJECTED: [],
  }
  ```
- Run `grep -r "IdeaStatus\|switch.*status" --include="*.ts" --include="*.tsx"` and audit every switch statement to add a `DRAFT` case or `default`.
- **Feature Flag**: `FEATURE_DRAFT_ENABLED` — the enum value is added regardless of the flag; the flag only controls the UI flow.

---

## Dependencies

| Dependency                            | Type   | Status                 | Blocker? |
| ------------------------------------- | ------ | ---------------------- | -------- |
| `IdeaStatus` enum exists in V1 schema | Schema | Exists                 | No       |
| `lib/state-machine/` exists           | Code   | Exists in V1           | No       |
| US-027 — Save Draft Server Action     | Story  | Must follow this story | No       |

---

## Test Plan

### Manual Testing

- [ ] `prisma migrate dev` applies cleanly — `DRAFT` value present in `IdeaStatus` enum
- [ ] `draftExpiresAt` column is nullable on `Idea` table
- [ ] Admin ideas list does not show `DRAFT` ideas

### Automated Testing

- [ ] Unit: state machine permits `DRAFT → SUBMITTED`
- [ ] Unit: state machine throws `InvalidTransitionError` for `DRAFT → UNDER_REVIEW`
- [ ] Unit: state machine throws for `DRAFT → ACCEPTED`
- [ ] TypeScript: `tsc --noEmit` passes with zero errors after switch-statement audit

---

## Definition of Done

- [ ] `DRAFT` enum value + `draftExpiresAt` migration applied
- [ ] State machine handles `DRAFT` as a valid status with only `SUBMITTED` as a valid transition target
- [ ] All existing switch statements handle `DRAFT` without TypeScript errors
- [ ] Admin queries exclude `DRAFT` ideas
- [ ] `git commit: feat(drafts): DRAFT status enum, draftExpiresAt, state machine update`
