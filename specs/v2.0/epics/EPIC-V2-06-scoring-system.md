# Epic: Scoring System

**Epic ID**: EPIC-V2-06
**Owner**: Aykan Uğur — Admin
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Target Release**: V2.0 Phase 7 (~45 min)
**PRD Reference**: [specs/v2.0/prd-v2.0.md](../prd-v2.0.md) — Section 10
**Depends On**: [EPIC-V2-04 — Multi-Stage Review](./EPIC-V2-04-multi-stage-review.md) (decision stage concept, `IdeaStageProgress`, review panel)

---

## 1. Summary

Add a required 1–5 numeric score to the decision stage of the review pipeline. An admin must select a star rating (and optionally up to 5 criteria tags) before they can finalise an `ACCEPTED` or `REJECTED` decision. The score is stored in a new `IdeaScore` model with a database-level range check constraint (`score >= 1 AND score <= 5`). After the decision, the submitter sees their score on the idea detail page. Three new analytics widgets surface average score by category, a score distribution histogram, and a top-scored ideas list. Scoring only applies to decision stages — intermediate `PASS`/`ESCALATE` stage completions are not scored.

---

## 2. Business Context

### 2.1 Strategic Alignment

- **Company Goal**: Help leadership prioritise which accepted ideas to fund or implement first.
- **Product Vision Fit**: Binary `ACCEPTED`/`REJECTED` decisions lose nuance. Among all accepted ideas, leadership needs a consistent, auditable quantitative signal to rank implementation priority without adding significant burden to the reviewer.

### 2.2 Business Value

| Value Driver                  | Description                                                                                       | Estimated Impact                                                     |
| ----------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Implementation prioritisation | Sort accepted ideas by score — highest-value ideas surface first                                  | Reduces the manual effort of leadership reviewing all accepted ideas |
| Evaluation consistency        | All reviewers use the same 1–5 scale and fixed criteria vocabulary                                | Reduces subjective decision variance across different reviewers      |
| Submitter transparency        | Submitters see their score post-decision — making feedback more actionable than a bare `REJECTED` | Higher submitter satisfaction; improved next-submission quality      |

### 2.3 Cost of Delay

Without scoring, all accepted ideas are treated as equally prioritized. In a high-volume portal, leadership cannot distinguish high-priority implementations from low-priority ones without manually re-reviewing every accepted idea. Scoring at evaluation time is lower cost than re-evaluation later.

---

## 3. Scope

### 3.1 In Scope

- **`IdeaScore` Prisma model**: `ideaId @unique`, `score Int`, `criteria String[]`, `reviewerId`, `recordedAt`. One score per idea; only from the decision stage reviewer.
- **DB check constraint**: `CHECK (score >= 1 AND score <= 5)` applied as raw SQL in migration — enforces range at the database level as a secondary safety net beyond Zod.
- **`IDEA_SCORED` AuditAction**: New enum value written to `AuditLog` when a score is recorded.
- **Criteria seed**: 5 fixed string tags seeded into a stable list used by the UI: `Technical Feasibility`, `Strategic Alignment`, `Cost Efficiency`, `Employee Impact`, `Innovation Level`. Not stored as a DB model — seeded as a config constant in `constants/scoring-criteria.ts`.
- **Star rating input on review panel**: 1–5 interactive star rating component rendered above the `Accept`/`Reject` decision buttons on the decision stage review panel. Selecting a score is required before the decision can be submitted.
- **Criteria multi-select on review panel**: Optional multi-select tag input below the star rating. Maximum 5 selectable criteria. If no criteria are selected, `criteria` is stored as an empty array `[]`.
- **Score validation**: Zod schema enforces `score` is an integer in [1, 5] and `criteria` is an array of ≤ 5 strings from the fixed list. Server returns `422` if decision is submitted without a score; `400` if score is out-of-range.
- **Score visibility — submitter**: The numeric score (e.g., "4 / 5") and selected criteria tags are shown on the idea detail page after `ACCEPTED` or `REJECTED`. Hidden while the idea is `UNDER_REVIEW` or `SUBMITTED`.
- **Score visibility — admins**: All `ADMIN` and `SUPERADMIN` users see the score and criteria on all finalised idea detail pages.
- **Three new analytics widgets on `/admin/analytics`**:
  - Average score by category (bar chart)
  - Score distribution histogram (1–5, count per value)
  - Top-scored accepted ideas list (top 5, sorted by score descending)
