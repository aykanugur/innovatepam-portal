# Feature Specification: Foundation & Infrastructure

**Feature Branch**: `001-foundation`  
**Created**: 2026-02-24  
**Status**: Draft  
**Stories**: US-001, US-002, US-003 (EPIC-01)

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Consistent Project Foundation (Priority: P1)

A developer joining the project clones the repository and is immediately productive. The codebase compiles without errors, passes all code-quality checks, and renders a working page with the design system components applied. No manual configuration is needed to get a clean build.

**Why this priority**: Every subsequent story — authentication, idea submission, admin flows — starts from this foundation. A misconfigured project causes rework across all future stories. This must be verified and green before anything else is built.

**Independent Test**: Can be fully tested by cloning the repository, running the build and lint check, and confirming the home page renders a design system component with styling applied. No database or external services are required.

**Acceptance Scenarios**:

1. **Given** the project has been set up,  
   **When** a full build is triggered,  
   **Then** it completes with zero errors and zero warnings.

2. **Given** the project has been set up,  
   **When** `npm run lint` (ESLint) and `npm run type-check` (`tsc --noEmit`) are run,  
   **Then** both report zero errors and zero warnings.

3. **Given** the project has been set up,  
   **When** the home page is opened in a browser,  
   **Then** a design system component (e.g., a button) is visible and correctly styled.

4. **Given** a code file is saved,  
   **When** the formatter runs,  
   **Then** the file is automatically formatted to the project's defined style (no semi-colons, single quotes, 2-space indent).

5. **Given** a developer attempts to commit code,  
   **When** the pre-commit hook runs,  
   **Then** linting and formatting are enforced automatically before the commit is accepted.

---

### User Story 2 — Stable Data Schema (Priority: P1)

A developer working on any feature epic has a single, reliable schema definition that accurately represents all core business entities and their relationships. They can inspect the schema visually, verify table structure, and run test queries against the database — all without modifying any code.

**Why this priority**: Every feature in the portal reads or writes data. Defining the schema once, correctly, prevents costly database migrations mid-sprint. It directly unblocks EPIC-02 (needs `User`) and EPIC-03 (needs `Idea`).

**Independent Test**: Can be fully tested by running the database migration, opening the visual database explorer, and confirming all three tables exist with correct columns and relationships. A test read query against any table returns an empty response without error.

**Acceptance Scenarios**:

1. **Given** the database credentials are configured,  
   **When** the schema migration is run,  
   **Then** it completes without errors and creates the `User`, `Idea`, and `IdeaReview` tables in the database.

2. **Given** the migration has completed,  
   **When** the database explorer is opened,  
   **Then** all three tables are visible with the correct columns and relationships.

3. **Given** the schema is in place,  
   **When** a read query is executed against any table,  
   **Then** it returns an empty result set without error, confirming connectivity.

---

### User Story 3 — Deployment Confidence (Priority: P1)

A developer can onboard to the project within minutes and knows exactly which environment variables are required and why. The application is live on the production hosting platform on Day 1, proving the deployment pipeline works before any feature work begins.

**Why this priority**: Discovering a broken deployment pipeline on Day 3 is a project killer. Verifying the pipeline works with the initial scaffold eliminates this risk. Documented environment variables ensure no key is forgotten by any team member.

**Independent Test**: Can be fully tested by confirming the documented environment variable list covers all required keys with descriptions, that the local secrets file is excluded from version control, and that the production URL returns a successful response.

**Acceptance Scenarios**:

1. **Given** all required environment variables are configured locally,  
   **When** the development server is started,  
   **Then** the application starts without errors and the home page returns a successful response.

2. **Given** environment variables are configured in the hosting platform,  
   **When** a change is pushed to the main branch,  
   **Then** the deployment completes without errors and the production URL returns a successful response.

3. **Given** the environment variable documentation file exists,  
   **When** it is opened,  
   **Then** it lists every required variable name (without any real values) and includes a comment describing each variable's purpose.

4. **Given** the local secrets file exists,  
   **When** version control status is checked,  
   **Then** the local secrets file is not tracked and will never be committed.

---

### Edge Cases

