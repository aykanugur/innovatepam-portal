# User Story: Evaluation Workflow

**Story ID**: US-012  
**Epic**: EPIC-04 — Evaluation Workflow, Admin Tools & Quality Gate  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: M  
**Sprint**: Day 2 — PM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As an** ADMIN or SUPERADMIN,  
**I want to** start reviewing a submitted idea and either accept or reject it with a mandatory comment,  
**so that** submitters receive transparent feedback and the idea's lifecycle is clearly tracked.

---

## Context & Motivation

The evaluation workflow is the core admin function that closes the loop for submitters. Without it, ideas pile up in `SUBMITTED` status with no outcome. The state machine prevents invalid transitions (e.g., accepting an already-rejected idea) and keeps the data model consistent.

---

## Acceptance Criteria

1. **Given** I am ADMIN and visit `/admin/review/<ideaId>`,  
   **When** the page loads,  
   **Then** I see the full idea detail and two actions: "Accept" and "Reject" — both disabled if the idea is already reviewed.

2. **Given** I click "Start Review",  
   **When** the action runs,  
   **Then** `Idea.status` is updated to `UNDER_REVIEW` and the idea is locked from editing by the submitter.

3. **Given** I click "Accept" and submit a comment,  
   **When** the action runs,  
   **Then** an `IdeaReview` record is created with `decision=ACCEPTED`, `Idea.status` is set to `ACCEPTED`, and the submitter's detail page shows the decision.

4. **Given** I click "Reject" and the comment field is empty,  
   **When** I try to submit,  
   **Then** I see the validation error: "A comment is required when rejecting an idea."

5. **Given** the idea was submitted by me (I am both admin and the author),  
   **When** I try to review it,  
   **Then** I receive a 403 error: "You cannot review your own idea."

---

## State Machine

```
SUBMITTED → UNDER_REVIEW → ACCEPTED
                         → REJECTED
```

Invalid transitions are rejected by the Server Action.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | Two admins start reviewing the same idea simultaneously | Optimistic lock: first write wins; second gets: "This idea is already under review by another admin." |
| 2 | Admin accepts idea twice | Guard: `if (idea.review) throw new Error('Already reviewed')` |
| 3 | SUBMITTER accesses `/admin/review/<id>` | Middleware returns 403 |

---

## UI / UX Notes

- Route: `/admin/review/[ideaId]`
- Layout: two-column on desktop — idea detail (left), review action panel (right)
- Action panel:
  - "Start Review" button (only if `status=SUBMITTED`)
  - Once `UNDER_REVIEW`: "Accept" (green) + "Reject" (red) buttons
  - Comment textarea (required for reject; recommended for accept — enforce required on reject only)
  - Submit button: "Finalize Decision"
- Post-decision: panel shows read-only decision card; buttons hidden

---

## Technical Notes

- Server Actions: `startReview(ideaId)`, `finalizeReview(ideaId, decision, comment)`
- Guard: `if (idea.authorId === session.user.id) throw new ForbiddenError()`
- Guard: `if (idea.review) throw new Error('Already reviewed')`
- Transition `startReview`: `prisma.idea.update({ where: { id }, data: { status: 'UNDER_REVIEW' } })`
- `finalizeReview`: wraps in `prisma.$transaction([update Idea, create IdeaReview])`
- **Feature Flag**: None

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-007 — RBAC | Story | Admin route protection | Yes |
| US-010 — Idea detail page | Story | Reuses idea detail component | Yes |
| US-002 — Prisma `IdeaReview` model | Story | Data persistence | Yes |

---

## Test Plan

### Manual Testing
- [ ] Start review → status changes to UNDER_REVIEW
- [ ] Accept with comment → idea shows ACCEPTED; review card visible on detail page
- [ ] Reject with no comment → validation error
- [ ] Reject with comment → idea shows REJECTED
- [ ] Review own idea → 403 error
- [ ] Re-review an already-reviewed idea → error

### Automated Testing
- [ ] Unit: `finalizeReview` rejects self-review
- [ ] Unit: `finalizeReview` requires comment on reject
- [ ] Integration: transaction creates IdeaReview + updates Idea.status atomically
- [ ] E2E: ADMIN login → start review → accept → verify detail page

---

## Definition of Done

- [ ] State machine enforced (SUBMITTED → UNDER_REVIEW → ACCEPTED/REJECTED)
- [ ] Self-review prevention active
- [ ] Reject requires mandatory comment
- [ ] Accept/Reject persisted in `IdeaReview` + `Idea.status` atomically
- [ ] All AC passing
- [ ] `git commit: feat(admin): evaluation workflow`
