# User Story: Save Draft Server Action

**Story ID**: US-027
**Epic**: EPIC-V2-03 — Draft Management
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: S
**Sprint**: Phase 4 — Step 2
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** submitter filling in the idea submission form,
**I want to** save my progress as a draft without submitting it for review,
**so that** I can return and complete the idea later without losing my work.

---

## Context & Motivation

Complex ideas take time to articulate. A submitter who starts an idea, gets interrupted, and closes the tab will lose their work entirely in V1. Draft management solves this by persisting the current form state with `status=DRAFT` and a 30-day expiry. The submitter can return from the Drafts tab (US-028) and complete the form at any time.

---

## Acceptance Criteria

1. **Given** `FEATURE_DRAFT_ENABLED=true`,
   **When** I click "Save Draft" on the idea submission form,
   **Then** an `Idea` record is created (or updated) with `status=DRAFT`, `draftExpiresAt = now() + 30 days`, and the current form values (title, description, category, dynamicFields if present).

2. **Given** I click "Save Draft" on a form where a draft already exists for this session (i.e., I am resuming from US-029),
   **When** the Server Action runs,
   **Then** the existing `DRAFT` idea is updated (not a new record created) and `draftExpiresAt` is refreshed to `now() + 30 days`.

3. **Given** the draft is saved successfully,
   **When** the Server Action returns,
   **Then** a success toast appears: "Draft saved! You can find it in My Ideas → Drafts." The user stays on the form.

4. **Given** the form title is empty,
   **When** "Save Draft" is clicked,
   **Then** the Server Action still saves — title is not required for a draft. The draft is saved with `title = ""`.

5. **Given** `FEATURE_DRAFT_ENABLED=false`,
   **When** the submission form is loaded,
   **Then** no "Save Draft" button is rendered. Calling the Server Action directly returns `400: Draft feature is disabled.`

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                       | Expected Behavior                                                                                                                                    |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Server Action called while the submitter already has 5 unexpired drafts        | Allow — no limit on draft count per user in V2.0                                                                                                     |
| 2   | Draft saved, `draftExpiresAt` passes, then submitter tries to submit the draft | Expiry cron (US-030) deletes the idea record; the Server Action at submit time re-validates status and returns `410 Gone`: "This draft has expired." |
| 3   | Submitter saves a draft, an admin finds the idea in the DB and reads it        | The admin ideas query filters out `DRAFT` status — admins cannot access drafts in the admin panel                                                    |

---

## UI / UX Notes

- "Save Draft" button: secondary outlined button next to the primary "Submit Idea" button on the form.
- Button label during pending state: "Saving…" with spinner.
- Toast on success: shadcn/ui `toast` with `variant="default"` — not a destructive toast.
- The form remains on the page after saving a draft (no redirect).

---

## Technical Notes

- Server Action: `lib/actions/save-draft.ts` — `saveDraft(formData: DraftFormData)`.
- Logic:
  1. Validate session → `401` if unauthenticated
  2. Check `FEATURE_DRAFT_ENABLED` → `400` if disabled
  3. If `formData.ideaId` is provided (resuming existing draft):
     - Load idea, verify `status=DRAFT` and `authorId=session.user.id` → `403` if mismatch
     - `prisma.idea.update({ data: { ...fields, draftExpiresAt: addDays(new Date(), 30) } })`
  4. If no `ideaId`:
     - `prisma.idea.create({ data: { status: 'DRAFT', draftExpiresAt: addDays(new Date(), 30), ...fields } })`
  5. Write `AuditLog` with action `DRAFT_SAVED` (new enum value)
  6. Return `{ id: idea.id }` — client stores the id for subsequent "save draft" calls during the same session
- Zod schema for `DraftFormData`: all fields optional (title, description, category, dynamicFields, ideaId).
- Use `date-fns`'s `addDays` or native `Date` arithmetic for expiry calculation.
- **Feature Flag**: `FEATURE_DRAFT_ENABLED`.

---

## Dependencies

| Dependency                              | Type  | Status             | Blocker? |
| --------------------------------------- | ----- | ------------------ | -------- |
| US-026 — `DRAFT` status + state machine | Story | Must be done first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] Click "Save Draft" with a title → success toast; idea appears in DB with `status=DRAFT`
- [ ] Click "Save Draft" with no title → draft saved with empty title
- [ ] Click "Save Draft" a second time while on the same form → existing draft updated, not duplicated
- [ ] `FEATURE_DRAFT_ENABLED=false` → no "Save Draft" button visible

### Automated Testing

- [ ] Unit: `save-draft` Zod schema accepts all-optional fields
- [ ] Integration: `saveDraft` creates a new `DRAFT` idea with `draftExpiresAt` set to 30 days from now
- [ ] Integration: `saveDraft` with existing `ideaId` updates the record and refreshes `draftExpiresAt`
- [ ] Integration: `saveDraft` with `ideaId` belonging to another user returns `403`

---

## Definition of Done

- [ ] `saveDraft` Server Action created and tested
- [ ] `DRAFT_SAVED` audit action written on every save
- [ ] "Save Draft" button rendered on the submission form (feature-flagged)
- [ ] Expiry set to 30 days
- [ ] `git commit: feat(drafts): save draft server action`
