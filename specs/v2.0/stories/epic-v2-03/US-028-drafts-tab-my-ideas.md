# User Story: Drafts Tab on My Ideas Page

**Story ID**: US-028
**Epic**: EPIC-V2-03 — Draft Management
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 4 — Step 3
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** submitter,
**I want to** see all my saved drafts in a dedicated "Drafts" tab on My Ideas,
**so that** I can quickly find and resume an in-progress idea without searching through submitted ideas.

---

## Context & Motivation

Without a dedicated view, a submitter has no way to discover their saved drafts after navigating away. The Drafts tab aggregates all `DRAFT` ideas belonging to the current user, showing title, category, last-saved date, and expiry countdown — giving clear context about which drafts need attention before they expire.

---

## Acceptance Criteria

1. **Given** `FEATURE_DRAFT_ENABLED=true`,
   **When** I visit `/my-ideas`,
   **Then** I see two tabs: "Submitted" (existing V1 tab) and "Drafts" (new tab).

2. **Given** I click the "Drafts" tab,
   **When** I have at least one unexpired draft,
   **Then** each draft is listed with: title (or "Untitled Draft" if empty), category badge, "Last saved" date, "Expires in N days" countdown, and a "Resume" button linking to `/ideas/[id]/edit`.

3. **Given** I have no unexpired drafts,
   **When** the "Drafts" tab is active,
   **Then** I see an empty state: "No drafts yet. Start an idea and save it as a draft to continue later."

4. **Given** a draft's `draftExpiresAt` has passed (it should have been removed by the cron but hasn't yet),
   **When** the Drafts tab loads,
   **Then** expired drafts are excluded from the query (`where: { draftExpiresAt: { gt: new Date() } }`).

5. **Given** `FEATURE_DRAFT_ENABLED=false`,
   **When** I visit `/my-ideas`,
   **Then** no "Drafts" tab is rendered — the page looks identical to V1.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                   | Expected Behavior                                                          |
| --- | ------------------------------------------ | -------------------------------------------------------------------------- |
| 1   | Draft has 0 days remaining (expires today) | "Expires today" label shown in amber/warning colour                        |
| 2   | Draft title is empty string `""`           | Render "Untitled Draft" in italic                                          |
| 3   | Submitter has 50+ drafts                   | Query is paginated (`take: 20`, with a "Load more" button) — not unbounded |

---

## UI / UX Notes

- Route: `/my-ideas` (existing page, add tab)
- Tabs: "Submitted" | "Drafts" — using shadcn/ui `Tabs` component
- Draft list: shadcn/ui `Card` per draft (consistent with V1 idea card style)
- "Expires in N days": amber colour if ≤ 7 days; green if > 7 days
- "Resume" button: secondary outlined button linking to `/ideas/[id]/edit`
- Delete draft button (trash icon): allows submitter to discard a draft from this view — calls `deleteDraft(ideaId)` Server Action; shows confirmation dialog

---

## Technical Notes

- Add a `getDrafts()` Server Action that queries: `prisma.idea.findMany({ where: { authorId: session.user.id, status: 'DRAFT', draftExpiresAt: { gt: new Date() } }, orderBy: { updatedAt: 'desc' } })`
- The draft delete Server Action: `deleteDraft(ideaId)` — verifies `authorId === session.user.id`, deletes from DB, returns success.
- The "Submitted" tab query already excludes `DRAFT` (from US-026 changes) — no additional change needed.
- **Feature Flag**: `FEATURE_DRAFT_ENABLED`.

---

## Dependencies

| Dependency                                | Type  | Status                     | Blocker? |
| ----------------------------------------- | ----- | -------------------------- | -------- |
| US-026 — `DRAFT` status                   | Story | Must be done first         | Yes      |
| US-027 — Save Draft (produces drafts)     | Story | Required to have test data | No       |
| US-011 (V1) — My Ideas page (`/my-ideas`) | Story | Already exists             | No       |

---

## Test Plan

### Manual Testing

- [ ] Save a draft → navigate to `/my-ideas` → "Drafts" tab shows the draft with correct title, expiry
- [ ] Draft with no title → shows "Untitled Draft"
- [ ] No drafts → empty state message shown
- [ ] `FEATURE_DRAFT_ENABLED=false` → no "Drafts" tab

### Automated Testing

- [ ] Unit: `getDrafts()` query excludes ideas with `draftExpiresAt <= now()`
- [ ] Unit: `getDrafts()` only returns ideas belonging to the current user
- [ ] Unit: `DraftCard` renders "Untitled Draft" when `title === ""`

---

## Definition of Done

- [ ] "Drafts" tab added to `/my-ideas` behind feature flag
- [ ] Draft list shows correct metadata including expiry countdown
- [ ] Delete draft action works from the drafts tab
- [ ] `git commit: feat(drafts): drafts tab on my-ideas page`
