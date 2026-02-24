# Epic: Idea Submission & Discovery

**Epic ID**: EPIC-03  
**Owner**: Aykan Uğur — Admin  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Target Release**: Day 1 (EOD) – Day 2 (Morning) (Alpha)  
**PRD Reference**: [specs/prd-innovatepam.md](../prd-innovatepam.md)

---

## 1. Summary

Build the core idea lifecycle from a submitter's perspective: the submission form, the paginated idea list, and the idea detail page. This is the primary value delivery for the Submitter persona — after auth, it is the first thing every user interacts with.

---

## 2. Business Context

### 2.1 Strategic Alignment
- **Company Goal**: Reach 50 ideas/month within 6 months post-launch.
- **Product Vision Fit**: Without idea submission and visibility, the portal has no purpose. This epic delivers the core product value.

### 2.2 Business Value
| Value Driver | Description | Estimated Impact |
|-------------|-------------|-----------------|
| Engagement | Every employee can submit and track ideas, ending the "ideas disappear" pain | Core retention driver |
| Visibility | All employees see submitted ideas, reducing duplication of effort | -20% duplicate ideas |

### 2.3 Cost of Delay
Without this epic, the portal is an empty shell. EPIC-04 (evaluation) has nothing to evaluate. No ideas submitted = zero progress toward 50 ideas/month KPI.

---

## 3. Scope

### 3.1 In Scope
- Submit Idea form (`/ideas/new`): title, description, category selector, visibility toggle, file attachment (FR-10 to FR-14)
- Idea List page (`/ideas`): paginated (10/page), newest first, status badges, visibility icon (FR-15 to FR-17)
- Idea Detail page (`/ideas/:id`): full idea view with attachment download and review comment if evaluated (FR-18)
- My Ideas page (`/my-ideas`): filtered to current user's submissions
- API routes: `POST /api/ideas`, `GET /api/ideas`, `GET /api/ideas/:id`
- File storage: Vercel Blob Storage (or base64 in DB as fallback)

### 3.2 Out of Scope
- Evaluation actions on idea detail (EPIC-04)
- Filtering/search on idea list (Phase 2)
- Comments between employees (out of scope per PRD anti-goals)

### 3.3 Assumptions
- `FEATURE_FILE_ATTACHMENT_ENABLED` flag resolves the Vercel storage decision before Day 2 starts
- Category list is hardcoded in the app (not stored in DB) for Phase 1

---

## 4. User Personas

| Persona | Role | Primary Need |
|---------|------|-------------|
| Elif (Submitter) | Cross-functional employee | Submit a well-formed idea and see it in the list |
| Deniz (Admin) | Innovation PM | Browse all submitted ideas before evaluating them |

---

## 5. Feature Breakdown

### Feature 1: Submit Idea Form — Must Have
**Description**: `/ideas/new` page with a controlled form. On submit, creates an `Idea` record via `POST /api/ideas`.

**User Stories**:
- [ ] US-03-a: As a submitter, I can fill in title, description, category, and click Submit to create an idea
- [ ] US-03-b: As a submitter, I can optionally attach a single file (PDF, PNG, JPG, DOCX, MD; ≤ 5 MB)
- [ ] US-03-c: As a submitter, I can toggle visibility between Public and Private

**Acceptance Criteria**:
1. Title: required, max 150 chars. Description: required, max 5,000 chars. Category: required dropdown.
2. On submit with valid data → idea created with status `SUBMITTED`, UTC timestamp recorded, user redirected to `/ideas/:id` with success toast
3. File > 5 MB or wrong type → server returns 400: "File must be PDF, PNG, JPG, DOCX, or MD and under 5 MB."
4. Empty title or description → inline validation errors; form not submitted
5. Character counters visible for title and description fields

**Estimated Effort**: M

---

### Feature 2: Idea List Page — Must Have
**Description**: `/ideas` paginated table/card list showing all public ideas + own private ideas. Admins see all.

**User Stories**:
- [ ] US-04-a: As a logged-in user, I see a paginated list of ideas with title, category, status, submitter, date, and visibility icon
- [ ] US-04-b: As a user, I can navigate between pages

