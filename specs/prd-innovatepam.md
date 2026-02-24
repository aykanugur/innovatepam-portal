# Product Requirements Document: InnovatEPAM Portal

**Document Owner**: Aykan Uğur — Admin  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Version**: 0.1  

---

## 1. Executive Summary

InnovatEPAM Portal is an internal employee innovation management platform that enables all EPAM employees globally — across engineering, design, product management, business analysis, and other functions — to submit, track, and evaluate innovation ideas through a structured digital workflow. The platform exists because EPAM currently has no formal, centralized channel for capturing employee ideas, resulting in valuable innovations being lost. By providing a transparent submission-to-evaluation pipeline with role-based access (submitters and administrators), InnovatEPAM ensures every idea is recorded, reviewed, and acted upon — turning scattered creativity into a measurable organizational asset.

---

## 2. Problem Statement

### 2.1 Current State
There is no formal system for capturing employee innovation ideas at EPAM. Ideas are currently shared ad-hoc through Slack messages, emails, or verbal conversations during meetings. There is no centralized repository, no structured format, and no defined process for what happens after an idea is mentioned. As a result, the vast majority of employee-generated ideas are never recorded, evaluated, or acted upon.

### 2.2 Pain Points
| # | Pain Point | Who It Affects | Severity |
|---|-----------|----------------|----------|
| 1 | Ideas are permanently lost — no central place to capture them, so they disappear after the initial conversation | All employees (submitters) | High |
| 2 | Zero feedback loop — employees who share ideas never receive acknowledgment, status updates, or evaluation outcomes | All employees (submitters) | High |
| 3 | No visibility for leadership — management cannot measure the volume, quality, or themes of employee ideas across the organization | Admins / Leadership | High |
| 4 | No evaluation process — without a workflow, ideas cannot be triaged, prioritized, or routed to the right decision-makers | Admins / Reviewers | Med |
| 5 | Duplication of effort — without a shared registry, multiple employees may independently work on the same idea without knowing | All employees | Med |

### 2.3 Opportunity
Solving this problem directly increases employee engagement and retention by giving every employee a visible, structured channel to contribute innovation ideas and receive feedback. When employees see that their ideas are captured, evaluated, and acted upon, it reinforces a culture of ownership and belonging — a measurable driver of retention in a competitive talent market.

---

## 3. Goals & Success Metrics

| Goal | Metric | Current Baseline | Target | Timeframe |
|------|--------|-----------------|--------|-----------|
| Drive consistent idea flow | Ideas submitted per month | 0 (no system exists) | 50 ideas/month | 6 months post-launch |
| Ensure timely admin evaluation | Average review turnaround time | N/A | ≤ 5 business days from submission to decision | 3 months post-launch |
| Achieve meaningful adoption | Monthly Active Users (MAU) | 0 | 200+ MAU | 3 months post-launch |
| Maintain code quality | Automated test coverage | 0% | ≥ 80% line coverage | At MVP launch |

### Anti-Goals (Explicitly Out of Scope)
- **NOT a public-facing product** — InnovatEPAM is strictly internal to EPAM. No external user access, no public URLs, no client-facing features.
- **NOT a project management tool** — The portal tracks ideas and their evaluation status only. It does not include task boards, sprint planning, Gantt charts, or resource allocation.
- **NOT a social platform** — Phase 1 MVP has no commenting, liking, upvoting, or discussion threads between employees. Feedback flows only from admin to submitter via the evaluation workflow.

---

## 4. Target Users & Personas

### 4.1 Primary Persona — Idea Submitter
- **Name / Archetype**: "Elif — Cross-Functional EPAM Employee"
- **Demographics**: Full-time EPAM employee in any function (engineering, design, BA, QA, PM, delivery). Mid-career (2-8 years experience). Uses internal EPAM tools daily. Comfortable with web applications.
- **Core Need**: A single, easy-to-find place to submit an innovation idea with a title, description, category, and optional file attachment — and know that it will be reviewed.
- **Current Workaround**: Mentions ideas in Slack channels or team meetings. Occasionally writes them in personal notes. No feedback is ever received; ideas are forgotten within days.

