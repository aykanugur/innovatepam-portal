# User Story: Resume Draft at /ideas/[id]/edit

**Story ID**: US-029
**Epic**: EPIC-V2-03 — Draft Management
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: S
**Sprint**: Phase 4 — Step 4
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** submitter,
**I want to** open a saved draft and continue editing it exactly where I left off,
**so that** resuming a draft feels seamless and I don't have to re-enter data I already saved.

---

## Context & Motivation

The Drafts tab (US-028) shows each draft with a "Resume" button. Clicking Resume must take the submitter to a pre-filled form containing all the previously saved values. The form at `/ideas/[id]/edit` is identical to the submission form, but pre-populated from the `DRAFT` idea record. On submission, the idea transitions from `DRAFT` to `SUBMITTED` via the state machine.

---

## Acceptance Criteria

1. **Given** I click "Resume" on a draft from the Drafts tab,
   **When** the route `/ideas/[id]/edit` loads,
   **Then** the form is pre-populated with the draft's `title`, `description`, `category`, and `dynamicFields` (if any).

2. **Given** I edit the draft and click "Save Draft",
   **When** the Server Action runs,
   **Then** the existing draft record is updated (not a new record created) and `draftExpiresAt` is refreshed.

3. **Given** I edit the draft and click "Submit Idea",
   **When** the form is submitted,
   **Then** the idea transitions from `DRAFT → SUBMITTED` via the state machine, `draftExpiresAt` is set to `null`, and I am redirected to `/ideas/[id]` with a confirmation toast: "Your idea has been submitted for review."

4. **Given** a `SUBMITTER` attempts to access `/ideas/[id]/edit` for an idea that is not their draft (e.g., another user's idea, or a `SUBMITTED` idea),
   **When** the route loads,
   **Then** the server returns a `403` redirect to `/forbidden`.

5. **Given** the draft's `draftExpiresAt` has passed,
   **When** I navigate to `/ideas/[id]/edit`,
   **Then** the server returns a `410 Gone` page — "This draft has expired and is no longer available."

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                         | Expected Behavior                                                                                   |
| --- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| 1   | Draft was created without dynamic fields but the `CategoryFieldTemplate` has since changed       | The resume form shows the current template fields; previously unanswered fields are blank           |
| 2   | Submitter changes category on the resume form                                                    | Same confirmation dialog as US-019: dynamic fields cleared, new category fields rendered            |
| 3   | Submitter opens `/ideas/[id]/edit` directly from a bookmark without going through the Drafts tab | Server validates `status=DRAFT` and `authorId=session.user.id` — same guards as the Drafts tab flow |

---

## UI / UX Notes

- Route: `/ideas/[id]/edit` — server component that loads the `DRAFT` idea and renders the form with `defaultValues`.
- The form component at `/ideas/[id]/edit` is the same `IdeaForm` component used in `/ideas/new` — add a `defaultValues` prop to the existing component.
- Two CTA buttons at the bottom: "Save Draft" (secondary) and "Submit Idea" (primary).
- Breadcrumb: `My Ideas > Drafts > Edit Draft`.
- Expiry countdown banner at the top of the form: `"This draft expires in N days."` (amber if ≤ 7 days).

---

## Technical Notes

- Route Handler: `app/ideas/[id]/edit/page.tsx` — RSC that:
  1. Validates session → redirect to `/login` if unauthenticated
  2. Loads idea with `where: { id, authorId: session.user.id, status: 'DRAFT' }` → 403 redirect to `/forbidden` if no match
  3. Checks `draftExpiresAt > new Date()` → renders 410 page if expired
  4. Renders `IdeaForm` with `defaultValues` from the loaded idea
- The `IdeaForm` component: add optional `ideaId: string` prop. When present, the "Save Draft" button calls `saveDraft({ ideaId, ...fields })` (updates the existing draft). When absent (new submission), it creates a new draft.
- Submit flow: the existing `submitIdea` Server Action must check `status === 'DRAFT'` before creating a new idea; if `ideaId` is provided for a `DRAFT`, do an `update` with `{ status: 'SUBMITTED', draftExpiresAt: null }` instead of a `create`.
- **Feature Flag**: `FEATURE_DRAFT_ENABLED` — if `false`, the `/ideas/[id]/edit` route returns `404`.

---

## Dependencies

| Dependency                                             | Type  | Status                                    | Blocker? |
| ------------------------------------------------------ | ----- | ----------------------------------------- | -------- |
| US-026 — `DRAFT` status + state machine                | Story | Must be done first                        | Yes      |
| US-027 — Save Draft Server Action                      | Story | Must be done first                        | Yes      |
| US-019 — Dynamic form rendering (re-used in edit form) | Story | Required for dynamic field pre-population | No       |

---

## Test Plan

### Manual Testing

- [ ] Click "Resume" from Drafts tab → form pre-filled with saved values
- [ ] Edit and "Save Draft" → existing draft updated (no new ID)
- [ ] Edit and "Submit Idea" → idea transitions to `SUBMITTED`; redirected to `/ideas/[id]`; `draftExpiresAt = null`
- [ ] Access `/ideas/[id]/edit` for another user's draft → `403` redirect
- [ ] Access expired draft URL → `410` page

### Automated Testing

- [ ] Integration: `GET /ideas/[id]/edit` with the author's session loads the pre-filled form
- [ ] Integration: `GET /ideas/[id]/edit` with another user's session returns `403`
- [ ] Integration: submitting the edit form transitions idea to `SUBMITTED` and clears `draftExpiresAt`
- [ ] E2E: full draft flow — save draft → navigate away → resume from Drafts tab → submit → idea appears in submitted list

---

## Definition of Done

- [ ] `/ideas/[id]/edit` route created with pre-populated `IdeaForm`
- [ ] Draft update flow (Save Draft on resume) updates the existing record
- [ ] Submit from resume transitions `DRAFT → SUBMITTED` and clears `draftExpiresAt`
- [ ] Access control enforced (own draft only; non-expired only)
- [ ] `git commit: feat(drafts): resume draft at ideas/[id]/edit`
