# User Story: Score Visibility on Idea Detail Page

**Story ID**: US-043
**Epic**: EPIC-V2-06 — Scoring System
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 7 — Step 4
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** submitter or admin viewing an idea detail page after the review decision,
**I want to** see the star score and evaluation criteria that the reviewer assigned,
**so that** the evaluation is transparent and I can understand the outcome.

---

## Context & Motivation

Submitters currently receive a binary outcome (Accepted or Rejected) with no supporting rationale beyond optional reviewer notes. Surfacing the score and criteria tags provides objective, quantitative context directly on the idea detail page — bridging the gap between a terse decision and the submitter's expectation of feedback.

---

## Acceptance Criteria

1. **Given** `FEATURE_SCORING_ENABLED=true` and the idea `status` is `ACCEPTED` or `REJECTED` and an `IdeaScore` record exists,
   **When** the idea detail page loads,
   **Then** a "Evaluation Score" section renders below the decision section, showing a static star display (e.g. ★★★☆☆ for score 3) with a label "3 / 5" and any criteria tags below.

2. **Given** the idea was scored with criteria tags,
   **When** the score section renders,
   **Then** criteria tags are displayed as `variant="secondary"` shadcn `Badge` components.

3. **Given** `FEATURE_SCORING_ENABLED=true` and the idea is still `SUBMITTED` or `UNDER_REVIEW` (pre-decision),
   **When** the idea detail page loads,
   **Then** no "Evaluation Score" section is rendered — the section is completely absent from the DOM (not "Score not yet available").

4. **Given** `FEATURE_SCORING_ENABLED=true` but the idea does not have an associated `IdeaScore` (created before scoring existed),
   **When** the idea detail page loads,
   **Then** no "Evaluation Score" section is rendered — absent, not showing a null/empty state.

5. **Given** `FEATURE_SCORING_ENABLED=false`,
   **When** the idea detail page loads,
   **Then** no "Evaluation Score" section is rendered regardless of status or score existence.

6. **Given** blind review is active for the idea (`idea.blindReviewMode = true`) and the viewer is a submitter,
   **When** the score section renders,
   **Then** the reviewer's name/avatar is not shown — only the score and criteria are displayed (anonymous attribution).

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                | Expected Behavior                                                                                   |
| --- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| 1   | Two `IdeaScore` records exist for the same idea (should not happen — unique constraint) | `findUnique` by `ideaId` returns the first; Prisma unique index prevents duplicates at the DB level |
| 2   | `criteria` array is empty (reviewer scored but selected no criteria tags)               | Score and star display render normally; criteria tag row is absent (no empty container)             |
| 3   | Submitter visits the detail page while status is `UNDER_REVIEW`                         | Score section is absent; normal "Under Review" status badge is shown                                |

---

## UI / UX Notes

- Section heading: "Evaluation Score" inside a `<Card>` or `<section>` with `mt-6`
- Star display: 5 Lucide `Star` icons — filled `fill-yellow-400 text-yellow-400` for ≤ score, empty `text-muted-foreground` for > score (read-only; no click handlers)
- Score label: "X / 5" in `text-muted-foreground text-sm`, rendered to the right of the stars
- Criteria tags section (only if `criteria.length > 0`): `<p className="text-xs text-muted-foreground mt-2">Evaluation criteria:</p>` followed by a flex-wrap row of `Badge` components
- Reviewer attribution: only show "Reviewed by [Display Name]" when `blindReviewMode = false` (or admin viewer)
- Accessibility: the star display must have `aria-label="Score: X out of 5"`

---

## Technical Notes

- The idea detail page query must include:
  ```ts
  include: {
    score: true,   // IdeaScore relation
    review: true,
  }
  ```
  (The Prisma relation field on `Idea` is `score IdeaScore?` as defined in US-040.)
- The "Evaluation Score" section is a separate Server Component: `ScoreSection` (`components/ideas/score-section.tsx`), accepting `score: IdeaScore | null` and `blindMode: boolean`.
- `ScoreSection` renders `null` when `!FEATURE_SCORING_ENABLED || score == null || !['ACCEPTED','REJECTED'].includes(ideaStatus)`.
- Re-use the static `StarDisplay` from `components/ui/star-rating.tsx` (US-041) in read-only mode.
- **Feature Flag**: `FEATURE_SCORING_ENABLED`.

---

## Dependencies

| Dependency                                      | Type  | Status             | Blocker? |
| ----------------------------------------------- | ----- | ------------------ | -------- |
| US-040 — `IdeaScore` model                      | Story | Must be done first | Yes      |
| US-041 — `StarRating` / `StarDisplay` component | Story | Must be done first | Yes      |
| US-037 — `blindReviewMode` field on `Idea`      | Story | Must be done first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] ACCEPTED idea with score: "Evaluation Score" section visible with correct stars and "X / 5" label
- [ ] REJECTED idea with score: section visible
- [ ] SUBMITTED/UNDER_REVIEW idea: no score section in DOM
- [ ] Idea with no `IdeaScore` record (legacy V1 idea): no score section
- [ ] Score with 3 criteria tags: badges render
- [ ] Score with no criteria: no criteria row
- [ ] Blind review + submitter view: reviewer name absent
- [ ] `FEATURE_SCORING_ENABLED=false`: no score section

### Automated Testing

- [ ] Unit: `ScoreSection` returns `null` when `score == null`
- [ ] Unit: `ScoreSection` returns `null` for pre-decision statuses
- [ ] Unit: `ScoreSection` renders correct star count for score 1, 3, 5
- [ ] Unit: `ScoreSection` hides reviewer name when `blindMode=true`
- [ ] Integration: idea detail API include `score: true` — response includes `IdeaScore` data
- [ ] E2E: submit + accept decision with score 4 → idea detail page shows ★★★★☆ "4 / 5"

---

## Definition of Done

- [ ] `ScoreSection` component created with correct conditional rendering
- [ ] Idea detail page query extended with `include: { score: true }`
- [ ] Static `StarDisplay` re-used from `StarRating` (read-only mode)
- [ ] Blind review masking applied to reviewer attribution
- [ ] `git commit: feat(scoring): evaluation score section on idea detail page`