- **Interaction with blind review**: If blind review is active, the score is recorded and displayed normally. The score itself is never hidden — only submitter identity is masked by EPIC-V2-05.
- **Feature flag**: `FEATURE_SCORING_ENABLED` (default `false`) — when `false`, the score input is not rendered, `IdeaScore` records are not written, and analytics widgets are hidden.

### 3.2 Out of Scope

- Admin ability to edit or override a score after the decision is finalised — scores are immutable in V2.0 (see Open Question 1)
- Allowing different scoring scales per pipeline (e.g., 1–10) — fixed 1–5 in V2.0
- User-editable criteria tags — the 5 criteria are fixed in V2.0; custom criteria deferred to V3.0
- Scoring on intermediate stage completions (`PASS`, `ESCALATE`) — only the decision stage is scored
- Automated scoring or AI-suggested scores
- Exporting scores to CSV — deferred to V3.0

### 3.3 Assumptions

- EPIC-V2-04 is merged and the decision stage review panel exists at `/admin/review/[id]/stage/[stageId]`
- The `isDecisionStage` flag on `ReviewPipelineStage` (introduced in EPIC-V2-04) is the authoritative signal for whether to show the score input
- V1-era ideas evaluated before Phase 7 will have no `IdeaScore` record — analytics must handle `score = null` gracefully (exclude from averages, exclude from top-scored list)
- `FEATURE_SCORING_ENABLED=false` in production until QA sign-off
- Scores are never shown while an idea is still `UNDER_REVIEW` — revealed only after `ACCEPTED` or `REJECTED`

---

## 4. User Personas

| Persona            | Role          | Primary Need                                                                                                                                                          |
| ------------------ | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deniz (Admin)      | Innovation PM | Assign a score and indicate which criteria drove her evaluation before finalising a decision — without adding more than 20 seconds to her review workflow             |
| Kemal (Submitter)  | EPAM employee | Understand not just whether his idea was accepted/rejected, but also how it scored and which dimensions reviewers evaluated — making future submissions more targeted |
| Aykan (Superadmin) | Portal owner  | See aggregate score data in analytics — average scores by category, score distribution, top ideas — to brief leadership on evaluation quality and prioritisation      |

---

## 5. Feature Breakdown

### Feature 1: `IdeaScore` Model, Migration, Criteria Seed & Audit Action — Must Have

**Description**: Create the `IdeaScore` Prisma model, run the migration with the raw SQL check constraint, add the `IDEA_SCORED` value to the `AuditAction` enum, and create the `constants/scoring-criteria.ts` file with the 5 fixed criteria strings. The `Idea` model gains a `score IdeaScore? @relation("IdeaScore")` relation.

**User Stories**:

- [ ] As a developer, `prisma migrate dev` applies the `IdeaScore` table and check constraint without errors.
- [ ] As the system, inserting a row with `score = 0` or `score = 6` is rejected by the database check constraint.
- [ ] As a developer, importing `SCORING_CRITERIA` from `constants/scoring-criteria.ts` returns the 5 fixed strings.

**Acceptance Criteria**:

1. `IdeaScore` table exists with columns: `id`, `ideaId` (unique FK to `Idea`), `reviewerId` (FK to `User`), `score` (int not null), `criteria` (text[] not null default `{}`), `recordedAt` (timestamptz default now)
2. Database check constraint `IdeaScore_score_range` enforces `score >= 1 AND score <= 5`; constraint is visible in `\d "IdeaScore"` psql output
3. `IdeaScore` is linked to `Idea` via `@@unique([ideaId])` — the schema enforces one score per idea at the model level
4. `AuditAction` enum includes `IDEA_SCORED`
5. `constants/scoring-criteria.ts` exports `SCORING_CRITERIA: string[]` = `["Technical Feasibility", "Strategic Alignment", "Cost Efficiency", "Employee Impact", "Innovation Level"]`
6. `Idea` model has `score IdeaScore? @relation("IdeaScore")` relation

**Estimated Effort**: XS (~5 min)

---

### Feature 2: Star Rating Input on Decision Stage Review Panel — Must Have

**Description**: On the decision stage review panel (`/admin/review/[id]/stage/[stageId]`), render a 1–5 interactive star rating component above the `Accept`/`Reject` buttons. The score field is required — attempting to submit a decision without selecting a score shows a validation error and blocks the submission. On successful submission, the Server Action writes the `IdeaScore` record and the `IDEA_SCORED` audit entry atomically with the decision status update.