### 4.2 Secondary Persona — Admin / Reviewer
- **Name / Archetype**: "Deniz — Innovation Program Manager"
- **Demographics**: Dedicated Innovation Program Manager at EPAM. Reviews and evaluates submitted ideas as a primary job responsibility. Needs a structured workflow to triage ideas efficiently across the organization.
- **Core Need**: A dashboard to view all submitted ideas, filter by status and category, and move each idea through a defined evaluation workflow (Submitted → Under Review → Accepted / Rejected) with mandatory reviewer comments.
- **Current Workaround**: Manually collects ideas from Slack threads or meeting notes into a private spreadsheet. No standardized evaluation criteria. No way to communicate decisions back to submitters at scale.

### 4.3 Non-Target Users
- **External clients and partners** — The portal is internal-only; no external access is provided.
- **Contractors and temporary staff** — Only full-time EPAM employees may register and use the platform. Contractor access is explicitly excluded from all phases.

---

## 5. User Stories & Scenarios

### US-1: Register & Verify Account — Priority: P1 (Must Have)
**As a** full-time EPAM employee, **I want to** register with my email and password and verify my email address, **so that** I have a secure, authenticated account on the portal.

**Acceptance Criteria**:
1. **Given** an unregistered user on the registration page, **When** they submit a valid email and password (min 8 chars, 1 uppercase, 1 number), **Then** the system creates the account in a "pending verification" state and sends a verification email within 60 seconds.
2. **Given** a user with a pending verification email, **When** they click the verification link within 24 hours, **Then** their account status changes to "active" and they are redirected to the login page with a success message.
3. **Given** a user attempting to register with an email that already exists, **When** they submit the form, **Then** the system displays an error: "An account with this email already exists."

---

### US-2: Login & Logout — Priority: P1 (Must Have)
**As a** registered employee, **I want to** log in with my email and password and log out when done, **so that** my session is secure and I can access my ideas.

**Acceptance Criteria**:
1. **Given** a verified user on the login page, **When** they enter valid credentials, **Then** the system authenticates them and redirects to the idea listing page within 2 seconds.
2. **Given** a logged-in user, **When** they click "Logout," **Then** their session is terminated, they are redirected to the login page, and no authenticated actions can be performed without re-login.
3. **Given** a user entering incorrect credentials, **When** they submit the login form, **Then** the system displays: "Invalid email or password." (no indication of which field is wrong).

---

### US-3: Submit an Idea — Priority: P1 (Must Have)
**As a** logged-in submitter, **I want to** submit an innovation idea with a title, description, category, and optional file attachment, **so that** my idea is formally captured and enters the evaluation pipeline.

**Acceptance Criteria**:
1. **Given** a logged-in submitter on the idea submission form, **When** they fill in title (max 150 chars), description (max 5,000 chars), select a category from the fixed list (Process Improvement, New Product/Service, Cost Reduction, Employee Experience, Technical Innovation), and click "Submit," **Then** the idea is saved with status "Submitted" and a confirmation message is shown.
2. **Given** a submitter attaching a file, **When** the file is a PDF, PNG, JPG, DOCX, or MD and ≤ 5 MB, **Then** the file is uploaded and linked to the idea.
3. **Given** a submitter attaching a file that exceeds 5 MB or is an unsupported type, **When** they attempt to upload, **Then** the system rejects the file with a specific error message: "File must be PDF, PNG, JPG, DOCX, or MD and under 5 MB."
4. **Given** a submitter submitting the form with title or description empty, **When** they click "Submit," **Then** inline validation errors are displayed on the missing fields. The form is not submitted.

---

### US-4: View Idea Listing — Priority: P1 (Must Have)
**As a** logged-in user (submitter or admin), **I want to** see a list of all submitted ideas, **so that** I can browse what has been submitted and check statuses.

