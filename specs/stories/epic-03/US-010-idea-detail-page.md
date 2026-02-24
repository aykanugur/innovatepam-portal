# User Story: Idea Detail Page

**Story ID**: US-010  
**Epic**: EPIC-03 — Idea Submission & Discovery  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: S  
**Sprint**: Day 2 — AM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As an** authenticated employee,  
**I want to** view the full details of a submitted idea including its description, status, review decision, and any attached file,  
**so that** I can read the complete context and understand the evaluation outcome.

---

## Context & Motivation

The idea detail page is the canonical single-source-of-truth view for any idea. It is also the landing page after submitting a new idea (US-008 redirects here). Reviewers use it as part of the evaluation workflow (US-012).

---

## Acceptance Criteria

1. **Given** I visit `/ideas/<id>` for a PUBLIC idea,  
   **When** the page loads,  
   **Then** I see the full title, description, author display name, category, visibility, status badge, and submission date.

2. **Given** the idea has an `IdeaReview` record,  
   **When** the page loads,  
   **Then** I see the reviewer's decision (Accepted / Rejected), the mandatory comment, reviewer display name, and review date.

3. **Given** `FEATURE_FILE_ATTACHMENT_ENABLED=true` and `Idea.attachmentPath` is set,  
   **When** the page loads,  
   **Then** I see a "Download Attachment" link that opens/downloads the file from Vercel Blob.

4. **Given** the idea belongs to me and has `status=SUBMITTED`,  
   **When** I view the detail page,  
   **Then** I see an "Edit" button (stretch goal) and a "Delete" button that soft-deletes the idea.

5. **Given** I visit `/ideas/<id>` for a PRIVATE idea that is NOT mine (and I am not ADMIN),  
   **When** the page loads,  
   **Then** I receive a 404 Not Found response.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | Idea `id` does not exist | Return 404 not found page |
| 2 | Attachment URL has expired or been deleted from Blob | Show "Attachment unavailable" text instead of broken link |
| 3 | ADMIN deletes reviewed idea | Cascade rules: IdeaReview deleted too (Prisma `onDelete: Cascade`) |

---

## UI / UX Notes

- Route: `/ideas/[id]`
- Layout: constrained (max-w-3xl centered)
- Sections:
  1. Header: Title + status badge + "Back to Ideas" breadcrumb
  2. Meta row: Author | Category | Submitted date | Visibility icon
  3. Description: full prose block
  4. Attachment (conditional): paperclip icon + filename + "Download" button
  5. Review Decision (conditional): card with decision badge, reviewer, date, comment

---

## Technical Notes

- Server Component: `const idea = await prisma.idea.findUnique({ where: { id }, include: { author: true, review: { include: { reviewer: true } } } })`
- Visibility check: `if (idea.visibility === 'PRIVATE' && idea.authorId !== session.user.id && session.user.role === 'SUBMITTER') return notFound()`
- Attachment download: direct link to Vercel Blob URL (public access)
- Delete: Server Action `deleteIdea(ideaId)` — checks `idea.authorId === session.user.id || ADMIN`
- **Feature Flag**: `FEATURE_FILE_ATTACHMENT_ENABLED`

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-008 — Submit idea form | Story | Creates ideas | Yes |
| US-012 — Evaluation workflow | Story | Creates `IdeaReview` records | Parallel |

---

## Test Plan

### Manual Testing
- [ ] View PUBLIC idea as SUBMITTER → all fields visible
- [ ] View reviewed idea → review card shows decision + comment
- [ ] View attachment link → file downloads
- [ ] View own PRIVATE idea → accessible
- [ ] View other user's PRIVATE idea as SUBMITTER → 404
- [ ] Delete own idea → removed from list

### Automated Testing
- [ ] Unit: visibility guard returns 404 for unauthorized PRIVATE access
- [ ] Integration: `findUnique` includes review and reviewer data
- [ ] E2E: Submit idea → land on detail page → verify all fields

---

## Definition of Done

- [ ] Full idea details render correctly
- [ ] Review decision card shown when review exists
- [ ] PRIVATE visibility guard returns 404
- [ ] Attachment download link works
- [ ] Delete action removes idea
- [ ] All AC passing
- [ ] `git commit: feat(ideas): idea detail page`
