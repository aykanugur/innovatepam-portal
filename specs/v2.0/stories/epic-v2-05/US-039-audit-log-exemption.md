# User Story: Audit Log Exemption from Blind Review Masking

**Story ID**: US-039
**Epic**: EPIC-V2-05 — Blind Review
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 6 — Step 4
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** admin viewing the audit log for a blind-review idea,
**I want to** see the true actor names on all audit entries,
**so that** accountability and traceability are maintained even when blind review is active.

---

## Context & Motivation

The `maskAuthorIfBlind()` function from US-038 masks the submitter identity in idea detail and review panel views. The audit log must be explicitly excluded from this masking — audit traceability is a hard compliance requirement that supersedes the objectivity benefit of blind review. Without this story, a developer might accidentally apply the masking helper to the audit log query and silently break accountability.

---

## Acceptance Criteria

1. **Given** a blind-review pipeline with an idea currently `UNDER_REVIEW`,
   **When** an ADMIN views the audit log section on the idea detail page,
   **Then** all `AuditLog` entries show the true `actor.displayName` and `actor.email` — not "Anonymous Submitter".

2. **Given** the audit log query,
   **When** code review is performed,
   **Then** a code comment is present on the audit log DB query: `// Blind review masking is intentionally NOT applied here — audit traceability supersedes objectivity. See PRD V2.0 Section 9.`

3. **Given** a unit test for the audit log query,
   **When** `pipeline.blindReview = true` and `idea.status = UNDER_REVIEW`,
   **Then** the audit log Server Action returns the true actor `displayName`.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                                         | Expected Behavior                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | A new developer adds a generic "apply masking to all idea queries" helper that wraps the audit log query         | The code comment serves as a documentation guard; the unit test (AC-3) catches the regression                                                  |
| 2   | Audit log is fetched via a different code path (e.g., a new `/api/audit/[ideaId]` route added in a future story) | The `maskAuthorIfBlind()` function must not be called in that route — the comment and test serve as the contract that audit is always unmasked |

---

## UI / UX Notes

No UI changes. The audit log already renders actor names — this story ensures the query feeding it never applies blind review masking.

---

## Technical Notes

- The audit log is fetched in the idea detail page via a Server Action or included in the idea query: `prisma.auditLog.findMany({ where: { ideaId }, include: { actor: { select: { displayName: true, email: true } } } })`.
- `maskAuthorIfBlind()` is NOT called on the `actor` object from audit log entries.
- Add the comment to the audit log query:
  ```ts
  // Blind review masking is intentionally NOT applied here — audit traceability supersedes objectivity.
  // See PRD V2.0 Section 9 (EC-6.1). Do NOT add maskAuthorIfBlind() calls to this query.
  const auditLogs = await prisma.auditLog.findMany(...)
  ```
- **Feature Flag**: Not applicable — audit log is always unmasked regardless of any feature flag.

---

## Dependencies

| Dependency                                                                                           | Type  | Status             | Blocker? |
| ---------------------------------------------------------------------------------------------------- | ----- | ------------------ | -------- |
| US-038 — `maskAuthorIfBlind()` utility (defines the masking function this story explicitly excludes) | Story | Must be done first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] With blind review active on a pipeline, admin views an idea's audit log → true actor names shown (not "Anonymous Submitter")

### Automated Testing

- [ ] Unit: audit log Server Action returns real actor `displayName` when `pipeline.blindReview=true` and `idea.status=UNDER_REVIEW`
- [ ] Code review check: search for `maskAuthorIfBlind` calls near audit log queries — none should exist

---

## Definition of Done

- [ ] No `maskAuthorIfBlind()` call in the audit log query path
- [ ] Explanatory code comment placed on the audit log DB query
- [ ] Unit test asserts audit log returns true actor data regardless of blind review state
- [ ] `git commit: feat(blind-review): audit log exemption from identity masking`
