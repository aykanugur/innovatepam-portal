# User Story: Profile & Settings

**Story ID**: US-015  
**Epic**: EPIC-04 — Evaluation Workflow, Admin Tools & Quality Gate  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P3 (Could)  
**Estimate**: XS  
**Sprint**: Day 3 — AM (cut-first candidate)  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As an** authenticated employee,  
**I want to** update my display name and change my password from a settings page,  
**so that** I can keep my profile accurate and maintain account security.

---

## Context & Motivation

This is a P3 (Could) feature — a cut-first candidate. The core platform functions without profile editing. It is included because it completes the user experience loop and is XS effort if tackled after the core stories are done.

---

## Acceptance Criteria

1. **Given** I am logged in and visit `/settings`,  
   **When** the page loads,  
   **Then** I see my current display name (pre-filled) and a password change section.

2. **Given** I update my display name and click "Save",  
   **When** the action runs,  
   **Then** `User.displayName` is updated and a success toast shows "Display name updated."

3. **Given** I fill in "Current Password", "New Password", and "Confirm New Password" and click "Update Password",  
   **When** `currentPassword` matches the stored hash,  
   **Then** `User.passwordHash` is updated with the new bcrypt hash and a success toast shows "Password updated."

4. **Given** "Current Password" does not match,  
   **When** I submit,  
   **Then** I see the error: "Current password is incorrect."

5. **Given** "New Password" and "Confirm New Password" do not match,  
   **When** I submit,  
   **Then** I see the client-side error: "Passwords do not match." before any API call.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | Display name trimmed to empty string | Validation error: "Display name cannot be empty" |
| 2 | New password same as current | Allow — no restriction needed |
| 3 | Password change while another session is active | Other sessions unaffected (JWT-based; they expire naturally) |

---

## UI / UX Notes

- Route: `/settings`
- Layout: single-column form, two sections — "Profile" card, "Security" card
- Display name: text input (max 50 chars)
- Password: three inputs (Current, New, Confirm New) — all with show/hide toggles

---

## Technical Notes

- Server Actions: `updateDisplayName(displayName)`, `updatePassword(currentPassword, newPassword)`
- `updatePassword`: `bcrypt.compare(currentPassword, user.passwordHash)` then `bcrypt.hash(newPassword, 12)`
- Reuse Zod password validation schema from registration
- No email change in scope (v1)
- **Feature Flag**: None (always available once user is logged in)

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-006 — Login / session | Story | Session required | Yes |
| US-002 — Prisma `User` model | Story | Updates `displayName`, `passwordHash` | Yes |

---

## Test Plan

### Manual Testing
- [ ] Update display name → toast success; new name shown after reload
- [ ] Change password with correct current password → success
- [ ] Change password with wrong current password → error
- [ ] Mismatched new + confirm → client-side error before submit

### Automated Testing
- [ ] Unit: `updatePassword` rejects incorrect current password
- [ ] Integration: `updateDisplayName` updates DB record

---

## Definition of Done

- [ ] Display name update works
- [ ] Password change validates current password
- [ ] Client-side confirm-password mismatch caught before API call
- [ ] All AC passing
- [ ] `git commit: feat(profile): profile and settings page`

---

## Risk Note

> **CUT-FIRST CANDIDATE**: If Day 3 timeline is at risk, skip this story. Core platform functions without profile editing.