- A developer sets up the project but omits a required environment variable: the application fails to start with a clear error identifying the missing variable — not a generic crash.
- A design system component conflicts with the CSS framework version: the conflict is resolved before progressing; no `@ts-ignore` or style overrides are used as workarounds.
- When `PORTAL_ENABLED=false` and any route is requested: `proxy.ts` intercepts the request before the Next.js router, returns HTTP **503**, and renders a standalone HTML maintenance page — no redirect, no 200, no JSON body.
- The database connection string points to the wrong database: the migration fails with a clear error message; no partial schema is applied.
- The local secrets file is accidentally staged for commit: the pre-commit hook or version control ignore pattern prevents it from being included.
- The migration is run twice on the same database: the operation is idempotent and produces no errors or duplicate tables.
- The environment variable documentation file is opened after new variables are added by another developer: it reflects all current variables — no undocumented keys exist in the codebase.
- A `User` record is created without a display name value: the database rejects the insert — the application layer is responsible for always supplying the email-derived value before persisting.
- An idea submission arrives with a category value not in the predefined list: the application layer rejects it with a validation error before any database operation is attempted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The project MUST produce a clean build (`npm run build`) with zero TypeScript errors and zero ESLint warnings in project-authored code (`app/`, `lib/`, `components/`, `constants/`). Third-party package build notices originating from `node_modules` are excluded from this gate.
- **FR-002**: The project MUST pass two code-quality checks — `npm run lint` (ESLint) and `npm run type-check` (`tsc --noEmit`) — each reporting zero errors and zero warnings after initial setup. Prettier formatting is enforced by the pre-commit hook (`lint-staged`), not a separate CI check.
- **FR-003**: The project MUST include a design system component library configured and ready for use, with at least one component rendered on the home page.
- **FR-004**: The project MUST enforce consistent code formatting automatically on every commit via a pre-commit hook — no manual formatting step should be required.
- **FR-005**: The data schema MUST define `User`, `Idea`, `IdeaReview`, and `VerificationToken` as first-class entities. All four tables are created in the initial migration so that EPIC-02 requires no additional schema migration.
- **FR-006**: The `User` entity MUST support three distinct roles: `SUBMITTER` (default on creation), `ADMIN`, and `SUPERADMIN`. In user-facing UI prose these are displayed as "Submitter", "Admin", and "Super Admin" respectively.
- **FR-007**: The `Idea` entity MUST track a lifecycle status (submitted → under review → accepted / rejected) and a visibility setting (public or private).
- **FR-008**: The `IdeaReview` entity MUST enforce a one-to-one relationship with its parent idea (one review per idea maximum).
- **FR-009**: The database schema MUST be applied via a repeatable, version-controlled migration that can be run in any environment from a single command.
- **FR-010**: A version-controlled environment variable documentation file MUST exist listing every required variable name with a description and no actual secret values committed. The complete required set is:
  - `DATABASE_URL` — pooled database connection string (PgBouncer)
  - `DIRECT_URL` — direct database connection string (used by migration CLI, bypasses pool)
  - `AUTH_SECRET` — 32+ character secret for signing session tokens
  - `NEXTAUTH_URL` — canonical application URL (e.g. `http://localhost:3000` in development)
  - `RESEND_API_KEY` — transactional email service key (required when `FEATURE_EMAIL_VERIFICATION_ENABLED=true`)
  - `UPSTASH_REDIS_REST_URL` — rate limiter store URL (falls back to in-memory if absent)
  - `UPSTASH_REDIS_REST_TOKEN` — rate limiter store token (falls back to in-memory if absent)
  - `SUPERADMIN_EMAIL` — email address to auto-promote to super-administrator on first seed
  - `PORTAL_ENABLED` — global kill switch; `false` causes all routes to return a maintenance response
  - `FEATURE_EMAIL_VERIFICATION_ENABLED` — enables email verification flow after registration
  - `FEATURE_USER_MANAGEMENT_ENABLED` — enables the admin user management interface
  - `FEATURE_FILE_ATTACHMENT_ENABLED` — enables file attachment on idea submissions
  - `FEATURE_ANALYTICS_ENABLED` — enables the analytics dashboard
- **FR-011**: The local secrets file MUST be excluded from version control by the project's ignore configuration.
- **FR-012**: The application MUST be deployed to a production hosting platform reachable via a public URL, with all required environment variables configured in that platform.
- **FR-013**: The deployment pipeline MUST trigger automatically on every push to the main branch.
- **FR-014**: The `User.displayName` field MUST be NOT NULL. At the time a user record is created, `displayName` MUST be automatically set to the local-part of the user's email address (all characters before `@`). It MAY be updated later via profile settings.
- **FR-015**: When `PORTAL_ENABLED=false`, the application MUST intercept all routes (including API routes) in `proxy.ts` (Next.js 16 middleware) and return an HTTP **503** status with a rendered HTML maintenance page. No route — authenticated or unauthenticated — may return a 2xx response while the kill switch is active.
- **FR-016**: The `Idea.category` field MUST be constrained to a predefined list of valid values enforced at the application layer before any database insert or update. The allowed values MUST be defined in a single constants file so they can be updated without a schema migration. Invalid category values MUST be rejected with a validation error.

### Key Entities

