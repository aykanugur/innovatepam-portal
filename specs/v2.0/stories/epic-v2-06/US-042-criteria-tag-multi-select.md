# User Story: Criteria Tag Multi-Select on Review Panel

**Story ID**: US-042
**Epic**: EPIC-V2-06 — Scoring System
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 7 — Step 3
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** admin providing a score on the decision stage review panel,
**I want to** optionally tag one or more scoring criteria that influenced my rating,
**so that** leadership can see which evaluation dimensions drove the final decision and compare trends across ideas.

---

## Context & Motivation

A numeric score alone (e.g. "4 stars") does not communicate _why_ an idea received that score. Allowing admins to tag up to 5 predefined criteria (e.g. "Strategic Fit", "Feasibility") captures the evaluation rationale with minimal additional effort — no free-text required. These tags are stored on the `IdeaScore` model (US-040) and surfaced in analytics (US-044).

---

## Acceptance Criteria

1. **Given** `FEATURE_SCORING_ENABLED=true` and the decision stage review panel is loaded,
   **When** the panel renders,
   **Then** 5 criteria buttons (from `SCORING_CRITERIA` constant) are shown below the star rating component.

2. **Given** I click a criteria button that is not selected,
   **When** the click is processed,
   **Then** the button changes to a selected state (primary-outlined style) and the criteria is added to the selection list.

3. **Given** I click a criteria button that is already selected,
   **When** the click is processed,
   **Then** the button returns to its unselected state and the criteria is removed from the selection list.

4. **Given** I submit the decision with no criteria selected,
   **When** the Server Action runs,
   **Then** the `IdeaScore` record is created with `criteria = []` — an empty array is valid.

5. **Given** I submit the decision with 1–5 criteria selected,
   **When** the Server Action runs,
   **Then** the `IdeaScore` record is created with the selected criteria stored in the `criteria` field.

6. **Given** `FEATURE_SCORING_ENABLED=false`,
   **When** the decision stage review panel loads,
   **Then** no criteria buttons are rendered.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                            | Expected Behavior                                                                               |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | A client-side modification injects a sixth invalid criteria string into the request | Zod `z.array(z.enum(SCORING_CRITERIA_TUPLE)).max(5)` rejects the payload with `400 Bad Request` |
| 2   | A criteria string not in `SCORING_CRITERIA` is submitted via direct API call        | Zod enum validation rejects with `400`; database is not touched                                 |

---

## UI / UX Notes

- Criteria buttons: shadcn `Badge` components rendered as `<button>` elements — compact, tag-style
- Unselected: `variant="outline"` style
- Selected: `variant="default"` style (uses primary colour)
- Section label: `<Label className="mt-4 block">Evaluation criteria (optional)</Label>`
- Rendered as a wrapping flex row: `flex flex-wrap gap-2`
- No more than 5 criteria in `SCORING_CRITERIA`; no "select all" toggle needed
- Criteria component sits between the star rating and the Accept/Reject buttons

---

## Technical Notes

- `SCORING_CRITERIA` constant is defined in `constants/categories.ts` (US-040) as a `readonly string[]`.
- For Zod enum validation, derive a tuple type at compile time:
  ```ts
  const [first, ...rest] = SCORING_CRITERIA
  const scoringCriteriaSchema = z.array(z.enum([first, ...rest])).max(5)
  ```
- The `criteria` field on `IdeaScore` is `String[]` (Prisma `@default([])`) — passed through directly.
- Client component `<CriteriaTagSelect />` (new, in `components/admin/`) maintains `useState<string[]>`.
- No server state is needed here — the selected criteria is sent with the rest of the decision form.
- **Feature Flag**: `FEATURE_SCORING_ENABLED`.

---

## Dependencies

| Dependency                                                         | Type  | Status             | Blocker? |
| ------------------------------------------------------------------ | ----- | ------------------ | -------- |
| US-040 — `IdeaScore` model and `SCORING_CRITERIA` constant         | Story | Must be done first | Yes      |
| US-041 — Star rating in review panel (UI wrapper component exists) | Story | Must be done first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] 5 criteria buttons render below the star rating on the decision stage panel
- [ ] Clicking an unselected button selects it (visual change)
- [ ] Clicking a selected button deselects it
- [ ] Submit with no criteria → `IdeaScore.criteria = []`
- [ ] Submit with 3 criteria selected → `IdeaScore.criteria` contains exactly those 3 values
- [ ] `FEATURE_SCORING_ENABLED=false` → no criteria buttons rendered

### Automated Testing

- [ ] Unit: `CriteriaTagSelect` toggles button visual state correctly per click
- [ ] Integration: `criteria: []` → `IdeaScore` created with empty array (valid)
- [ ] Integration: `criteria: ['Strategic Fit', 'Feasibility', 'Impact']` → stored correctly
- [ ] Integration: `criteria` containing an invalid value → `400`
- [ ] Integration: `criteria` with 6 items → `400`

---

## Definition of Done

- [ ] `CriteriaTagSelect` component built and integrated into the decision stage review panel
- [ ] Server Action Zod schema extended with `criteria` field
- [ ] `IdeaScore.criteria` persisted correctly through `$transaction`
- [ ] `git commit: feat(scoring): criteria tag multi-select on decision stage review panel`