**Acceptance Criteria**:
1. **Given** a logged-in user navigating to the ideas page, **When** the page loads, **Then** a paginated list of ideas is displayed showing: title, category, status badge (Submitted / Under Review / Accepted / Rejected), submitter name, and submission date. Default sort: newest first. Page size: 10 ideas per page.
2. **Given** a user viewing the idea list, **When** they click on an idea title, **Then** they are navigated to the idea detail page showing all fields including description, attachment (if any), and admin comments (if evaluated).

---

### US-5: Admin Evaluates an Idea — Priority: P1 (Must Have)
**As an** admin (Innovation Program Manager), **I want to** change an idea's status and add a reviewer comment, **so that** every idea receives a formal evaluation decision.

**Acceptance Criteria**:
1. **Given** an admin viewing an idea with status "Submitted," **When** they click "Start Review," **Then** the status changes to "Under Review" and the timestamp is recorded.
2. **Given** an admin viewing an idea with status "Under Review," **When** they select "Accept" or "Reject" and enter a mandatory comment (min 10 chars, max 2,000 chars), **Then** the status updates accordingly, the comment is saved, and the submitter can see the decision and comment on the idea detail page.
3. **Given** an admin attempting to accept or reject without entering a comment, **When** they click the action button, **Then** the system displays: "A review comment is required (minimum 10 characters)."

---

### US-6: Role-Based Access Control — Priority: P1 (Must Have)
**As the** system, **I want to** enforce role-based permissions (submitter vs. admin), **so that** only authorized users can perform evaluation actions.

**Acceptance Criteria**:
1. **Given** a user with the "submitter" role, **When** they view an idea detail page, **Then** they see the idea content and status but do NOT see "Start Review," "Accept," or "Reject" buttons.
2. **Given** a user with the "admin" role, **When** they view an idea detail page, **Then** they see all evaluation action buttons in addition to the idea content.
3. **Given** a submitter attempting to call the evaluation API directly (e.g., via cURL), **When** the request is made, **Then** the server returns HTTP 403 Forbidden.

---

## 6. Functional Requirements

### 6.1 Authentication & Account Management
| ID | Requirement | Priority | Notes |
|----|------------|----------|-------|
| FR-01 | User registers with email and password. Password policy: min 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number. | Must | Client-side + server-side validation |
| FR-02 | System sends a verification email within 60 seconds of registration. Verification link expires after 24 hours. | Must | Unverified accounts cannot log in |
| FR-03 | User logs in with verified email + password. Session is created upon success. | Must | |
| FR-04 | User logs out. Session is destroyed server-side; client token is invalidated. | Must | |
| FR-05 | Duplicate email registration is rejected with error message. | Must | No information leakage about existing accounts beyond "already exists" |

### 6.2 Role Management
| ID | Requirement | Priority | Notes |
|----|------------|----------|-------|
| FR-06 | Three roles exist: **superadmin**, **admin**, **submitter**. All new registrations default to "submitter." | Must | |
| FR-07 | Superadmin can promote any registered user to "admin" via a user management page. | Must | First superadmin account is seeded during deployment |
| FR-08 | Superadmin can demote an admin back to "submitter." | Should | |
| FR-09 | Role changes take effect immediately; no re-login required. | Must | |

### 6.3 Idea Submission
| ID | Requirement | Priority | Notes |
|----|------------|----------|-------|
| FR-10 | Submitter fills in: **Title** (required, max 150 chars), **Description** (required, max 5,000 chars), **Category** (required, single-select from fixed list). | Must | |
| FR-11 | Fixed category list: Process Improvement, New Product/Service, Cost Reduction, Employee Experience, Technical Innovation. | Must | Not editable by users in Phase 1 |
| FR-12 | Optional single file attachment. Allowed types: PDF, PNG, JPG, DOCX, MD. Max size: 5 MB. | Must | Server rejects disallowed types/sizes with specific error |
| FR-13 | Submitter sets idea **visibility**: "Public" (visible to all users) or "Private" (visible only to the submitter and admins). Default: Public. | Must | |
| FR-14 | Upon successful submission, idea status is set to "Submitted" with a UTC timestamp. | Must | |

