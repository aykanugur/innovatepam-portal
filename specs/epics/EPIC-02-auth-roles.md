# Epic: Authentication & Role Management

**Epic ID**: EPIC-02  
**Owner**: Aykan Uğur — Admin  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Target Release**: Day 1 — Afternoon (Alpha)  
**PRD Reference**: [specs/prd-innovatepam.md](../prd-innovatepam.md)

---

## 1. Summary

Implement secure user registration with email verification, login, logout, and role-based access control (SUBMITTER / ADMIN / SUPERADMIN) using NextAuth.js v5 with a credentials provider. Seeds the first superadmin account via environment variable.

---

## 2. Business Context

### 2.1 Strategic Alignment
- **Company Goal**: Ensure only verified EPAM employees access the portal, and only authorized admins can evaluate ideas.
- **Product Vision Fit**: Authentication is the trust layer — without it, the portal is open and insecure.

### 2.2 Business Value
| Value Driver | Description | Estimated Impact |
|-------------|-------------|-----------------|
| Security | Verified-email-only access prevents unauthorized idea submissions | Baseline security requirement |
| Role integrity | RBAC ensures admins cannot be impersonated by submitters | Prevents evaluation fraud |

### 2.3 Cost of Delay
Without auth, every subsequent page is either publicly exposed or non-functional. EPIC-03 and EPIC-04 both depend on `session.user.role`.

---

## 3. Scope

### 3.1 In Scope
- Register page (`/register`): email + password form
- Email verification flow (Resend API, 24h expiry token)
- Login page (`/login`): email + password, session creation
- Logout: server-side session destruction
- Middleware: protect all `/ideas`, `/admin`, `/profile`, `/my-ideas` routes
- RBAC: `SUBMITTER`, `ADMIN`, `SUPERADMIN` roles enforced server-side
- Superadmin seeding via `SUPERADMIN_EMAIL` env variable on first run
- User management page (`/admin/users`): superadmin promotes/demotes users (FR-07, FR-08)

### 3.2 Out of Scope
- OAuth / SSO (deferred to Phase 2)
- Password reset flow (deferred to Phase 2)
- Account deletion (deferred to Phase 2)

### 3.3 Assumptions
- Resend free tier (100 emails/day) is sufficient for alpha and GA
- Email verification link format: `/auth/verify?token=[JWT]`
- `SUPERADMIN_EMAIL` env var is set before first deployment

---

## 4. User Personas

| Persona | Role | Primary Need |
|---------|------|-------------|
| Elif (Submitter) | New employee registering | Create an account quickly, verify email, and log in |
| Deniz (Admin) | Innovation PM | Trusted admin role that cannot be assumed by regular users |
| Aykan (Superadmin) | Portal owner | Bootstrap first admin account; promote reviewers |

---

## 5. Feature Breakdown

### Feature 1: Registration & Email Verification — Must Have
**Description**: `/register` page with validated form. On submit, creates `User` with `emailVerified = false`, sends verification email via Resend. Clicking link sets `emailVerified = true`.

**User Stories**:
- [ ] US-01-a: As an employee, I can register with email + password so I get an account
- [ ] US-01-b: As a registrant, I receive a verification email and confirming it activates my account

**Acceptance Criteria**:
1. Password must be ≥ 8 chars, 1 uppercase, 1 lowercase, 1 number — validated on client and server
2. Duplicate email returns: "An account with this email already exists."
3. Verification email sent within 60 seconds; token expires after 24 hours
4. Unverified users are redirected to a "check your email" page on login attempt

**Estimated Effort**: M

---

### Feature 2: Login & Logout — Must Have
**Description**: `/login` page using NextAuth credentials provider. Session cookie created on success. Logout destroys session server-side.

**User Stories**:
- [ ] US-02-a: As a verified user, I can log in and am redirected to `/ideas`
- [ ] US-02-b: As a logged-in user, I can log out and my session is invalidated

**Acceptance Criteria**:
1. Valid credentials → redirect to `/ideas` within 2 seconds
2. Invalid credentials → "Invalid email or password." (no field-level specificity)
3. Logout → redirect to `/login`; subsequent authenticated requests return 401

