# Feature Specification: Authentication & Role Management

**Feature Branch**: `001-auth-rbac`  
**Created**: 2026-02-24  
**Status**: Draft  
**Input**: User description: "lets start innovatepam-portal/specs/stories/epic-02"  
**Epic**: EPIC-02  
**Stories**: US-004, US-005, US-006, US-007

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — User Registration (Priority: P1)

An EPAM employee visits `/register`, fills in their email, display name, password, and confirm-password fields, and submits the form. The system validates the input, creates their account, and either sends a verification email (if email verification is enabled) or logs them in immediately (if the flag is disabled).

**Why this priority**: Registration is the entry point to the entire platform. Every other user-facing feature requires an authenticated account. Nothing can be manually tested end-to-end without this story.

**Independent Test**: Visit `/register`, submit a valid form, and confirm a User record is created in the database with `role=SUBMITTER`. Delivers a working account creation flow.

**Acceptance Scenarios**:

1. **Given** I visit `/register` and submit a valid email and password meeting complexity rules, **When** the form is submitted, **Then** a User account is created with `role=SUBMITTER` and I am redirected to `/register/check-email` (if verification enabled) or `/dashboard` (if disabled).
2. **Given** I attempt to register with an email already in use, **When** I submit the form, **Then** I see: "An account with this email already exists."
3. **Given** I submit a password shorter than 8 characters or missing required character types, **When** the form is validated, **Then** I see inline field errors before the request is sent to the server.
4. **Given** `FEATURE_EMAIL_VERIFICATION_ENABLED=false`, **When** I register with valid credentials, **Then** my account is immediately active and I am redirected to `/dashboard`.

---

### User Story 2 — Email Verification (Priority: P2)

After registering with email verification enabled, the employee receives an email with a unique link. Clicking the link within 24 hours activates their account. Clicking an expired or already-used link shows a clear error.

**Why this priority**: Required for production security — ensures only real employees with valid company email addresses access the portal. Gated behind `FEATURE_EMAIL_VERIFICATION_ENABLED` so alpha testing proceeds without it.

**Independent Test**: Register with verification enabled, retrieve the token from the database, visit `/verify-email?token=<token>`, and confirm `emailVerified=true` in the database. Delivers a working account activation flow.

**Acceptance Scenarios**:

1. **Given** `FEATURE_EMAIL_VERIFICATION_ENABLED=true` and I have just registered, **When** registration completes, **Then** a verification email is sent to my address with a link valid for 24 hours.
2. **Given** I click a valid verification link, **When** the page loads, **Then** my account is activated and I see: "Email verified! You can now sign in."
3. **Given** I click an expired or tampered verification link, **When** the page loads, **Then** I see: "This verification link is invalid or has expired."
4. **Given** I click a verification link that has already been used, **When** the page loads, **Then** I see: "Already verified" and am redirected to `/login`.

---

### User Story 3 — Login & Logout (Priority: P1)

A verified employee visits `/login`, enters their email and password, and receives a secure session. When finished, they click "Sign Out" and their session is destroyed. Unverified users are blocked when the verification flag is active.

**Why this priority**: Without login, no authenticated page can be accessed or tested. Alongside registration, this story forms the core auth loop — both must work for any downstream feature.

**Independent Test**: Register a user (with verification flag disabled), then log in at `/login` and confirm redirection to `/dashboard`. Delivers a working authenticated session.

**Acceptance Scenarios**:

1. **Given** I have a verified account and submit valid credentials at `/login`, **When** the form is submitted, **Then** a secure session is created and I am redirected to `/dashboard`.
2. **Given** I submit an incorrect password, **When** the form is submitted, **Then** I see: "Invalid email or password." with no indication of which field is wrong.
3. **Given** `FEATURE_EMAIL_VERIFICATION_ENABLED=true` and my email is not verified, **When** I attempt to log in, **Then** I see: "Please verify your email before signing in."
4. **Given** I am logged in and click "Sign Out", **When** the action completes, **Then** my session is destroyed, the session cookie is cleared, and I am redirected to `/login`.
5. **Given** I am not logged in and navigate to `/dashboard`, **When** the page is requested, **Then** I am redirected to `/login?callbackUrl=/dashboard` and, after logging in, I am returned to `/dashboard`.

---

### User Story 4 — Route Protection, RBAC & Superadmin Seed (Priority: P1)

All protected routes reject unauthenticated users. Admin-only routes additionally reject users without sufficient role. The superadmin account is automatically promoted when the seed script runs. Superadmins can manage user roles from `/admin/users`.

**Why this priority**: Without this story, any authenticated user can navigate to `/admin` by typing the URL. Route protection is the security enforcement layer that makes all role-based features trustworthy.

**Independent Test**: Log in as a SUBMITTER and attempt to navigate to `/admin`. Confirm a 403 page is shown. Run the seed script and confirm the superadmin email account has `role=SUPERADMIN` in the database.

**Acceptance Scenarios**:

