# Epic: Evaluation Workflow, Admin Tools & Quality Gate

**Epic ID**: EPIC-04  
**Owner**: Aykan Uğur — Admin  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Target Release**: Day 2 (Afternoon) – Day 3 (EOD) — GA  
**PRD Reference**: [specs/prd-innovatepam.md](../prd-innovatepam.md)

---

## 1. Summary

Deliver the admin evaluation workflow (status transitions + mandatory review comments), the admin dashboard, the analytics page, and the profile/settings page. Then validate the full portal with ≥ 80% test coverage and deploy to production. This epic closes the feedback loop between submitters and admins and ships the portal to GA.

---

## 2. Business Context

### 2.1 Strategic Alignment
- **Company Goal**: ≤ 5-business-day review turnaround; ≥ 80% test coverage at launch.
- **Product Vision Fit**: The evaluation workflow is what transforms the portal from a suggestion box into an innovation pipeline. Without it, submitters never hear back, killing engagement.

### 2.2 Business Value
| Value Driver | Description | Estimated Impact |
|-------------|-------------|-----------------|
| Engagement retention | Submitters receive a formal decision + comment, closing the feedback loop | Eliminates the #2 pain point (zero feedback loop) |
| Admin efficiency | Structured workflow + dashboard prevents ideas falling through the cracks | ≤ 5-day review SLA becomes achievable |
| Code quality | ≥ 80% test coverage catches regressions at PR time, not post-deployment | Reduces production incidents |

### 2.3 Cost of Delay
Without the evaluation workflow, the portal is a one-way submission box with no value to admins. Without the quality gate, the GA deployment carries unknown regression risk in a 3-day project with no second reviewer.

---

## 3. Scope

### 3.1 In Scope
- Evaluation workflow on Idea Detail page: "Start Review" → "Accept / Reject" with mandatory comment (FR-19 to FR-23)
- Admin Dashboard (`/admin`): count cards by status, pending review queue
- Analytics page (`/admin/analytics`): ideas over time, by category, by status, avg review time
- Profile / Settings page (`/profile`): change display name, change password
- Unit + integration tests (≥ 80% line coverage via Vitest / Jest)
- E2E tests for 4 critical paths (Playwright)
- Final Vercel GA deployment with production env vars

### 3.2 Out of Scope
- Multi-stage review or blind review (Phase 2)
- Scoring system 1-5 (Phase 2)
- Email notifications on status change (Phase 2)
- Ideas commenting between employees (PRD anti-goal)

### 3.3 Assumptions
- EPICs 01-03 are fully deployed and passing E2E by Day 2 noon
- Playwright is installed in the project from Day 1
- Analytics charts use a lightweight library (recharts or Chart.js) — no BI tool

---

## 4. User Personas

| Persona | Role | Primary Need |
|---------|------|-------------|
| Deniz (Admin) | Innovation PM | Evaluate ideas efficiently, see pending queue at a glance |
| Elif (Submitter) | Employee | See the admin's decision and comment on her submitted idea |
| Aykan (Superadmin) | Portal owner | Confirm ≥ 80% test coverage before GA; deploy with zero critical bugs |

---

## 5. Feature Breakdown

### Feature 1: Evaluation Workflow (Idea Detail) — Must Have
**Description**: Admin-only action buttons on `/ideas/:id`. State machine: `SUBMITTED → UNDER_REVIEW → ACCEPTED | REJECTED`. Mandatory comment on final decision.

**User Stories**:
- [ ] US-05-a: As an admin, I can click "Start Review" to move an idea to Under Review
- [ ] US-05-b: As an admin, I can Accept or Reject an idea with a mandatory comment
- [ ] US-06-e: As a submitter, I can see the admin's decision and comment on my idea detail page

**Acceptance Criteria**:
1. "Start Review" button only visible to `ADMIN` / `SUPERADMIN` roles; clicking it sets status to `UNDER_REVIEW` and timestamps the change
2. "Accept" / "Reject" buttons appear only when status is `UNDER_REVIEW`
3. Submitting without a comment (or comment < 10 chars) shows: "A review comment is required (minimum 10 characters)."
4. After evaluation, submitter sees: decision badge, reviewer name, comment, review date
5. Admin cannot evaluate their own submitted idea — action buttons hidden; API returns 403 if attempted directly
6. Invalid state transitions (e.g., `ACCEPTED → UNDER_REVIEW`) return HTTP 400

**Estimated Effort**: M

---

### Feature 2: Admin Dashboard — Must Have
**Description**: `/admin` overview page for admins. Shows idea counts by status and a "Pending Review" quick-access list.

**User Stories**:
- [ ] As an admin, I see a dashboard showing: total ideas, pending review count, accepted count, rejected count
- [ ] As an admin, I can access ideas in "Submitted" state directly from the dashboard

**Acceptance Criteria**:
1. Displays 4 count cards: Total Ideas, Pending Review (SUBMITTED), Under Review, Accepted, Rejected
2. "Pending Review" section lists the 5 most recent `SUBMITTED` ideas with a direct link to each
3. Only accessible to `ADMIN` and `SUPERADMIN` roles; others get 403

**Estimated Effort**: S

---

### Feature 3: Analytics Page — Should Have (defer if behind schedule)
**Description**: `/admin/analytics` with 4 charts: ideas submitted over time (line), ideas by category (bar), ideas by status (donut), and average review time (stat card).

**User Stories**:
- [ ] As an admin, I can view idea submission trends over time
- [ ] As an admin, I can see which categories receive the most ideas