### 6.4 Idea Listing & Detail
| ID | Requirement | Priority | Notes |
|----|------------|----------|-------|
| FR-15 | Idea listing page shows all public ideas and the current user's own private ideas. Admins see all ideas regardless of visibility. | Must | |
| FR-16 | Each list item displays: title, category, status badge (Submitted / Under Review / Accepted / Rejected), submitter name, submission date, visibility icon (public/private). | Must | |
| FR-17 | List is paginated: 10 ideas per page, default sort by newest first. | Must | |
| FR-18 | Idea detail page shows all submitted fields, attachment download link (if any), status, and admin review comment (if evaluated). | Must | |

### 6.5 Evaluation Workflow
| ID | Requirement | Priority | Notes |
|----|------------|----------|-------|
| FR-19 | Status transitions: Submitted → Under Review → Accepted **or** Rejected. No other transitions allowed. | Must | State machine enforced server-side |
| FR-20 | Admin clicks "Start Review" to move idea from "Submitted" to "Under Review." | Must | |
| FR-21 | Admin selects "Accept" or "Reject" and enters a mandatory comment (min 10 chars, max 2,000 chars) to finalize evaluation. | Must | |
| FR-22 | Evaluated ideas display the admin's comment and decision on the idea detail page, visible to the submitter. | Must | |
| FR-23 | Admins cannot evaluate their own submitted ideas. | Should | Prevents conflict of interest |

---

## 7. Non-Functional Requirements

| Category | Requirement | Target |
|----------|------------|--------|
| **Performance** | Page load time (initial + navigation) | < 2 seconds at P95 |
| **Performance** | API response time (all endpoints) | < 500 milliseconds at P95 |
| **Performance** | File upload (5 MB attachment) | < 5 seconds including server processing |
| **Scalability** | Concurrent users | 500 simultaneous users |
| **Scalability** | Total registered users | 10,000 accounts |
| **Scalability** | Stored ideas | 50,000 ideas without performance degradation |
| **Availability** | Uptime SLA | 99.5% monthly (allows ~3.6 hours downtime/month) |
| **Security** | Transport encryption | HTTPS (TLS 1.2+) on all endpoints; no HTTP fallback |
| **Security** | Password storage | Bcrypt or Argon2 hashing; plaintext passwords never stored or logged |
| **Security** | Session management | Server-side sessions or signed JWT with ≤ 24-hour expiry; refresh token rotation |
| **Security** | Input validation | Server-side validation on all user inputs; XSS and SQL injection prevention |
| **Security** | File upload validation | Server-side MIME type verification; virus scanning deferred to Phase 2 |
| **Accessibility** | WCAG compliance | WCAG 2.1 Level AA across all pages |
| **Accessibility** | Keyboard navigation | All interactive elements reachable and operable via keyboard |
| **Accessibility** | Screen reader | Semantic HTML, ARIA labels on dynamic content, alt text on images |
| **Internationalization** | Language support | English only for Phase 1 MVP |
| **Testing** | Automated test coverage | ≥ 80% line coverage (unit + integration) |
| **Testing** | E2E test coverage | Critical paths (register, login, submit idea, evaluate idea) covered |
| **Code Quality** | Git history | Conventional Commits; clean, linear history (squash merges) |
| **Browser Support** | Desktop browsers | Chrome (latest 2), Firefox (latest 2), Edge (latest 2), Safari (latest 2) |
| **Browser Support** | Mobile browsers | Responsive layout; Chrome Mobile and Safari Mobile (latest) |

---

## 8. UX / Design Considerations

