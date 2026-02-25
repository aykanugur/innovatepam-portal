# User Story: Server-Side Identity Masking

**Story ID**: US-038
**Epic**: EPIC-V2-05 — Blind Review
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: S
**Sprint**: Phase 6 — Step 3
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** admin reviewing a blind-review idea,
**I want** the submitter's identity to be hidden from me until the decision is recorded,
**so that** my evaluation is based on the idea's content rather than who submitted it.

---

## Context & Motivation

Blind review's core value is delivered here. The masking must be server-side — the client must never receive the true author identity fields in a blind-review scenario. A client-side check would be trivially bypassable via browser devtools. The `maskAuthorIfBlind()` utility function must be reused in every location that returns idea author data: the RSC page component, any Route Handler that returns the idea, and the analytics widget (EPIC-V2-06).

---

## Acceptance Criteria

1. **Given** an ADMIN requests the idea detail page for a blind-review idea that is `UNDER_REVIEW`,
   **When** the RSC renders,
   **Then** the `author.displayName` in the rendered HTML is "Anonymous Submitter" and no email address is present anywhere in the page output.

2. **Given** an ADMIN calls `GET /api/ideas/[id]` for a blind-review active idea,
   **When** the Route Handler responds,
   **Then** the JSON body contains `author: { displayName: "Anonymous Submitter" }` with no `email` key present.

3. **Given** the same idea after the decision is recorded (`ACCEPTED` or `REJECTED`),
   **When** an ADMIN loads the idea detail page,
   **Then** the true `author.displayName` and `email` are returned — the masking is automatically lifted.

4. **Given** a SUPERADMIN loads the same blind-review active idea,
   **When** the page renders,
   **Then** the true `author.displayName` and `email` are returned — SUPERADMIN always bypasses masking.

5. **Given** the SUBMITTER views their own blind-review idea,
   **When** the page renders,
   **Then** the submitter sees their own name — masking never applies to the author's self-view.

6. **Given** `FEATURE_BLIND_REVIEW_ENABLED=false`,
   **When** any user loads any idea detail,
   **Then** the full author object is always returned — the masking function is not invoked.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                         | Expected Behavior                                                                                                                                            |
| --- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Pipeline is null (V1 idea with no pipeline)                                      | `maskAuthorIfBlind()` treats `pipeline = null` as `blindReview = false` — identity never masked                                                              |
| 2   | `blindReview = true` on a pipeline but the idea is `SUBMITTED` (not yet claimed) | Masking conditions require `status` IN `['UNDER_REVIEW']` — an unclaimed idea is not active; identity not masked (no admin is reviewing it yet)              |
| 3   | `blindReview` is toggled to `false` mid-review                                   | On the next page load, `maskAuthorIfBlind()` evaluates the current `blindReview` value (`false`) and returns the full author — identity revealed immediately |

---

## UI / UX Notes

- On the masked idea detail page (ADMIN view): the "Submitted by" metadata row shows `Anonymous` with a `EyeOff` Lucide icon next to it.
- No toast, banner, or special indicator that blind review is active — the masked state is intentionally understated to avoid anchoring bias (reviewers shouldn't think "this is anonymous, I wonder why").
- SUPERADMIN view is visually identical to the normal unmasked view — no "blind review bypass" indicator.

---

## Technical Notes

- Create `lib/blind-review.ts`:
  ```ts
  export function maskAuthorIfBlind(
    author: { displayName: string; email: string },
    pipeline: { blindReview: boolean } | null,
    requesterRole: Role,
    requesterUserId: string,
    authorId: string,
    ideaStatus: IdeaStatus
  ): { displayName: string; email?: string } {
    if (
      !process.env.FEATURE_BLIND_REVIEW_ENABLED ||
      process.env.FEATURE_BLIND_REVIEW_ENABLED !== 'true'
    )
      return author
    if (!pipeline?.blindReview) return author
    if (requesterRole === 'SUPERADMIN') return author
    if (requesterUserId === authorId) return author
    if (ideaStatus === 'ACCEPTED' || ideaStatus === 'REJECTED') return author
    return { displayName: 'Anonymous Submitter' } // email key intentionally omitted
  }
  ```
- Call `maskAuthorIfBlind()` in:
  1. The RSC page component for `/ideas/[id]` — after loading the idea from the DB
  2. `GET /api/ideas/[id]` Route Handler
  3. Analytics widgets in EPIC-V2-06 (US-044)
- Automated test: integration test that calls both routes with an ADMIN session on a blind-review active idea and asserts the `email` field is absent from both responses.
- **Feature Flag**: `FEATURE_BLIND_REVIEW_ENABLED` — first guard in `maskAuthorIfBlind()`.

---

## Dependencies

| Dependency                                                  | Type  | Status                          | Blocker? |
| ----------------------------------------------------------- | ----- | ------------------------------- | -------- |
| US-036 — `blindReview` field                                | Story | Must be done first              | Yes      |
| US-037 — Toggle UI (produces ideas with `blindReview=true`) | Story | Required for end-to-end testing | No       |

---

## Test Plan

### Manual Testing

- [ ] ADMIN opens blind-review active idea → "Anonymous Submitter" shown; no email visible
- [ ] ADMIN opens same idea post-decision → true author name and email shown
- [ ] SUPERADMIN opens blind-review active idea → true author name shown
- [ ] Submitter views their own blind-review idea → their own name shown

### Automated Testing

- [ ] Unit: `maskAuthorIfBlind()` returns masked author for `ADMIN`, `blindReview=true`, `UNDER_REVIEW`
- [ ] Unit: `maskAuthorIfBlind()` returns full author for `SUPERADMIN`
- [ ] Unit: `maskAuthorIfBlind()` returns full author when `pipeline=null`
- [ ] Unit: `maskAuthorIfBlind()` returns full author when `FEATURE_BLIND_REVIEW_ENABLED=false`
- [ ] Integration: `GET /api/ideas/[id]` ADMIN response has no `email` key for blind-review active idea
- [ ] Integration: `GET /api/ideas/[id]` ADMIN response after `ACCEPTED` returns full author

---

## Definition of Done

- [ ] `lib/blind-review.ts` created with `maskAuthorIfBlind()` utility
- [ ] Masking applied in RSC page component and Route Handler
- [ ] ≥ 80% branch coverage on `maskAuthorIfBlind()`
- [ ] `git commit: feat(blind-review): server-side identity masking`
