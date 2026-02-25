# User Story: Scoring Analytics Widgets on Analytics Page

**Story ID**: US-044
**Epic**: EPIC-V2-06 — Scoring System
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P2 (Should)
**Estimate**: S
**Sprint**: Phase 7 — Step 5
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** admin or superadmin on the Analytics page,
**I want to** see average score by category, score distribution, and the top-scored accepted ideas,
**so that** leadership can compare idea quality across categories and identify the best candidates for implementation.

---

## Context & Motivation

After implementing the scoring system, the raw scores sit in the database but are invisible in the Analytics dashboard. Three focused widgets surface the most decision-relevant insights: where quality is highest (by category), how scores are distributed (histogram), and which specific ideas ranked best overall. These widgets complete the scoring feature loop — collect, display, analyse.

---

## Acceptance Criteria

1. **Given** `FEATURE_SCORING_ENABLED=true` and the admin loads the Analytics page,
   **When** the page renders,
   **Then** three new widgets appear in the Scoring section below the existing charts: "Avg Score by Category", "Score Distribution", and "Top Scored Ideas".

2. **Given** the "Avg Score by Category" widget,
   **When** scored ideas exist across multiple categories,
   **Then** a `recharts` `BarChart` is rendered with one bar per category showing the average score (rounded to 1 decimal), Y-axis range fixed 0–5, and category labels on the X-axis.

3. **Given** the "Score Distribution" widget,
   **When** scores exist,
   **Then** a histogram bar chart displays 5 buckets (scores 1, 2, 3, 4, 5) each showing the count of ideas with that score — all 5 buckets always rendered even if count is 0 (to maintain consistent axis shape).

4. **Given** the "Top Scored Ideas" widget,
   **When** at least one `ACCEPTED` idea has an `IdeaScore`,
   **Then** a list of the top 5 ACCEPTED ideas by score (descending) is rendered, each row showing: idea title (linked to detail page), score stars, and author display name (masked if `idea.blindReviewMode=true`).

5. **Given** no ideas have been scored yet,
   **When** any of the three widgets renders,
   **Then** each widget shows its own empty state: "No scored ideas yet" with a muted subtext, and no chart/list attempts to render.

6. **Given** `FEATURE_SCORING_ENABLED=false`,
   **When** the analytics page loads,
   **Then** none of the three scoring widgets appear in the DOM (not even empty containers).

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                           | Expected Behavior                                                                                                 |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| 1   | All scored ideas are in one category                               | "Avg Score by Category" shows one bar; no visual error for single-bar chart                                       |
| 2   | Two ideas tied for 5th place in the top-scored list                | The query uses `take: 5` — ties are broken by `createdAt DESC`; only 5 rows max are shown                         |
| 3   | An accepted idea in the top-scored list has `blindReviewMode=true` | Author column shows "Anonymous" — `maskAuthorIfBlind()` utility (US-038) applied in the data transformation layer |
| 4   | Score distribution: all ideas have score 5                         | Buckets 1–4 show bar with count 0; bucket 5 shows actual count — all 5 buckets always present                     |

---

## UI / UX Notes

- New section added to the Analytics page: `<section id="scoring-analytics">` with heading "Scoring Insights"
- Three widgets rendered in a responsive grid: `grid grid-cols-1 md:grid-cols-2 gap-6` (top-scored list spans full width below)
- "Avg Score by Category" and "Score Distribution": `recharts` `BarChart` with `ResponsiveContainer width="100%" height={260}`
- Bar fill colour: `fill="hsl(var(--primary))"` for consistency with existing charts
- "Top Scored Ideas" widget: `<Table>` with columns: Title, Score (stars), Category, Author
- Static star display (re-use `StarDisplay` from US-041)
- Empty state: `<EmptyState icon={<Star />} title="No scored ideas yet" description="Scores will appear here after admins rate accepted or rejected ideas." />`
- Chart tooltips: average score on hover for category chart; count on hover for distribution chart
- Loading state: skeleton cards (same pattern as existing analytics widgets)