- **Design System**: EPAM internal design system / brand guidelines. If unavailable or insufficient for specific components, fall back to a well-maintained component library (e.g., shadcn/ui) styled to match EPAM brand colors and typography.
- **Design References**: TBD — link to Figma / brand guide once available.
- **Key UX Principles**: Clean and functional; progressive disclosure; minimize clicks-to-action; consistent status feedback (toasts, loading states, empty states).
- **Platform**: Web only — fully responsive design that works on desktop and mobile browsers.
- **Responsive Breakpoints**: Mobile (< 640px), Tablet (640px–1024px), Desktop (> 1024px).

### Page Inventory (MVP)

| # | Page | Route (proposed) | Primary User | Description |
|---|------|------------------|-------------|-------------|
| 1 | **Register** | `/register` | Unauthenticated | Email + password registration form with validation |
| 2 | **Login** | `/login` | Unauthenticated | Email + password login form |
| 3 | **Idea List** | `/ideas` | All authenticated | Paginated list of ideas with status badges and visibility icons |
| 4 | **Idea Detail** | `/ideas/:id` | All authenticated | Full idea view; admin evaluation actions shown for admin role |
| 5 | **Submit Idea** | `/ideas/new` | Submitter | Form: title, description, category, visibility toggle, file attachment |
| 6 | **My Ideas** | `/my-ideas` | Submitter | Filtered view of the current user's submitted ideas and their statuses |
| 7 | **Admin Dashboard** | `/admin` | Admin / Superadmin | Overview: ideas by status, pending reviews count, recent activity |
| 8 | **User Management** | `/admin/users` | Superadmin | List of registered users with role promotion/demotion controls |
| 9 | **Profile / Settings** | `/profile` | All authenticated | View/edit display name; change password |
| 10 | **Analytics** | `/admin/analytics` | Admin / Superadmin | Charts: ideas submitted over time, ideas by category, ideas by status, avg review time |

---

## 9. Technical Considerations

### 9.1 Architecture Notes
- **Framework**: Next.js 15+ (App Router) with TypeScript (strict mode).
- **ORM**: Prisma ORM with PostgreSQL.
- **Auth**: Server-side session management via NextAuth.js (Auth.js v5) with credentials provider. Bcrypt password hashing.
- **API**: Next.js Route Handlers (`app/api/...`) for all backend endpoints. No separate backend service.
- **File Uploads**: Stored on the local filesystem (`/uploads` directory) for MVP. Files are referenced by path in the database. Migration path to cloud object storage (e.g., Vercel Blob) planned for Phase 2.
- **Styling**: Tailwind CSS v4 with EPAM brand tokens. shadcn/ui for component primitives if EPAM design system components are unavailable.

### 9.2 Dependencies
| Dependency | Type | Owner | Risk Level |
|-----------|------|-------|------------|
| Vercel hosting platform | External Service | Vercel | Low — mature platform, free/pro tiers available |
| Managed PostgreSQL (Neon or Vercel Postgres) | External Service | Neon / Vercel | Low — production-grade managed databases |
| NextAuth.js (Auth.js v5) | Open-source library | Auth.js community | Low — widely adopted, active maintenance |
| Prisma ORM | Open-source library | Prisma team | Low — stable, well-documented |
| EPAM email service (for verification emails) | Internal Service | EPAM IT | Med — dependency on internal SMTP/email relay availability |

### 9.3 Data & Privacy
- **Data collected**: Employee email, hashed password, display name, submitted idea content (title, description, category, visibility, attachment), admin review comments.
- **PII handling**: Email addresses and display names are PII. Stored in encrypted-at-rest PostgreSQL database. No PII is logged in application logs.
- **Data retention**: Ideas and user accounts are retained indefinitely while the system is active. Account deletion (GDPR right-to-erasure) is deferred to Phase 2.
- **Compliance**: Internal EPAM data policies apply. No external data sharing. GDPR compliance for EU employees to be fully addressed in Phase 2 (data export, deletion requests).

---

## 10. Release Strategy