- **User**: Represents a registered employee. Has a unique identifier, work email, credential (hashed password), display name (NOT NULL — auto-derived from email local-part at registration, e.g. `aykan.ugur` from `aykan.ugur@epam.com`; editable later in profile), role (`SUBMITTER` / `ADMIN` / `SUPERADMIN` — displayed as "Submitter" / "Admin" / "Super Admin" in UI), email-verification status, and timestamps. Can author many ideas and perform many reviews.
- **Idea**: Represents an employee innovation submission. Has a title, description, category (string column constrained to a predefined list enforced at application level), lifecycle status, visibility setting, optional attachment reference, authoring user, and timestamps. Belongs to one author; may have at most one review.
- **IdeaReview**: Represents an administrator's evaluation of a single idea. Has a decision (`ReviewDecision` enum: `ACCEPTED` or `REJECTED` only — enforced at the database level), a comment, the reviewing user, and a timestamp. Belongs to exactly one idea and one reviewer.
- **VerificationToken**: Represents a single-use, time-limited token tied to a user's email address. Used by EPIC-02 to verify email ownership after registration. Has a token value (unique), the associated email, and an expiry timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A developer who has never seen the project can clone the repository, complete setup, and have a running local instance in under 10 minutes, following only the documented steps.
- **SC-002**: `npm run build`, `npm run lint`, and `npm run type-check` each exit with code 0, reporting 0 errors and 0 warnings in project-authored code (`app/`, `lib/`, `components/`, `constants/`). Third-party build notices from `node_modules` are excluded. No ESLint suppressions (`eslint-disable`), no TypeScript overrides (`@ts-ignore`, `@ts-expect-error`), and no ignored rules are permitted in project-authored files.
- **SC-003**: 100% of required environment variables are documented in the project's environment variable file — no undocumented keys exist anywhere in the codebase.
- **SC-004**: The production deployment URL returns a successful response within 60 seconds of a push to the main branch, with no manual intervention required.
- **SC-005**: The database schema migration completes without errors in a fresh environment and all three tables are visible and queryable.

## Assumptions

- The hosting platform account and the version control repository connection are already established before this feature work begins.
- A managed database instance is provisioned and credentials are available before the schema migration task is attempted.
- The design system component library is compatible with the CSS framework version in use; any version conflict is resolved as part of this feature, not deferred.
- Code formatting rules (no semi-colons, single quotes, 2-space indent) are fixed for this project; no team member vote or preference override is needed.
- The environment variable documentation file covers variables needed by all epics — the complete set of 13 variables is defined in FR-010 and committed on Day 1; no variable is added ad-hoc in later epics.
- Running the schema migration more than once on the same database is safe and produces no errors (idempotent).

## Clarifications

### Session 2026-02-24

- Q: Should the initial schema migration include auth-related fields (password credential on `User`, `VerificationToken` table) or only the 3 business entities? → A: Complete schema on Day 1 — initial migration creates all 4 tables (`User` with credential field, `Idea`, `IdeaReview`, `VerificationToken`) so EPIC-02 requires no additional schema migration.
- Q: Is `User.displayName` required or optional, and where does its initial value come from? → A: NOT NULL — auto-derived from email local-part at registration (e.g. `aykan.ugur` from `aykan.ugur@epam.com`); editable later in profile settings (FR-014).
- Q: Should the `.env.example` name all variables explicitly or stay vague? → A: Full explicit enumeration — 13 variables named in spec (FR-010): `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SUPERADMIN_EMAIL`, and 5 feature flags.
- Q: Is `Idea.category` a free-text field or constrained to a predefined list? → A: Predefined list enforced at application level (string column in DB); categories defined in a constants file; adding a category requires no migration (FR-016).

### Session 2026-02-24 (continued)

- Q: What HTTP status, response format, and implementation layer does the FR-015 "maintenance response" require? → A: HTTP 503 + rendered HTML maintenance page implemented in `proxy.ts` (Next.js 16 middleware); intercepts all routes including API routes; no redirect, no JSON, no 200 permitted (FR-015 updated).
- Q: Which commands constitute "code quality checks" in FR-002 and SC-002? → A: Exactly two — `npm run lint` (ESLint, zero warnings) and `npm run type-check` (`tsc --noEmit`, zero errors). Prettier is enforced by the pre-commit hook only, not a separate CI check (FR-002, SC-002 updated).
- Q: Should `IdeaReview.decision` reuse `IdeaStatus` or have its own enum? → A: Dedicated `ReviewDecision { ACCEPTED REJECTED }` enum — DB enforces only valid review outcomes; `IdeaStatus` is not used on `IdeaReview.decision` (data model updated).
- Q: What is the canonical name for the default user role — "standard employee", "Employee", or `SUBMITTER`? → A: `SUBMITTER` is canonical in all code and enums; displayed as "Submitter" in UI prose. All spec narrative normalised — "standard employee" removed (FR-006 and Key Entities updated).
- Q: Does "zero warnings" in FR-001 and SC-002 apply to the full build stdout or project-authored code only? → A: Project-authored code only (`app/`, `lib/`, `components/`, `constants/`). Third-party/`node_modules` build notices are excluded. No `eslint-disable` or `@ts-ignore` permitted in project files (FR-001 and SC-002 updated).

---

## Out of Scope

- Authentication logic, session management, login/registration pages (EPIC-02)
- Idea submission or review workflows (EPIC-03)
- Admin user management interface (EPIC-02)
- File attachment storage configuration (EPIC-03)
- Analytics or reporting features (EPIC-04)
