# User Story: Star Rating Input on Decision Stage Review Panel

**Story ID**: US-041
**Epic**: EPIC-V2-06 — Scoring System
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: S
**Sprint**: Phase 7 — Step 2
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** admin finalising a review decision,
**I want to** assign a 1-to-5 star rating to the idea before recording my decision,
**so that** each accepted or rejected idea has a consistent quality signal that helps leadership prioritise implementation.

---

## Context & Motivation

A binary Accept/Reject decision discards nuance. A mandatory score at the decision stage adds a low-friction quantitative signal without requiring reviewers to write longer justifications. Making the score required (blocking the decision without it) ensures consistent data quality — no gaps in the analytics.

---

## Acceptance Criteria

1. **Given** `FEATURE_SCORING_ENABLED=true` and an admin is on the decision stage review panel,
   **When** the panel loads,
   **Then** 5 star icons are rendered above the Accept/Reject buttons, labelled "Rate this idea (required)".

2. **Given** I click the 3rd star,
   **When** the click is processed,
   **Then** stars 1, 2, and 3 are filled (yellow); stars 4 and 5 are empty.

3. **Given** I have not selected a star and click "Accept" or "Reject",
   **When** the button is clicked,
   **Then** an inline error message appears below the stars: "A score (1–5) is required to finalise the decision." The decision is not submitted.

4. **Given** I select a score and submit the decision,
   **When** the Server Action runs,
   **Then** a single `$transaction` creates the `IdeaScore` record, updates `Idea.status` to `ACCEPTED`/`REJECTED`, and writes an `IDEA_SCORED` audit log entry — all three writes succeed or all roll back.

5. **Given** `score: 0` or `score: 6` is submitted directly to the Server Action (bypassing the UI),
   **When** the Server Action runs,
   **Then** Zod validation returns `400 Bad Request` before touching the database.

6. **Given** `FEATURE_SCORING_ENABLED=false`,
   **When** the decision stage review panel loads,
   **Then** no star rating component is rendered, and the decision can be submitted without a score.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                         | Expected Behavior                                                                                                                                  |
| --- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Admin refreshes the page after selecting a star but before submitting            | Selected star value is reset — no local storage persistence in V2.0                                                                                |
| 2   | `IdeaScore` already exists for the idea (race condition — concurrent submission) | `$transaction` fails with `P2002` (unique constraint on `ideaId`); Server Action returns `409`: "A score has already been recorded for this idea." |
| 3   | Admin clicks a star to change their selection before submitting                  | The star selection is client-side controlled state — clicking a different star updates the selection; the previous value is discard                |

---

## UI / UX Notes

- Star rating component: `components/ui/star-rating.tsx` (new component)
- 5 Lucide `Star` icons in a row, keyboard accessible (arrow left/right changes selection; Enter confirms)
- Unselected: `text-muted-foreground` (`stroke` only, not filled)
- Selected (and all to the left): `fill-yellow-400 text-yellow-400`
- Hover: show a preview fill up to the hovered star
- Label above: `<Label>Rate this idea <span className="text-destructive">*</span></Label>`
- Validation error: `<p className="text-destructive text-sm mt-1">A score (1–5) is required to finalise the decision.</p>`
- Only rendered when `stage.isDecisionStage === true` — the component is not shown on `PASS`/`ESCALATE` stage panels

---

## Technical Notes

- The decision Server Action (`complete-stage.ts` from US-034) must accept an optional `score?: number` field.
- When `stage.isDecisionStage === true` and `FEATURE_SCORING_ENABLED=true`, the Server Action enforces `score` is required: `z.number().int().min(1).max(5)`.
- Atomic transaction:
  ```ts
  await prisma.$transaction([
    prisma.ideaStageProgress.update({
      where: { id: stageProgressId, completedAt: null },
      data: { completedAt: now, outcome },
    }),
    prisma.idea.update({ where: { id: ideaId }, data: { status: outcome } }),
    prisma.ideaScore.create({ data: { ideaId, reviewerId: session.user.id, score, criteria: [] } }),
    prisma.auditLog.create({
      data: { action: 'IDEA_SCORED', actorId: session.user.id, ideaId, metadata: { score } },
    }),
  ])
  ```
- Catch `P2002` → return `409`.
- **Feature Flag**: `FEATURE_SCORING_ENABLED`.

---

## Dependencies

| Dependency                                          | Type  | Status             | Blocker? |
| --------------------------------------------------- | ----- | ------------------ | -------- |
| US-040 — `IdeaScore` model                          | Story | Must be done first | Yes      |
| US-034 — Stage completion Server Action (to extend) | Story | Must be done first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] Decision stage panel shows 5 stars
- [ ] Select star 4 → stars 1-4 filled; stars 4-5 empty
- [ ] Submit without selecting a star → inline error; decision not submitted
- [ ] Select star 3, submit Accept → idea status = ACCEPTED; `IdeaScore` row created with `score=3`
- [ ] `FEATURE_SCORING_ENABLED=false` → no stars rendered; decision submittable without score

### Automated Testing

- [ ] Unit: `StarRating` component renders correct filled/empty stars for each value 1-5
- [ ] Unit: `StarRating` is keyboard accessible — arrow keys change selection
- [ ] Integration: decision Server Action with no `score` on decision stage + flag enabled → `422`
- [ ] Integration: `score: 0` → `400`
- [ ] Integration: valid `score: 4`, `outcome: ACCEPTED` → `IdeaScore` created; `Idea.status = ACCEPTED`
- [ ] Integration: duplicate `IdeaScore` → `409`

---

## Definition of Done

- [ ] `StarRating` component created and keyboard accessible
- [ ] Decision Server Action enforces score when flag enabled and stage is decision stage
- [ ] Atomic `$transaction` covers score + status + audit — no partial writes
- [ ] `git commit: feat(scoring): star rating input on decision stage review panel`