---

## Technical Notes

- Three new server-side data fetching functions in `lib/actions/analytics.ts`:
  ```ts
  async function getAvgScoreByCategory(): Promise<{ category: string; avg: number }[]>
  async function getScoreDistribution(): Promise<{ score: number; count: number }[]>
  async function getTopScoredIdeas(limit = 5): Promise<TopScoredIdea[]>
  ```
- `getAvgScoreByCategory`:
  ```ts
  const raw = await prisma.ideaScore.groupBy({ by: ['ideaId'], _avg: { score: true } })
  // join with Idea.category via a raw aggregation or a separate query + in-memory group
  ```
  Prefer: `prisma.$queryRaw` with a `GROUP BY i.category` for a single round-trip.
- `getScoreDistribution`:
  ```ts
  const raw = await prisma.ideaScore.groupBy({ by: ['score'], _count: { score: true } })
  // Fill missing buckets 1-5 with count 0 in application layer
  ```
- `getTopScoredIdeas`:
  ```ts
  const scores = await prisma.ideaScore.findMany({
    where: { idea: { status: 'ACCEPTED' } },
    orderBy: { score: 'desc' },
    take: limit,
    include: {
      idea: { select: { id, title, category, blindReviewMode, user: { select: { displayName } } } },
    },
  })
  return scores.map((s) => ({ ...s, authorName: maskAuthorIfBlind(s.idea) }))
  ```
- Wrap all three calls in `unstable_cache` with `revalidate: 300` (5-minute cache) and tag `['analytics', 'scoring']`.
- Analytics page (`app/admin/analytics/page.tsx`) renders within Next.js RSC — no client bundle for data fetching.
- `recharts` is an existing dependency (used by existing charts in `components/analytics/`).
- **Feature Flag**: `FEATURE_SCORING_ENABLED`.

---

## Dependencies

| Dependency                                        | Type  | Status             | Blocker? |
| ------------------------------------------------- | ----- | ------------------ | -------- |
| US-040 — `IdeaScore` model and `SCORING_CRITERIA` | Story | Must be done first | Yes      |
| US-038 — `maskAuthorIfBlind()` utility            | Story | Must be done first | Yes      |
| US-041 — `StarDisplay` component                  | Story | Must be done first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] Analytics page shows "Scoring Insights" section with all three widgets when `FEATURE_SCORING_ENABLED=true`
- [ ] "Avg Score by Category" chart renders one bar per category with correct average values
- [ ] "Score Distribution" histogram always shows 5 buckets even when some have count 0
- [ ] "Top Scored Ideas" list shows max 5 rows, sorted score desc
- [ ] Blind-mode accepted idea in top-scored list shows "Anonymous" author
- [ ] Empty state shown when no scores exist
- [ ] `FEATURE_SCORING_ENABLED=false` → no scoring widgets in DOM

### Automated Testing

- [ ] Unit: `getScoreDistribution()` fills missing buckets with count 0
- [ ] Unit: `getTopScoredIdeas()` applies `maskAuthorIfBlind()` for blind-mode ideas
- [ ] Integration: `getAvgScoreByCategory()` returns correct averages from seeded test data
- [ ] Integration: `getTopScoredIdeas()` returns only ACCEPTED ideas, limited to 5
- [ ] E2E: Admin visits analytics page after scoring 3 ideas → all three widgets visible with data

---

## Definition of Done

- [ ] Three analytics data functions implemented and cached in `lib/actions/analytics.ts`
- [ ] "Scoring Insights" section and three widgets added to `app/admin/analytics/page.tsx`
- [ ] Score distribution always renders all 5 buckets
- [ ] `maskAuthorIfBlind()` applied in top-scored list
- [ ] Empty state handled for each widget independently
- [ ] `git commit: feat(scoring): scoring analytics widgets on analytics page`