**User Stories**:

- [ ] US-V2-06-a: As ADMIN on the decision stage review panel, I see 5 clickable star icons above the Accept/Reject buttons. Clicking a star highlights it and all stars to its left.
- [ ] US-V2-06-b: As ADMIN, if I click "Accept" or "Reject" without selecting a score, the form shows an inline error: "A score (1–5) is required to finalise the decision." The decision is not submitted.
- [ ] US-V2-06-c: As ADMIN, after selecting a score and submitting the decision, the `IdeaScore` record is written and the idea transitions to `ACCEPTED`/`REJECTED` atomically in a single `$transaction`.
- [ ] US-V2-06-d: As ADMIN on a non-decision stage (e.g., `PASS`/`ESCALATE`), no star rating input is shown.
- [ ] US-V2-06-e: As an attacker sending `score: 0` or `score: 6` directly to the Server Action, the Zod schema rejects it with `400 Bad Request` before touching the database.

**Acceptance Criteria**:

1. Star rating component renders as 5 interactive star icons (shadcn/ui or Lucide star icon); selected state is visually distinct from unselected (e.g., filled yellow vs. empty outline)
2. Star rating is conditionally rendered only when `stage.isDecisionStage === true`
3. Decision Server Action validates `score` using Zod: `z.number().int().min(1).max(5)`; on failure, returns `{ error: "A score (1–5) is required to finalise the decision." }` with HTTP `422`
4. On valid submission, the Server Action executes a single `prisma.$transaction([updateIdea, createIdeaScore, createAuditLog])` — all three writes succeed or all roll back
5. `AuditLog` entry uses action `IDEA_SCORED` with `metadata: { score, criteria, ideaId }`
6. `FEATURE_SCORING_ENABLED=false` causes the star rating component to not render and the Server Action to skip score validation entirely

**Estimated Effort**: S (~12 min)

---

### Feature 3: Criteria Tag Multi-Select on Review Panel — Must Have

**Description**: Below the star rating input, render a multi-select tag group showing the 5 fixed criteria from `SCORING_CRITERIA`. Tags are optional — the reviewer can submit with zero criteria selected. Maximum 5 tags may be selected (which is all of them in V2.0). The selected criteria are stored in `IdeaScore.criteria` as an array of strings.

**User Stories**:

- [ ] US-V2-06-f: As ADMIN, I see 5 tag buttons below the stars. Clicking a tag toggles its selected state (checked border/background vs. normal). I can select all 5 or none.
- [ ] US-V2-06-g: As ADMIN attempting to select a 6th tag (not possible with only 5 defined, but tested via API), the server returns `400`: `criteria must contain at most 5 items`.
- [ ] US-V2-06-h: As ADMIN submitting with no criteria selected, `IdeaScore.criteria` is stored as `[]` — criteria selection is optional.

**Acceptance Criteria**:

1. Tag group renders using `SCORING_CRITERIA` from `constants/scoring-criteria.ts` — no hardcoded strings in the component
2. Selected tags have a visually distinct style (e.g., filled `Badge` vs. outline `Badge` with shadcn/ui)
3. Zod schema on the Server Action validates: `z.array(z.string()).max(5)` for criteria; individual strings must be members of `SCORING_CRITERIA` (enum-like validation)
4. Criteria field is optional — `criteria: []` is a valid input; the `IdeaScore` record is written regardless of whether any criteria are selected

**Estimated Effort**: XS (~5 min)

---

### Feature 4: Score Visibility on Idea Detail Page — Must Have

**Description**: On the idea detail page (`/ideas/[id]`), display the numeric score and criteria tags once the idea's status is `ACCEPTED` or `REJECTED` and an `IdeaScore` record exists. The score is shown to the submitter (post-decision) and all admin roles at all times after the decision. V1-era ideas with no `IdeaScore` show nothing in the score section.

**User Stories**:

