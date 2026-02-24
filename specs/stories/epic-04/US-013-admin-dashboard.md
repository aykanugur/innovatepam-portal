# User Story: Admin Dashboard

**Story ID**: US-013  
**Epic**: EPIC-04 — Evaluation Workflow, Admin Tools & Quality Gate  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: S  
**Sprint**: Day 2 — PM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As an** ADMIN or SUPERADMIN,  
**I want to** see a dashboard with real-time idea counts by status and a queue of ideas awaiting review,  
**so that** I can quickly understand the health of the innovation pipeline and prioritize my review work.

---

## Context & Motivation

Admins need at-a-glance insight without digging through paginated lists. A stat card grid and a prioritized pending-review queue reduce time-to-review and ensure no submissions are forgotten.

---

## Acceptance Criteria

1. **Given** I am logged in as ADMIN or SUPERADMIN and visit `/admin`,  
   **When** the page loads,  
   **Then** I see four stat cards: Total Ideas | Submitted | Under Review | Accepted | Rejected, each showing the correct count.

2. **Given** one or more ideas have `status=SUBMITTED`,  
   **When** the dashboard loads,  
   **Then** a "Pending Review" section lists those ideas ordered by `createdAt ASC` (oldest first) with a "Review" CTA on each row.

3. **Given** all submitted ideas have been reviewed,  
   **When** the dashboard loads,  
   **Then** the "Pending Review" section shows: "No ideas awaiting review. Great work!"

4. **Given** I click the "Review" CTA on a pending idea,  
   **When** navigating,  
   **Then** I am taken to `/admin/review/<ideaId>`.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | SUBMITTER navigates to `/admin` | Middleware returns 403 |
| 2 | Stat counts are stale (page cached) | Use `cache: 'no-store'` fetch or `revalidatePath('/admin')` after review actions |

---

## UI / UX Notes

- Route: `/admin`
- Layout: stat cards in a responsive grid (2-col on sm, 4-col on lg+)
- Stat card: large number + label + colored border (submitted=gray, under_review=yellow, accepted=green, rejected=red)
- Pending Review table: columns — Title, Author, Category, Submitted (relative time), Actions
- "Review" CTA: outlined button → `/admin/review/<id>`

---

## Technical Notes

- Server Component
- Queries (can be parallelized with `Promise.all`):
  - `prisma.idea.count({ where: { status: 'SUBMITTED' } })` etc.
  - `prisma.idea.findMany({ where: { status: 'SUBMITTED' }, orderBy: { createdAt: 'asc' }, include: { author: { select: { displayName: true } } } })`
- After `startReview` / `finalizeReview` Server Actions: call `revalidatePath('/admin')` to force fresh data
- **Feature Flag**: None

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-007 — RBAC | Story | Admin route protection | Yes |
| US-012 — Evaluation workflow | Story | Review CTA links to review page | Yes |
| US-008 — Submit idea form | Story | Ideas must exist | Yes |

---

## Test Plan

### Manual Testing
- [ ] Stat cards show correct counts
- [ ] Pending review queue shows SUBMITTED ideas oldest-first
- [ ] Empty state shown when queue is clear
- [ ] Click "Review" → navigate to review page

### Automated Testing
- [ ] Integration: count queries return correct values per status
- [ ] Integration: `revalidatePath` triggered after review action
- [ ] E2E: Submit idea → admin dashboard shows +1 pending

---

## Definition of Done

- [ ] Stat cards show live counts by status
- [ ] Pending review queue shows correct ideas
- [ ] "Review" CTA navigates to correct page
- [ ] Counts update after review actions (no stale cache)
- [ ] All AC passing
- [ ] `git commit: feat(admin): admin dashboard`
