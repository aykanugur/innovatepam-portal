# User Story: Email Verification

**Story ID**: US-005  
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

**As a** newly registered employee,  
**I want to** verify my email address by clicking a link sent to my inbox,  
**so that** my identity is confirmed and I can log in to the portal.

---

## Context & Motivation

Email verification ensures that only real EPAM employees with valid email addresses can access the platform. The `FEATURE_EMAIL_VERIFICATION_ENABLED` flag allows teams to skip this step in alpha/dev environments where Resend is not configured.

---

## Acceptance Criteria

1. **Given** `FEATURE_EMAIL_VERIFICATION_ENABLED=true` and I have just registered,  
   **When** the registration API handler runs,  
   **Then** an email is sent via Resend to my address with a unique verification link (e.g., `/verify-email?token=<token>`) valid for 24 hours.

2. **Given** I click the verification link within 24 hours,  
   **When** the `/verify-email` page loads,  
   **Then** my `User.emailVerified` is set to `true`, the token is cleared, and I see "Email verified! You can now sign in."

3. **Given** I click an expired or invalid verification link,  
   **When** the page loads,  
   **Then** I see the error: "This verification link is invalid or has expired. Please register again or request a new link."

4. **Given** `FEATURE_EMAIL_VERIFICATION_ENABLED=false`,  
   **When** registration completes,  
   **Then** no email is sent and `emailVerified` is set to `true` automatically (verified by US-004 AC-4).

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | Resend API returns 5xx | Registration succeeds but email fails silently; log the error; banner: "We couldn't send the verification email. Contact support." |
| 2 | Token reused after verification | Return 400: "Token already used" |
| 3 | User verifies, then re-clicks the same link | Idempotent: show "Already verified" message, redirect to `/login` |

---

## UI / UX Notes

- Route: `/verify-email?token=<token>`
- Success state: green check icon, "Email verified" heading, "Go to Sign In" CTA button
- Error state: red X icon, error message, "Back to Register" link
- `/register/check-email` page: "We've sent you a link to <email>. Check your spam folder if you can't see it."

---

## Technical Notes

- Route Handler: `GET /api/auth/verify-email?token=<token>`
- Query: `prisma.user.findFirst({ where: { verificationToken: token, verificationTokenExpiry: { gt: new Date() } } })`
- On success: `prisma.user.update({ where: { id }, data: { emailVerified: true, verificationToken: null, verificationTokenExpiry: null } })`
- Email template (Resend): Plain-text + HTML with one CTA button
- **Feature Flag**: `FEATURE_EMAIL_VERIFICATION_ENABLED`

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-004 — User registration | Story | Generates and stores the token | Yes |
| Resend account + `RESEND_API_KEY` | External | Required if flag enabled | Conditional |

---

## Test Plan

### Manual Testing
- [ ] Register → receive verification email → click link → see success page
- [ ] Click same link again → see "Already verified"
- [ ] Manually expire token in DB → click link → see error page
- [ ] `FEATURE_EMAIL_VERIFICATION_ENABLED=false` → no email sent

### Automated Testing
- [ ] Unit: `sendVerificationEmail()` calls Resend SDK with correct params
- [ ] Integration: `GET /api/auth/verify-email?token=valid` sets `emailVerified=true`
- [ ] Integration: expired token returns 400

---

## Definition of Done

- [ ] Verification email sent via Resend when flag is enabled
- [ ] Valid token flow sets `emailVerified=true`
- [ ] Expired/invalid token returns proper error
- [ ] Feature flag `FEATURE_EMAIL_VERIFICATION_ENABLED` behaves correctly
- [ ] All AC passing
- [ ] `git commit: feat(auth): email verification`
