# User Story: My Ideas Page

**Story ID**: US-011  
**Epic**: EPIC-03 — Idea Submission & Discovery  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: XS  
**Sprint**: Day 2 — AM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As an** authenticated employee,  
**I want to** see all the ideas I have submitted in one place with their current statuses,  
**so that** I can track the progress of my submissions without searching the full list.

---

## Context & Motivation

The global ideas list mixes submissions from everyone. Employees need a personal view to track just their own ideas and understand which are under review, accepted, or rejected. This drives re-engagement with the platform.

---

## Acceptance Criteria

1. **Given** I am logged in and visit `/ideas/mine`,  
   **When** the page loads,  
   **Then** I see only the ideas I submitted, ordered by `createdAt DESC`, with status badges.

2. **Given** I have submitted zero ideas,  
   **When** `/ideas/mine` loads,  
   **Then** I see the empty state: "You haven't submitted any ideas yet." with a "Submit Your First Idea" button.

3. **Given** I have submitted both PUBLIC and PRIVATE ideas,  
   **When** the page loads,  
   **Then** both are shown (this is my personal view — no visibility filtering).

4. **Given** I click on an idea card,  
   **When** navigating,  
   **Then** I am taken to the idea's detail page `/ideas/<id>`.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | Another user manually types `/ideas/mine` while logged in as a different account | Shows their own ideas (session-scoped — always safe) |
| 2 | Ideas deleted by admin still cached | Server Component re-fetches on each request; no stale data |

---

## UI / UX Notes

- Route: `/ideas/mine`
- Same card layout as `/ideas` but no visibility/author filters (always scoped to `session.user.id`)
- Tab navigation in header: "All Ideas" | "My Ideas" — "My Ideas" active
- No pagination needed for alpha (P2 optimization if user has >50 ideas)

---

## Technical Notes

- Server Component: `const ideas = await prisma.idea.findMany({ where: { authorId: session.user.id }, orderBy: { createdAt: 'desc' }, include: { review: true } })`
- No RBAC complexity — always scoped to session user
- Reuse idea card component from US-009
- **Feature Flag**: None

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-008 — Submit idea form | Story | Ideas must exist | Yes |
| US-009 — Idea list page | Story | Reuses idea card component | Yes |

---

## Test Plan

### Manual Testing
- [ ] Own ideas appear; other users' ideas do not
- [ ] Both PUBLIC and PRIVATE own ideas visible
- [ ] Empty state with CTA shown when no ideas submitted
- [ ] Click card → navigate to detail page

### Automated Testing
- [ ] Integration: query with `authorId=session.user.id` returns only own ideas
- [ ] Integration: empty result returns `[]` (not 404)

---

## Definition of Done

- [ ] `/ideas/mine` shows only current user's ideas
- [ ] Empty state renders correctly
- [ ] Both PUBLIC and PRIVATE ideas visible on personal view
- [ ] Clicking a card navigates to detail page
- [ ] All AC passing
- [ ] `git commit: feat(ideas): my ideas page`
