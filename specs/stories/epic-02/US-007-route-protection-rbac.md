# User Story: Route Protection, RBAC & Superadmin Seed

**Story ID**: US-007  
**Epic**: EPIC-02 — Authentication & Role Management  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: M  
**Sprint**: Day 1 — PM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As a** system administrator,  
**I want to** automatically receive the `SUPERADMIN` role on first deploy and have Next.js middleware enforce role-based access on every route,  
**so that** unauthorized users can never access admin-only pages and the platform has a securely bootstrapped admin account.

---

## Context & Motivation

Without route protection, any authenticated user could navigate to `/admin` by typing the URL. This story closes that surface area permanently. The superadmin seed ensures there is always at least one admin who can promote others via the user management table.

---

## Acceptance Criteria

1. **Given** `SUPERADMIN_EMAIL` is set in the environment and a User with that email exists,  
   **When** `npx prisma db seed` is run,  
   **Then** that User's `role` is updated to `SUPERADMIN`.

2. **Given** I am logged in as `SUBMITTER` and navigate to `/admin`,  
   **When** Next.js middleware evaluates the request,  
   **Then** I receive a 403 Forbidden page with the message "You don't have permission to access this page."

3. **Given** I am logged in as `ADMIN` or `SUPERADMIN` and navigate to `/admin`,  
   **When** the page loads,  
   **Then** the admin dashboard renders correctly.

4. **Given** I am `SUPERADMIN` and visit `/admin/users`,  
   **When** the page loads,  
   **Then** I see a table of all users with their email, display name, role, and a role selector to promote/demote them.

5. **Given** `FEATURE_USER_MANAGEMENT_ENABLED=false`,  
   **When** `/admin/users` is visited,  
   **Then** the page returns 404 or redirects to `/admin`.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | `SUPERADMIN_EMAIL` matches no user in DB | Seed script logs warning; no crash |
| 2 | SUPERADMIN tries to demote themselves | Server action rejects: "You cannot change your own role." |
| 3 | ADMIN tries to promote a user to SUPERADMIN | Server action rejects: "Only SUPERADMIN can assign SUPERADMIN role." |
| 4 | JWT contains stale role (updated in DB) | Role is read from DB on each protected server action, not only from JWT |

---

## UI / UX Notes

- Forbidden page `/403`: centered layout, role-aware message, "Go back" button
- `/admin/users` table columns: Avatar, Display Name, Email, Role (select dropdown), Last Updated
- Role change is instant (optimistic update with toast fallback)

---

## Technical Notes

- Middleware: `middleware.ts` at project root using `auth()` from NextAuth v5
- Protected paths: `/dashboard`, `/ideas/new`, `/admin/*` — use `matcher` config
- Role check in Server Actions: `const session = await auth(); if (session.user.role !== 'ADMIN') throw new Error('Forbidden')`
- Seed script: `prisma/seed.ts` — `npx prisma db seed` reads `SUPERADMIN_EMAIL`, calls `prisma.user.update({ where: { email }, data: { role: 'SUPERADMIN' } })`
- Server Action for role change: `updateUserRole(userId, newRole)` — validates caller is SUPERADMIN or (ADMIN promoting below SUPERADMIN)
- **Feature Flag**: `FEATURE_USER_MANAGEMENT_ENABLED`

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-006 — Login / session | Story | Session needed for middleware | Yes |
| US-002 — Prisma `User.role` | Story | Role field required | Yes |
| `SUPERADMIN_EMAIL` env var | Config | Set at deploy time | Yes |

---

## Test Plan

### Manual Testing
- [ ] Seed script sets role to SUPERADMIN for configured email
- [ ] SUBMITTER navigates to `/admin` → 403
- [ ] ADMIN navigates to `/admin` → dashboard renders
- [ ] SUPERADMIN visits `/admin/users` → user table visible
- [ ] SUPERADMIN promotes user to ADMIN → role updates in DB
- [ ] SUPERADMIN tries to demote themselves → error toast

### Automated Testing
- [ ] Unit: seed function updates role correctly
- [ ] Unit: middleware returns 403 for SUBMITTER on `/admin/*`
- [ ] Integration: `updateUserRole` rejects self-demotion
- [ ] E2E: SUBMITTER login → attempt `/admin` → 403 page

---

## Definition of Done

- [ ] Seed script runs without errors
- [ ] Middleware enforces role checks on every protected route
- [ ] 403 page displayed for unauthorized access
- [ ] User management table functional (with flag)
- [ ] SUPERADMIN cannot demote themselves
- [ ] All AC passing
- [ ] `git commit: feat(auth): rbac middleware and superadmin seed`