**Acceptance Criteria**:
1. Page loads within 2 seconds at P95
2. Shows 10 ideas per page; pagination controls at bottom
3. Default sort: newest first
4. Status displayed as a color-coded badge: Submitted (grey), Under Review (blue), Accepted (green), Rejected (red)
5. Private ideas show a lock icon; only submitter and admins see them

**Estimated Effort**: S

---

### Feature 3: Idea Detail Page — Must Have
**Description**: `/ideas/:id` full idea view. Shows all fields, attachment download link, and admin review comment if the idea has been evaluated.

**User Stories**:
- [ ] US-04-c: As a user, I can click an idea to see its full description and current status
- [ ] US-03-d: As a submitter, I can see the admin's review comment after my idea is evaluated

**Acceptance Criteria**:
1. Shows: title, description, category, submitter, submitted date, status badge, visibility badge
2. If attachment exists → shows filename and a download link
3. If idea has been evaluated → shows reviewer name, decision (Accepted/Rejected), comment text, and review date
4. Non-owner submitter cannot see another user's private idea (returns 404)

**Estimated Effort**: S

---

### Feature 4: My Ideas Page — Must Have
**Description**: `/my-ideas` filtered to the current user's ideas only. Reuses idea list component.

**User Stories**:
- [ ] As a submitter, I can view only my own submitted ideas and their current statuses in one place

**Acceptance Criteria**:
1. Shows all ideas (public and private) submitted by the logged-in user
2. Same list component as `/ideas` — just filtered by `authorId = session.user.id`
3. Empty state: "You haven't submitted any ideas yet. [Submit your first idea →]"

**Estimated Effort**: XS

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)
| Dependency | Type | Status | Risk |
|-----------|------|--------|------|
| EPIC-01 — `Idea`, `IdeaReview` Prisma models | Internal | Must be complete | Low |
| EPIC-02 — Authenticated session with `userId` | Internal | Must be complete | Low |
| Vercel Blob or file storage decision | Internal | Open question | High — resolve end of Day 1 |

### 6.2 Blocking (Downstream)
| Dependent | Impact if Delayed |
|----------|------------------|
| EPIC-04 (Evaluation) | Admins need an idea in `SUBMITTED` state to begin evaluation |

---

## 7. UX / Design
- **Pages**: `/ideas/new`, `/ideas`, `/ideas/:id`, `/my-ideas`
- Submit form: single column; floating labels; character counter on title/description
- List page: card grid on mobile, table on desktop ≥ 1024px
- Status badges: pill shape, color-coded per status
- Empty state on `/ideas`: "No ideas submitted yet. Be the first! [Submit an idea →]"
- File attachment field: drag-and-drop zone with click-to-browse fallback

---

## 8. Technical Notes
- `POST /api/ideas` — validates body with Zod schema; saves file to Vercel Blob; returns created idea
- `GET /api/ideas` — respects `authorId` filter for `/my-ideas`; enforces visibility rules
- Categories are a TypeScript `const` array, not a DB table: `['Process Improvement', 'New Product/Service', 'Cost Reduction', 'Employee Experience', 'Technical Innovation']`
- Feature flag: `FEATURE_FILE_ATTACHMENT_ENABLED=true|false`

---

## 9. Milestones & Timeline

| Milestone | Features | Target | Exit Criteria |
|-----------|---------|--------|---------------|
| M1 — Core submission | Features 1-2 | Day 1, EOD | Submit idea → appears in list |
| M2 — Full discovery | Features 3-4 | Day 2, 12:00 | Detail page shows review comment; My Ideas filtered correctly |

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Idea list page load | < 2s at P95 |
| Idea submission API | < 500ms (without file) |
| File upload (5 MB) | < 5s |

---

## 11. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Vercel serverless — no local filesystem for uploads | High | Med | Use `FEATURE_FILE_ATTACHMENT_ENABLED=false` if Vercel Blob not configured; disable attachment UI entirely |
| 2 | Pagination complexity slowing Day 1 | Med | Low | Use simple `OFFSET/LIMIT` SQL via Prisma; no cursor pagination needed for MVP |

---

## 12. Open Questions

| # | Question | Owner | Status |
|---|---------|-------|--------|
| 1 | Vercel Blob vs. base64 in DB for file storage? | Aykan Uğur | Open — must be resolved before Day 2 |

---

## Appendix: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-02-24 | Aykan Uğur | Initial draft |