### 10.1 Phasing
| Phase | Scope | Target Date | Success Gate |
|-------|-------|-------------|-------------|
| Alpha | All P1 user stories (US-1 through US-6), all 10 pages functional. Developer self-testing. | Day 2 (end of day) | Core flows work E2E: register → verify → login → submit idea → admin evaluate. ≥ 80% test coverage. |
| GA | Bug fixes from alpha, performance validation, deploy to production. | Day 3 (end of day) | Zero critical bugs. All acceptance criteria pass. Portal accessible to all EPAM employees. |

### 10.2 Feature Flags / Rollout
- Feature flags managed via environment variables (e.g., `FEATURE_ANALYTICS_ENABLED`, `FEATURE_USER_MANAGEMENT_ENABLED`).
- Global kill switch: `PORTAL_ENABLED=true|false` — instantly disables the entire portal and shows a maintenance page.
- Analytics page and User Management page behind individual flags to allow independent enablement.

### 10.3 Rollback Plan
- Vercel instant rollback: revert to previous deployment via Vercel dashboard (< 30 seconds).
- Database: no destructive migrations in MVP. If rollback is needed, the previous deployment works against the same schema.
- Feature flags: disable specific features without redeploying.

---

## 11. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | **3-day timeline is extremely tight** — risk of incomplete features or test coverage falling below the 80% target. | High | High | Strict prioritization: build US-1 through US-5 on Day 1, US-6 + admin pages on Day 2, testing + polish on Day 3. If behind schedule, cut Analytics page (page 10) and Profile/Settings (page 9) first — they are lowest priority. |
| 2 | **Scope creep** — 10 pages in 3 days may force cutting corners on code quality, accessibility, or test coverage. | High | High | Hard-lock the scope to the 6 P1 user stories defined in Section 5. Pages 7-10 (Admin Dashboard, User Management, Profile, Analytics) are "Should Have" — defer if Day 2 is not on track. No new features added mid-sprint. |
| 3 | **Local filesystem for file storage won't work on Vercel** — Vercel's serverless architecture has no persistent disk; uploaded files would be lost between deployments. | High | Med | For MVP, use Vercel Blob Storage or store file references as base64 in the database (≤ 5 MB). Alternatively, disable file attachment behind a feature flag and ship without it if storage is unresolved by Day 2. |
| 4 | **Email verification dependency** — if no SMTP service is configured, users cannot complete registration. | Med | High | For MVP, use a free transactional email service (e.g., Resend free tier: 100 emails/day). Fallback: auto-verify accounts in development/alpha and add email verification behind a feature flag. |
| 5 | **Single developer, no code review** — increased risk of bugs, security oversights, or architectural mistakes shipping to production. | Med | Med | Rely on AI-assisted code review (Copilot), strict TypeScript types, comprehensive test coverage, and the agent.md workflow (verification before done). Run `specify check` before each commit. |
| 6 | **EPAM design system unavailability** — if brand guidelines or component library are not accessible, UI consistency may suffer. | Med | Low | Default to shadcn/ui + Tailwind CSS with EPAM brand colors (from public brand assets). Swap components later when the official design system is available. |

---

## 12. Open Questions

| # | Question | Owner | Status | Resolution |
|---|---------|-------|--------|------------|
| 1 | How will the superadmin account be initially created? Options: Prisma DB seed script, environment variable (`SUPERADMIN_EMAIL`), or a one-time CLI command. | Aykan Uğur | Open | — |
| 2 | Should Vercel Blob Storage replace local filesystem for attachments before GA, given Vercel's serverless constraints? | Aykan Uğur | Open | — |
| 3 | Is email verification required for alpha phase, or can it be deferred behind a feature flag until GA? | Aykan Uğur | Open | — |

---

## 13. References & Links

- [InnovatEPAM PRD (this document)](specs/prd-innovatepam.md)

---

## Appendix: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-02-24 | Aykan Uğur | Initial draft — all 13 sections completed for Phase 1 MVP |