- [ ] US-V2-06-i: As SUBMITTER viewing my `ACCEPTED` or `REJECTED` idea, I see the score (e.g., "Score: 4 / 5") and the criteria tags (e.g., "Technical Feasibility, Strategic Alignment") in the idea metadata section.
- [ ] US-V2-06-j: As SUBMITTER viewing my idea while it is still `UNDER_REVIEW`, I do not see the score section — it is absent from the page entirely.
- [ ] US-V2-06-k: As ADMIN viewing any finalised idea, I see the score and criteria regardless of whether blind review was active during review.
- [ ] US-V2-06-l: As any user viewing a V1-era idea (no `IdeaScore`), the score section is simply absent — no "No score" placeholder shown.

**Acceptance Criteria**:

1. Score section renders below the decision metadata on the idea detail page when: `idea.status` is `ACCEPTED` or `REJECTED` AND `idea.score` is non-null (Prisma relation loaded)
2. Score section contains: star rating display (static, not interactive) + numeric label `"N / 5"` + criteria tag list (empty list renders no tags, no placeholder)
3. Score section is completely absent when `idea.status` is `SUBMITTED` or `UNDER_REVIEW` — not hidden with CSS, not in the DOM
4. Score section is absent for ideas with no `IdeaScore` record (e.g., V1-era ideas) — no "No score" placeholder
5. `FEATURE_SCORING_ENABLED=false` causes the Server Action to not return score data; the detail page component treats null score as absent

**Estimated Effort**: XS (~5 min)

---

### Feature 5: Analytics Widgets — Should Have

**Description**: Add three new widgets to the admin analytics page (`/admin/analytics`). All analytics queries must handle `IdeaScore = null` gracefully by excluding un-scored ideas from averages and rankings. Queries must remain paginated or limited to avoid unbounded dataset scans.

**Widgets**:

1. **Average Score by Category** (`avgScoreByCategory`): Bar chart. X-axis = category names; Y-axis = average score (1.0–5.0, one decimal). Only categories with ≥ 1 scored idea are included. Categories with no scored ideas show "No scored ideas yet."
2. **Score Distribution Histogram** (`scoreDistribution`): Bar chart with 5 buckets (1, 2, 3, 4, 5). Each bucket shows the count of `IdeaScore` records with that value. All 5 buckets always rendered, count may be `0`.
3. **Top-Scored Accepted Ideas** (`topScoredIdeas`): A list of up to 5 accepted ideas sorted by `score DESC`, showing idea title, category, score, and submitter name (subject to blind review masking if applicable). V1 ideas excluded.

**User Stories**:

- [ ] US-V2-06-m: As ADMIN on `/admin/analytics`, I see the "Average Score by Category" bar chart with the current averages.
- [ ] US-V2-06-n: As ADMIN, the score distribution histogram shows counts for all 5 score values; a bucket with zero ideas shows `0`.
- [ ] US-V2-06-o: As ADMIN, the "Top Scored Ideas" list shows up to 5 accepted ideas sorted by score descending. If fewer than 5 accepted ideas have been scored, all scored ones are shown.
- [ ] US-V2-06-p: As ADMIN querying analytics when no ideas have been scored yet, the average score chart shows "No scored ideas yet" and the top-scored list is empty — no runtime errors.

**Acceptance Criteria**:

1. All three widgets are conditionally rendered only when `FEATURE_SCORING_ENABLED=true`; they are absent from the analytics page when the flag is `false`
2. Analytics queries are implemented as Server Actions with `({ where: { score: { isNot: null } } })` filters — un-scored ideas are excluded from all aggregate computations
3. `avgScoreByCategory` query uses `prisma.ideaScore.groupBy({ by: ['idea.category'], _avg: { score: true } })` or equivalent; result excludes categories where `count = 0`
4. `scoreDistribution` query uses `prisma.ideaScore.groupBy({ by: ['score'], _count: { score: true } })`; the UI fills in missing score values with `count: 0`
5. `topScoredIdeas` query returns `take: 5`, `orderBy: { score: 'desc' }`, `where: { idea: { status: 'ACCEPTED' } }`, and includes the `idea` relation
6. "Top Scored Ideas" list applies the blind review masking function if the idea's pipeline has `blindReview=true` and the requester is `ADMIN` (consistent with EPIC-V2-05 masking logic)
7. EC-7.4: When `avgScoreByCategory` returns no rows for a category, the UI renders "No scored ideas yet" — not a null reference error

**Estimated Effort**: S (~18 min)

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)