**Estimated Effort**: S

---

### Feature 3: Route Protection Middleware — Must Have
**Description**: Next.js middleware protects all authenticated routes. Unauthenticated users are redirected to `/login`. Admin-only routes (`/admin/*`) return 403 for non-admins.

**User Stories**:
- [ ] US-06-a: As the system, I redirect unauthenticated users to `/login` on protected routes
- [ ] US-06-b: As the system, I return HTTP 403 if a submitter calls an admin-only endpoint

**Acceptance Criteria**:
1. `GET /ideas` while logged out → redirect to `/login?callbackUrl=/ideas`
2. `POST /api/ideas/:id/evaluate` with submitter session → HTTP 403
3. After login, user is returned to their originally requested URL

**Estimated Effort**: S

---

### Feature 4: Superadmin Seed & User Management — Must Have
**Description**: On server start, if `SUPERADMIN_EMAIL` env var exists and no superadmin account exists, promote that account to SUPERADMIN. `/admin/users` page lists all users with role controls.

**User Stories**:
- [ ] US-06-c: As a superadmin, I can promote a submitter to admin from the user management page
- [ ] US-06-d: As a superadmin, I can demote an admin back to submitter

**Acceptance Criteria**:
1. Seeding runs as a Prisma seed script (`prisma/seed.ts`): checks for `SUPERADMIN_EMAIL`, upserts role
2. `/admin/users` shows paginated user list with current role and a role toggle button
3. Role change takes effect immediately — next request from affected user uses new role without re-login

**Estimated Effort**: M

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)
| Dependency | Type | Status | Risk |
|-----------|------|--------|------|
| EPIC-01 — Prisma `User` model | Internal | Must be complete | Low |
| Resend API key | External | Free tier, configure in `.env.local` | Med |

### 6.2 Blocking (Downstream)
| Dependent | Impact if Delayed |
|----------|------------------|
| EPIC-03 (Ideas) | Cannot gate idea submission behind `session.user` |
| EPIC-04 (Evaluation) | Cannot enforce admin-only evaluation without RBAC |

---

## 7. UX / Design
- **Pages**: `/register`, `/login`, `/admin/users`
- Login and register pages: centered card layout, EPAM brand colors, responsive
- Error messages: inline red text beneath relevant field
- Loading state: button shows spinner while auth request is in flight

---

## 8. Technical Notes
- Use `next-auth` v5 (Auth.js) with `CredentialsProvider`
- `NEXTAUTH_SECRET` must be a 32+ char random string
- Verification token: short-lived JWT (24h), signed with `NEXTAUTH_SECRET`, stored in DB as `verificationToken` on `User`
- Seed script: `prisma/seed.ts` — run via `prisma db seed`
- Feature flag: `FEATURE_EMAIL_VERIFICATION_ENABLED=true|false` — if `false`, auto-verify on registration (useful for alpha)

---

## 9. Milestones & Timeline

| Milestone | Features | Target | Exit Criteria |
|-----------|---------|--------|---------------|
| M1 — Auth Core | Features 1-3 | Day 1, 18:00 | Register → verify email → login → see `/ideas` works E2E |
| M2 — Admin Seeding | Feature 4 | Day 2, 10:00 | Superadmin can log in and promote a user |

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Register → login E2E | < 3 minutes for a new user |
| Auth API response | < 500ms at P95 |
| RBAC enforcement | 100% of admin endpoints return 403 for submitter role |

---

## 11. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Resend API unavailable | Low | High | Set `FEATURE_EMAIL_VERIFICATION_ENABLED=false` in alpha; auto-verify accounts |
| 2 | NextAuth v5 breaking change | Low | Med | Pin to specific v5 release tag; test against it in scaffold |

---

## 12. Open Questions

| # | Question | Owner | Status |
|---|---------|-------|--------|
| 1 | Should email verification be enforced in alpha or behind a flag? | Aykan Uğur | Open — resolved in PRD Open Questions |

---

## Appendix: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-02-24 | Aykan Uğur | Initial draft |
