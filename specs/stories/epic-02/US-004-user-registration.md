# User Story: User Registration

**Story ID**: US-004  
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

**As an** EPAM employee,  
**I want to** create an account using my work email and a password,  
**so that** I can access the InnovatEPAM Portal and submit innovation ideas.

---

## Context & Motivation

Registration is the entry point to the platform. Every other user-facing feature depends on authenticated users. Without a working register flow, no other story can be manually tested end-to-end.

---

## Acceptance Criteria

1. **Given** I visit `/register`,  
   **When** I submit a valid email and password (≥8 chars, 1 uppercase, 1 number),  
   **Then** a new `User` record is created with `role=SUBMITTER`, `emailVerified=false` (if `FEATURE_EMAIL_VERIFICATION_ENABLED=true`) and I am redirected to `/register/check-email` showing "Check your inbox."

2. **Given** I attempt to register with an email already in use,  
   **When** I submit the form,  
   **Then** I see the error: "An account with this email already exists."

3. **Given** I submit a password that fails validation,  
   **When** the form is submitted,  
   **Then** I see inline validation errors before the request is sent.

4. **Given** `FEATURE_EMAIL_VERIFICATION_ENABLED=false`,  
   **When** I register,  
   **Then** `emailVerified` is set to `true` immediately and I am redirected to `/dashboard`.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | SQL injection in email field | Prisma parameterized queries prevent injection |
| 2 | Network error during form submit | Show toast: "Something went wrong. Please try again." |
| 3 | Password and confirm-password mismatch | Client-side error before API call |

---

## UI / UX Notes

- Route: `/register`
- Fields: Email (input type=email), Display Name, Password, Confirm Password
- CTA: "Create Account" button (primary)
- Link below: "Already have an account? Sign in"
- Show/hide password toggle (eye icon)
- Use `shadcn/ui` Form + Input + Button + Alert components

---

## Technical Notes

- Route Handler: `POST /api/auth/register`
- Hash password: `bcrypt.hash(password, 12)`
- Generate `verificationToken` with `crypto.randomBytes(32).toString('hex')`
- Set `verificationTokenExpiry` = now + 24h
- If `FEATURE_EMAIL_VERIFICATION_ENABLED=false`, set `emailVerified: true` directly
- Use Zod schema for server-side validation
- **Feature Flag**: `FEATURE_EMAIL_VERIFICATION_ENABLED`

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-002 — Prisma schema + `User` model | Story | Must be done first | Yes |
| US-005 — Email verification | Story | Parallel; flag handles decoupling | No |

---

## Test Plan

### Manual Testing
- [ ] Register with valid email → redirected to check-email page
- [ ] Register with duplicate email → see error message
- [ ] Register with weak password → see inline validation
- [ ] Register with `FEATURE_EMAIL_VERIFICATION_ENABLED=false` → redirected to `/dashboard`

### Automated Testing
- [ ] Unit: Zod schema rejects invalid inputs
- [ ] Integration: `POST /api/auth/register` creates User record with hashed password
- [ ] Integration: duplicate email returns 409
- [ ] E2E: Full register → check-email flow

---

## Definition of Done

- [ ] Register form works end-to-end
- [ ] Password hashed with bcrypt (never stored plain-text)
- [ ] Feature flag respected
- [ ] Zod validation on both client and server
- [ ] All AC marked passing
- [ ] `git commit: feat(auth): user registration`