| Dependency                                                                                                                | Type | Status                                                            | Risk                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| EPIC-V2-04 (Multi-Stage Review) — `ReviewPipelineStage.isDecisionStage`, `IdeaStageProgress`, decision stage review panel | V2.0 | Must be merged first                                              | High — the star rating input is added to the decision stage review panel; there is no other natural location for score capture |
| EPIC-V2-05 (Blind Review) — masking logic in `lib/blind-review.ts`                                                        | V2.0 | Soft dependency — Analytics Feature 5 reuses the masking function | Med — if EPIC-V2-05 is not merged first, duplicate masking code must be extracted later                                        |

### 6.2 Blocking (Downstream)

| Dependent Epic                           | Impact if EPIC-V2-06 is Delayed |
| ---------------------------------------- | ------------------------------- |
| None — EPIC-V2-06 is the final V2.0 epic | N/A                             |

---

## 7. UX / Design

- **Star rating on review panel**: 5 Lucide `Star` icons in a row. Unselected = `text-muted-foreground` outline. Selected (and all stars to the left) = `text-yellow-400` filled. Keyboard accessible: arrow left/right changes selection; Enter confirms. Label above: "Rate this idea (required)".
- **Criteria tag group**: Rendered as a `flex flex-wrap gap-2` row of `Badge` components. Unselected = `variant="outline"`. Selected = `variant="default"` (brand colour fill). Label above: "Criteria (optional, max 5)".
- **Validation error placement**: Inline below the star rating row — `text-destructive text-sm`. Does not use a toast — it must be visible without scrolling.
- **Score on idea detail page**: A new section between the decision metadata and the comments/audit log section. Header: "Score". Content: static star display (Lucide `Star` filled to `score`, empty for the rest) + `"N / 5"` + criteria `Badge` list (outline variant, non-interactive).
- **Analytics widgets**: Use the same `recharts` charting library already used by the existing analytics page (`submission-trend-chart.tsx`). The two bar charts use the existing `BarChart` wrapper component. The top-scored list uses a plain `Table` with columns: Title, Category, Score, Submitter.
- **Empty states**: No scored ideas → display a `p` tag in the widget: "No scored ideas yet. Scores will appear after decisions are finalized."

---

## 8. Technical Notes

- **Atomic write**: The decision Server Action must atomically create the `IdeaScore` record AND update `Idea.status` AND write the `AuditLog` in a single `prisma.$transaction`. A partial write (e.g., status updated but score not recorded) must not be possible.
- **DB check constraint vs. Zod**: Zod is the first line of defence (rejects bad values before hitting the DB). The DB constraint (`CHECK (score >= 1 AND score <= 5)`) is a secondary safety net against API tampering. Both must be present.
- **`@@unique([ideaId])` race condition**: If two concurrent requests attempt to create an `IdeaScore` for the same idea (EC-7.3), the unique constraint on `ideaId` causes a Prisma `P2002` error on the second insert. The Server Action must catch `P2002` and return `409 Conflict: "A score has already been recorded for this idea."`.
- **`criteria` as `String[]`**: Prisma's `String[]` maps to `text[]` in PostgreSQL. Storing criteria as strings (not a relation to a separate `ScoreCriteria` model) is intentional — the fixed list is a UX constant, not domain data that needs independent lifecycle management.
- **Analytics query performance**: The `IdeaScore` table is expected to be small (one row per submitted idea). No additional indexes beyond `@@index([score])` are required at V2.0 scale. If the analytics queries run on the server at request time (not cached), add `unstable_cache` or `next/cache` revalidation tags.
- **V1 idea exclusion from analytics**: V1 ideas have no `IdeaScore` and no `ReviewPipeline` association. The Prisma query `where: { score: { isNot: null } }` naturally excludes them. No explicit V1/V2 discriminator field is needed for analytics.
- **`FEATURE_SCORING_ENABLED` check placement**: Check the feature flag at the top of the decision Server Action. If `false`, proceed with the decision without requiring or persisting a score. The star rating component should also check the flag via a server-side prop to prevent client-side circumvention.

---

## 9. Milestones & Timeline

| Milestone                   | Features Included | Target                           | Exit Criteria                                                                                                                           |
| --------------------------- | ----------------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| M1 — Data Layer             | Feature 1         | Phase 7 start                    | Migration clean; `IdeaScore` table exists; check constraint verified; `IDEA_SCORED` enum present; criteria constant exported            |
| M2 — Review Panel           | Features 2, 3     | Phase 7 mid (~17 min)            | Decision panel shows star rating + criteria tags; submission blocked without score; `IdeaScore` record written atomically with decision |
| M3 — Visibility & Analytics | Features 4, 5     | Phase 7 complete (~45 min total) | Score shown post-decision to submitter and admins; 3 analytics widgets render correctly; empty-state handled                            |