**Acceptance Criteria**:
1. Line chart: ideas submitted per day for last 30 days
2. Bar chart: count per category
3. Donut chart: count per status
4. Stat card: average days from `SUBMITTED` to final decision
5. Behind `FEATURE_ANALYTICS_ENABLED=true` flag — page returns 404 if flag is false

**Estimated Effort**: M

---

### Feature 4: Profile / Settings Page — Should Have (defer if behind schedule)
**Description**: `/profile` page where any logged-in user can update display name and change password.

**User Stories**:
- [ ] As a user, I can update my display name
- [ ] As a user, I can change my password (requires current password)

**Acceptance Criteria**:
1. Display name update: required, max 100 chars; saved on submit with success toast
2. Password change: requires current password; new password must meet policy (8+ chars, 1 uppercase, 1 number)
3. Wrong current password → "Current password is incorrect."

**Estimated Effort**: S

---

### Feature 5: Test Suite & Quality Gate — Must Have
**Description**: Write unit, integration, and E2E tests to reach ≥ 80% line coverage. This is a non-negotiable PRD requirement.

**User Stories**:
- [ ] Unit tests: all API route handlers, validation logic, role checks, state machine transitions
- [ ] Integration tests: DB operations via Prisma with a test database
- [ ] E2E tests (Playwright): 4 critical paths

**E2E Critical Paths**:
1. Register → verify email (or skip flag) → login → land on `/ideas`
2. Submit idea (with & without attachment) → appears in idea list
3. Admin starts review → accepts idea with comment → submitter sees decision
4. Submitter attempts admin action → gets 403

**Acceptance Criteria**:
1. `npm run test:coverage` reports ≥ 80% line coverage
2. All 4 E2E paths pass in CI (`npm run test:e2e`)
3. Zero failing tests before GA deployment

**Estimated Effort**: L

---

### Feature 6: GA Deployment & Smoke Test — Must Have
**Description**: Final Vercel production deployment. Run post-deploy smoke test checklist.

**User Stories**:
- [ ] As the developer, I deploy the final build to production and verify all critical paths work

**Acceptance Criteria**:
1. Vercel production deployment shows zero build errors
2. Manual smoke test: register, submit idea, admin evaluates → all work on production URL
3. No critical bugs outstanding (blocker = cannot complete a P1 user story)

**Estimated Effort**: XS

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)
| Dependency | Type | Status | Risk |
|-----------|------|--------|------|
| EPIC-03 — Ideas with `SUBMITTED` status in DB | Internal | Required for testing evaluation | Low |
| EPIC-02 — Admin session + RBAC | Internal | Required for role checks | Low |

### 6.2 Blocking (Downstream)
| Dependent | Impact if Delayed |
|----------|------------------|
| GA Release | Blocked until Feature 5 (tests) passes quality gate |

---

## 7. UX / Design
- **Pages**: `/ideas/:id` (evaluation actions), `/admin`, `/admin/analytics`, `/profile`
- Evaluation actions: sticky bottom bar on mobile, side panel on desktop ≥ 1024px
- Decision badge on submitter view: "✓ Accepted" (green) / "✗ Rejected" (red) with reviewer + date
- Dashboard: grid of stat cards using shadcn/ui `Card` component
- Analytics: recharts `LineChart`, `BarChart`, `RadialBarChart`

---

## 8. Technical Notes
- Evaluation API: `PATCH /api/ideas/:id/status` — body `{ action: 'START_REVIEW' | 'ACCEPT' | 'REJECT', comment?: string }`
- State machine enforced in a pure function: `transitionStatus(currentStatus, action)` — tested in isolation
- Analytics queries: run with Prisma `groupBy` — no raw SQL needed
- Test setup: Vitest for unit/integration; Playwright for E2E; separate test DB via `DATABASE_URL_TEST`

---

## 9. Milestones & Timeline

| Milestone | Features | Target | Exit Criteria |
|-----------|---------|--------|---------------|
| M1 — Evaluation live | Features 1-2 | Day 2, 18:00 | Admin can accept/reject; submitter sees decision |
| M2 — Quality gate | Feature 5 | Day 3, 14:00 | ≥ 80% coverage; 4 E2E paths green |
| M3 — GA | Feature 6 + Features 3-4 if time | Day 3, EOD | Zero critical bugs; production deployment live |

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Test line coverage | ≥ 80% |
| E2E critical paths | 4/4 passing |
| Evaluation API response | < 500ms at P95 |
| GA deployment | Zero build errors; smoke test passes |
| Critical bugs at GA | 0 |

---

## 11. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Tests require more time than estimated — coverage falls below 80% | High | High | Write tests alongside features (not all at end). Prioritize API handler tests first — they yield highest coverage per hour |
| 2 | Analytics/Profile pages not finished in time | Med | Low | Both are behind feature flags and marked "Should Have" — cut them cleanly and ship GA without them |
| 3 | E2E Playwright flakiness (timeouts, selectors) | Med | Med | Use `data-testid` attributes on all interactive elements from the start; set 10s timeout |

---

## 12. Open Questions

| # | Question | Owner | Status |
|---|---------|-------|--------|
| 1 | Vitest or Jest for unit/integration tests? | Aykan Uğur | Open — Vitest preferred for Next.js 15 |
| 2 | Should avg review time stat exclude ideas still in `SUBMITTED` state? | Aykan Uğur | Open |

---

## Appendix: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-02-24 | Aykan Uğur | Initial draft |
