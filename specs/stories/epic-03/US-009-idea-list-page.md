# User Story: Idea List Page

**Story ID**: US-009  
**Epic**: EPIC-03 — Idea Submission & Discovery  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: S  
**Sprint**: Day 2 — AM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As an** authenticated employee,  
**I want to** browse all public ideas in a paginated list with status badges and category filters,  
**so that** I can discover what colleagues are working on and avoid submitting duplicate ideas.

---

## Context & Motivation

The idea list is the primary discovery surface of the platform. Without it, employees work in silos and end up submitting duplicates. Pagination keeps the page performant even at hundreds of ideas.

---

## Acceptance Criteria

1. **Given** I am logged in and visit `/ideas`,  
   **When** the page loads,  
   **Then** I see a list of all `PUBLIC` ideas (and my own `PRIVATE` ideas) ordered by `createdAt DESC`, max 20 per page.

2. **Given** there are more than 20 ideas,  
   **When** I click "Next",  
   **Then** the next 20 ideas load without a full page reload (client-side navigation or Server Component streaming).

3. **Given** I select a category filter (e.g., "Cost Reduction"),  
   **When** the filter is applied,  
   **Then** only ideas matching that category are shown, and the URL updates to `/ideas?category=cost-reduction`.

4. **Given** there are no ideas matching the current filter,  
   **When** the list renders,  
   **Then** I see the empty state: "No ideas found. Be the first to submit one!" with a "Submit Idea" button.

5. **Given** an idea has `status=ACCEPTED`,  
   **When** it appears in the list,  
   **Then** a green "Accepted" badge is visible on the card.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | PRIVATE idea owned by another user | Never appears in the list for non-admins |
| 2 | ADMIN/SUPERADMIN views the list | Also sees all PRIVATE ideas (all authors) |
| 3 | Page number exceeds total pages | Show empty state or redirect to last valid page |

---

## UI / UX Notes

- Route: `/ideas`
- Card layout: grid (2-col on md+, 1-col on mobile)
- Each card: Title, Author display name, Category chip, Status badge (color-coded), `createdAt` relative time ("3 hours ago")
- Filter bar (top): Category dropdown + Status dropdown + Search input (stretch goal)
- Pagination: "Previous / Page X of Y / Next" controls
- Loading state: skeleton cards

---

## Technical Notes

- Server Component with searchParams for `page`, `category`, `status`
- Query: `prisma.idea.findMany({ where: { OR: [{ visibility: 'PUBLIC' }, { authorId: session.user.id }] }, orderBy: { createdAt: 'desc' }, skip, take: 20, include: { author: { select: { displayName: true } } } })`
- For ADMIN: remove the `OR` filter; show all ideas
- Status badge colors: `SUBMITTED`=gray, `UNDER_REVIEW`=yellow, `ACCEPTED`=green, `REJECTED`=red
- **Feature Flag**: None

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-008 — Submit idea form | Story | Ideas must exist to list | Yes |
| US-007 — RBAC | Story | Admin visibility logic | Yes |

---

## Test Plan

### Manual Testing
- [ ] List shows PUBLIC ideas ordered by newest first
- [ ] My own PRIVATE ideas appear; other users' PRIVATE ideas do not
- [ ] Category filter narrows results; URL updates
- [ ] Empty filter state shows empty state message
- [ ] Status badges correct colors

### Automated Testing
- [ ] Integration: query returns only PUBLIC + own PRIVATE ideas for SUBMITTER
- [ ] Integration: ADMIN query returns all ideas
- [ ] Integration: pagination returns correct `skip`/`take` slices
- [ ] E2E: Filter by category → verify correct ideas shown

---

## Definition of Done

- [ ] Paginated idea list renders correctly
- [ ] Visibility rules enforced (SUBMITTER vs ADMIN)
- [ ] Category filter works with URL state
- [ ] Empty state shown when no results
- [ ] Status badges color-coded
- [ ] All AC passing
- [ ] `git commit: feat(ideas): idea list page`