1. **Given** `SUPERADMIN_EMAIL` is set and a User with that email exists, **When** the seed script runs, **Then** that User's role is updated to `SUPERADMIN`.
2. **Given** I am logged in as `SUBMITTER` and navigate to `/admin`, **When** the middleware evaluates the request, **Then** I see a 403 page: "You don't have permission to access this page."
3. **Given** I am logged in as `ADMIN` or `SUPERADMIN` and navigate to `/admin`, **When** the page loads, **Then** the admin dashboard renders correctly.
4. **Given** I am `SUPERADMIN` and visit `/admin/users`, **When** the page loads, **Then** I see a table of all users with their name, email, role, and a role selector.
5. **Given** I am `SUPERADMIN` and attempt to change my own role, **When** I submit the change, **Then** the system rejects it with: "You cannot change your own role."
6. **Given** `FEATURE_USER_MANAGEMENT_ENABLED=false`, **When** `/admin/users` is visited, **Then** the page returns 404 or redirects to `/admin`.

---

### Edge Cases

- What happens when `SUPERADMIN_EMAIL` is set but no matching User exists in the database? → Seed script logs a warning and exits cleanly without crashing.
- What happens when a user's role is updated while they have an active session? → The new role takes effect on the next server request; no re-login required.
- What happens when an ADMIN attempts to promote a user to SUPERADMIN? → The action is rejected: "Only SUPERADMIN can assign the SUPERADMIN role."
- What happens when a brute-force login is attempted? → After 5 failed attempts per 15-minute window per IP, the account is temporarily rate-limited.
- What happens when the Resend email API fails during registration? → Registration succeeds; a user-visible banner warns the verification email could not be sent.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Users MUST be able to create an account with a valid email address and a password meeting minimum complexity rules (≥8 characters, at least 1 uppercase, 1 lowercase, 1 number).
- **FR-002**: System MUST reject registration attempts with an already-registered email and display a clear, named error message.
- **FR-003**: System MUST validate password strength on the client side before sending the form to the server.
- **FR-004**: When `FEATURE_EMAIL_VERIFICATION_ENABLED=true`, system MUST send a verification email with a unique, time-limited token (24-hour expiry) immediately after registration.
- **FR-005**: Users MUST be able to activate their account by clicking the verification link; an expired or invalid link MUST show a descriptive error page.
- **FR-006**: When `FEATURE_EMAIL_VERIFICATION_ENABLED=false`, system MUST mark the account as verified immediately upon registration.
- **FR-007**: Users MUST be able to log in with their verified email and password and receive a secure, signed session.
- **FR-008**: Login MUST reject unverified accounts (when the verification flag is enabled) with a message distinct from the invalid-credentials error.
- **FR-009**: Login failure messages MUST NOT reveal which field (email or password) is incorrect.
- **FR-010**: Users MUST be able to log out and have their session fully destroyed; subsequent authenticated requests MUST be rejected.
- **FR-011**: System MUST redirect all unauthenticated requests to protected routes to `/login` with the originally requested URL preserved as `callbackUrl`.
- **FR-012**: System MUST return a 403 response to any authenticated user with insufficient role attempting to access an admin-only route.
- **FR-013**: After successful login, users MUST be redirected to the URL stored in `callbackUrl` (or `/dashboard` if none).
- **FR-014**: System MUST automatically promote the account matching `SUPERADMIN_EMAIL` to the `SUPERADMIN` role when the seed script is run.
- **FR-015**: Superadmins MUST be able to view all users and change their roles via `/admin/users` (when `FEATURE_USER_MANAGEMENT_ENABLED=true`).
- **FR-016**: System MUST prevent any user from changing their own role.
- **FR-017**: Only `SUPERADMIN` role holders MUST be able to assign or remove the `SUPERADMIN` role.

### Key Entities

- **User**: Represents a registered employee. Key attributes: email (unique), display name, hashed password, role (SUBMITTER / ADMIN / SUPERADMIN), email verification status, verification token, token expiry.
- **Session**: Represents an authenticated browser session. Contains the user's identity and role; stateless and signed. Expires on logout or timeout.
- **Verification Token**: A single-use token tied to a User, valid for 24 hours, used to confirm email ownership during registration.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A new employee can complete the full journey — register, verify email (or skip with flag), and log in — in under 3 minutes.
- **SC-002**: 100% of protected routes return the correct access response: redirect for unauthenticated users, 403 for insufficient role.
- **SC-003**: Login and registration actions complete within 2 seconds at the 95th percentile under normal usage conditions.
- **SC-004**: The superadmin account is correctly bootstrapped on every clean database deployment without manual intervention.
- **SC-005**: Role changes made by a superadmin take effect on the affected user's next request without requiring them to re-login.

---

## Assumptions

- Email verification link format: `/verify-email?token=<hex-token>`
- Verification tokens are stored as plain hex strings in the database (not JWTs); the secrecy of the token value provides security.
- `FEATURE_EMAIL_VERIFICATION_ENABLED=false` is the default for local development and alpha; `true` is the default for production.
- Rate-limiting uses Upstash Redis when `UPSTASH_REDIS_REST_URL` is configured; falls back to a simple in-memory counter otherwise.
- Password reset and OAuth/SSO are explicitly out of scope for this epic.
- The seed script is safe to run multiple times (idempotent).

- **SC-004**: [Business metric, e.g., "Reduce support tickets related to [X] by 50%"]