---

## 10. Success Metrics

| Metric                      | Target                                                                                                                           |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Migration clean             | `IdeaScore` table created; check constraint `IdeaScore_score_range` present                                                      |
| Required score enforced     | `POST /api/ideas/[id]/decision` without `score` returns `422` with message "A score (1–5) is required to finalise the decision." |
| Out-of-range score blocked  | `score: 0` or `score: 6` returns `400` via Zod; DB constraint also rejects if bypassed                                           |
| Atomic write                | Killing the server mid-transaction does not leave an orphaned `IdeaScore` without a corresponding status update                  |
| Race condition handled      | Concurrent duplicate submissions return `409` on the second attempt — no duplicate `IdeaScore` rows                              |
| Score hidden pre-decision   | Submitter on `UNDER_REVIEW` idea sees no score section on the detail page                                                        |
| Score visible post-decision | Submitter on `ACCEPTED`/`REJECTED` idea sees score and criteria tags                                                             |
| Analytics empty state       | Analytics page with 0 scored ideas renders "No scored ideas yet" — no JS error in the console                                    |
| Test coverage               | ≥ 80% line coverage on the decision Server Action (including score path) and `maskAuthorIfBlind()` interaction                   |

---

## 11. Risks & Mitigations

| #   | Risk                                                                                                                                            | Likelihood       | Impact | Mitigation                                                                                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The decision Server Action becomes too large — scoring logic, blind review masking, state machine transition, and audit log all in one function | High             | Med    | Extract scoring into a dedicated `recordIdeaScore(tx, payload)` helper called from within the `$transaction` closure. Keep the Server Action as an orchestrator only.                                 |
| 2   | Analytics queries run on every page load and become slow as `IdeaScore` grows                                                                   | Low (V2.0 scale) | Med    | Wrap analytics Server Actions in Next.js `unstable_cache` with a `revalidate: 300` (5-minute cache). Invalidate cache tag `analytics` on every `IDEA_SCORED` audit write.                             |
| 3   | `criteria` stored as `String[]` — a typo in a criteria string (e.g., "Techical Feasibility") permanently corrupts historical data               | Low              | Med    | Zod validation on the Server Action strictly enumerates valid criteria values using `z.enum(SCORING_CRITERIA as [string, ...string[]])`. Invalid strings are rejected at submission time.             |
| 4   | The "Top Scored Ideas" analytics widget shows an unmasked submitter identity for a blind-review idea                                            | Med              | Med    | Explicitly call `maskAuthorIfBlind()` on each idea in the `topScoredIdeas` query result (same function as EPIC-V2-05). Add an integration test to assert masking is applied in the analytics context. |
| 5   | EC-7.3 (race condition duplicate `IdeaScore`) causes an unhandled Prisma `P2002` error to surface as a 500 to the client                        | Low              | Med    | Catch `PrismaClientKnownRequestError` with code `P2002` in the Server Action and return `409 Conflict` with a user-facing message.                                                                    |

---

## 12. Open Questions

| #   | Question                                                                                                                                                                                                                         | Owner      | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1   | Should scores be immutable after finalization, or should a SUPERADMIN be able to correct a mis-entered score? (PRD recommendation: immutable — editing scores post-decision undermines audit integrity.)                         | Aykan Uğur | Open   |
| 2   | Should the score be shown on the ideas list page (`/ideas`) alongside the decision badge, or only on the idea detail page? (Current scope: detail page only. Adding to list page is low-effort but changes information density.) | Aykan Uğur | Open   |
| 3   | Should analytics include a "reviewer leaderboard" — showing which admins give the highest/lowest average scores? (Out of scope for V2.0 but `reviewerId` on `IdeaScore` enables this in V3.0.)                                   | Aykan Uğur | Open   |

---

## Appendix: Revision History

| Version | Date       | Author     | Changes                                                            |
| ------- | ---------- | ---------- | ------------------------------------------------------------------ |
| 0.1     | 2026-02-25 | Aykan Uğur | Initial draft — all sections complete based on PRD V2.0 Section 10 |
