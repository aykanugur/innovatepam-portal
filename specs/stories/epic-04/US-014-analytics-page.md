# User Story: Analytics Page

**Story ID**: US-014  
**Epic**: EPIC-04 — Evaluation Workflow, Admin Tools & Quality Gate  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P3 (Could)  
**Estimate**: S  
**Sprint**: Day 3 — AM (cut-first candidate)  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As a** SUPERADMIN,  
**I want to** view an analytics page with charts showing ideas by category, status trend over time, and top contributors,  
**so that** I can report on the innovation pipeline's health to stakeholders.

---

## Context & Motivation

This is a P3 (Could) feature. It is explicitly a **cut-first candidate** if the 3-day timeline is at risk. The `FEATURE_ANALYTICS_ENABLED` flag must be respected — when `false`, this page returns 404. This will only be built if EPIC-01 through EPIC-04 core stories are completed with time remaining.

---

## Acceptance Criteria

1. **Given** `FEATURE_ANALYTICS_ENABLED=true` and I am SUPERADMIN,  
   **When** I visit `/admin/analytics`,  
   **Then** I see three charts: (a) bar chart — ideas by category, (b) line chart — ideas submitted per day over last 30 days, (c) leaderboard table — top 5 contributors by idea count.

2. **Given** `FEATURE_ANALYTICS_ENABLED=false`,  
   **When** I visit `/admin/analytics`,  
   **Then** the page returns 404.

3. **Given** I am ADMIN (not SUPERADMIN),  
   **When** I visit `/admin/analytics`,  
   **Then** I receive 403 Forbidden.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | No ideas in DB | Charts render empty/zero states (not blank white) |
| 2 | All ideas from one user | Leaderboard shows that user as rank #1 only |

---

## UI / UX Notes

- Route: `/admin/analytics`
- Chart library: `recharts` (lightweight, Tailwind-compatible)
- Charts use brand accent colors from Tailwind CSS v4 tokens
- Responsive: charts stack vertically on mobile

---

## Technical Notes

- Flag check at route level: `if (!process.env.FEATURE_ANALYTICS_ENABLED) return notFound()`
- Role check: `if (session.user.role !== 'SUPERADMIN') return forbidden()`
- Aggregation queries:
  - By category: `prisma.idea.groupBy({ by: ['category'], _count: true })`
  - By day: raw query or aggregated in JS from `prisma.idea.findMany({ select: { createdAt: true } })`
  - Top contributors: `prisma.idea.groupBy({ by: ['authorId'], _count: true, orderBy: { _count: { authorId: 'desc' } }, take: 5 })`
- **Feature Flag**: `FEATURE_ANALYTICS_ENABLED`

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-013 — Admin dashboard | Story | Admin navigation exists | Yes |
| US-007 — RBAC | Story | Role check | Yes |
| `recharts` package | Package | Install if this story is built | No |

---

## Test Plan

### Manual Testing
- [ ] Analytics page renders three charts with real data
- [ ] `FEATURE_ANALYTICS_ENABLED=false` → 404
- [ ] ADMIN role (not SUPERADMIN) → 403
- [ ] Empty DB → charts show zero states

### Automated Testing
- [ ] Unit: aggregate queries return correct structure

---

## Definition of Done

- [ ] Three charts render with live data
- [ ] Feature flag returns 404 when disabled
- [ ] SUPERADMIN-only access enforced
- [ ] Empty states handled gracefully
- [ ] All AC passing
- [ ] `git commit: feat(admin): analytics page`

---

## Risk Note

> **CUT-FIRST CANDIDATE**: If Day 3 is at risk, skip this story entirely. Set `FEATURE_ANALYTICS_ENABLED=false` and move on. The flag ensures the missing page does not break anything.
