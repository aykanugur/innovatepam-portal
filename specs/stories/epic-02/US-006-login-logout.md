# User Story: Login & Logout

**Story ID**: US-006  
**Epic**: EPIC-02 — Authentication & Role Management  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: S  
**Sprint**: Day 1 — PM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As a** registered employee,  
**I want to** sign in with my email and password and sign out when I'm done,  
**so that** my session is secure and my account is protected when I leave the browser.

---

## Context & Motivation

Login and logout are the core session management actions. Without them, no authenticated feature can be accessed. NextAuth.js v5 credentials provider handles the session securely via HTTP-only cookies.

---

## Acceptance Criteria

1. **Given** I have a verified account and visit `/login`,  
   **When** I submit valid credentials,  
   **Then** a secure session cookie is created and I am redirected to `/dashboard`.

2. **Given** I submit an incorrect password,  
   **When** the form is submitted,  
   **Then** I see the error: "Invalid email or password." (no indication of which field is wrong).

3. **Given** `FEATURE_EMAIL_VERIFICATION_ENABLED=true` and my email is not yet verified,  
   **When** I attempt to log in with correct credentials,  
   **Then** I see: "Please verify your email before signing in."

4. **Given** I am logged in and click "Sign Out",  
   **When** the action completes,  
   **Then** my session is destroyed, the session cookie is cleared, and I am redirected to `/login`.

5. **Given** I am not logged in and try to access `/dashboard`,  
   **When** Next.js middleware evaluates the route,  
   **Then** I am redirected to `/login?callbackUrl=/dashboard` and, after successful login, redirected back to `/dashboard`.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | Brute-force login attempts | Rate-limit after 5 failed attempts per 15 min per IP (use `upstash/ratelimit` or simple in-memory limiter) |
| 2 | Session cookie stolen / tampered | `NEXTAUTH_SECRET` signs cookie; invalid signatures auto-reject |
| 3 | User account deleted while session active | On next request, NextAuth returns null session; middleware redirects to `/login` |

---

## UI / UX Notes

- Route: `/login`
- Fields: Email, Password (show/hide toggle)
- CTAs: "Sign In" (primary), "Forgot password?" link (out-of-scope for v1 — hide or disable)
- Link: "Don't have an account? Register"
- Inline error below form on failure
- Redirect to `callbackUrl` after success

---

## Technical Notes

- Auth provider: `CredentialsProvider` in `auth.ts` (NextAuth.js v5)
- Validate with `bcrypt.compare(password, user.passwordHash)`
- Reject login if `!user.emailVerified && FEATURE_EMAIL_VERIFICATION_ENABLED`
- Session strategy: `jwt` (stateless, no DB session table needed)
- `NEXTAUTH_SECRET` required in both dev and production
- Sign Out: call `signOut()` from `next-auth/react` (client) or `auth.signOut()` (server action)
- **Feature Flag**: `FEATURE_EMAIL_VERIFICATION_ENABLED` (blocks login if unverified)

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-004 — User registration | Story | Creates user accounts | Yes |
| US-005 — Email verification | Story | Verification state on login | Yes |
| NextAuth.js v5 installed | Package | Required | Yes |

---

## Test Plan

### Manual Testing
- [ ] Valid credentials → redirected to `/dashboard`
- [ ] Invalid password → error message (no field specificity)
- [ ] Unverified email + `FEATURE_EMAIL_VERIFICATION_ENABLED=true` → proper error
- [ ] Sign out → session cleared, redirect to `/login`
- [ ] Access `/dashboard` unauthenticated → redirect to `/login?callbackUrl=...`

### Automated Testing
- [ ] Unit: `CredentialsProvider.authorize` returns `null` for wrong password
- [ ] Unit: `authorize` returns `null` if `emailVerified=false` and flag enabled
- [ ] E2E: Full login → dashboard → sign out → `/login` redirect

---

## Definition of Done

- [ ] Login with valid credentials creates session
- [ ] Login with invalid credentials returns generic error
- [ ] Unverified email blocked by flag
- [ ] Sign out destroys session
- [ ] Unauthenticated access to protected routes redirects to login
- [ ] All AC passing
- [ ] `git commit: feat(auth): login and logout`
