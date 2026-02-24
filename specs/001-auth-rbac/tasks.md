# Tasks: Authentication & Role Management

**Input**: Design documents from `specs/001-auth-rbac/`  
**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅ | quickstart.md ✅  
**Stories**: US-004 (Registration P1), US-005 (Email Verification P2), US-006 (Login/Logout P1), US-007 (RBAC + Seed P1)  
**Total tasks**: 29 | **Parallel opportunities**: 14 [P] tasks

> **Schema note**: `VerificationToken` model already exists in `prisma/schema.prisma` from 001-foundation init migration — **no migration needed** for this feature. `lib/env.ts` and `.env.example` already declare all auth env vars — **no env changes needed**.

---

## Format: `[ID] [P?] [Story?] Description with file path`

- **[P]** — Can run in parallel with other [P] tasks in the same phase (different files, no shared state)
- **[US4/5/6/7]** — Maps to US-004 / US-005 / US-006 / US-007 from spec.md
- File paths relative to `innovatepam-portal/`

---

## Phase 1: Setup

**Purpose**: Install missing dependencies and add missing npm scripts. All foundational work (env vars, schema, Prisma client, base utilities) was completed in 001-foundation.

- [ ] T001 Install missing npm packages: `npm install next-auth@beta resend @upstash/ratelimit @upstash/redis`
- [ ] T002 [P] Add `db:seed` script to `package.json`: `"db:seed": "tsx prisma/seed.ts"` (tsx already available via ts-node); add `"test:unit": "vitest run __tests__/unit"` alias
- [ ] T003 [P] Create `types/next-auth.d.ts` — extend `Session` and `JWT` interfaces: add `id: string` and `role: string` to `session.user`; add `id`, `role` to JWT token type

**Checkpoint**: Dependencies installed, TypeScript session types extended, scripts registered

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure that ALL user story phases depend on. Complete before any story work begins.

**⚠️ CRITICAL**: No user story implementation can begin until T004–T009 are complete.

- [x] T004 Create `lib/auth-utils.ts` — export `hashPassword(plain: string): Promise<string>` (bcryptjs, 12 rounds), `comparePassword(plain, hash): Promise<boolean>`, `generateToken(): string` (32-byte hex via `crypto.randomBytes`)
- [x] T005 [P] Create `lib/rate-limit.ts` — export `loginRateLimiter` using `@upstash/ratelimit` sliding window (5 requests / 15 minutes); key = normalized email (lowercase); Upstash Redis when env vars set, in-memory `Map`-based fallback otherwise (matches research.md R-004)
- [x] T006 [P] Create `lib/email.ts` — export `sendVerificationEmail(to: string, token: string): Promise<void>` using Resend SDK; construct link as `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`; no-op when `FEATURE_EMAIL_VERIFICATION_ENABLED !== 'true'`
- [x] T007 Create `auth.ts` at repo root — full Auth.js v5 config: `CredentialsProvider` with `authorize` callback that calls `loginRateLimiter`, `prisma.user.findUnique`, `comparePassword`, and `emailVerified` check; JWT strategy `maxAge: 3600`; `jwt` callback embedding `token.id` + `token.role`; `session` callback exposing `session.user.id` + `session.user.role`; `pages: { signIn: '/login', error: '/login' }`; export `{ handlers, auth, signIn, signOut }`
- [x] T008 [P] Create `app/api/auth/[...nextauth]/route.ts` — re-export `handlers` from `@/auth` as named `GET` and `POST` exports
- [x] T009 Update `proxy.ts` — replace the existing portal-only guard with composed logic: (1) portal maintenance check (existing), (2) call `auth()` to read JWT session, (3) redirect unauthenticated requests to protected prefixes (`/dashboard`, `/admin`, `/api/admin`) → `/login?callbackUrl=<path>` with same-origin validation (reject absolute URLs; fall back to `/dashboard`), (4) redirect authenticated users with insufficient role → `/forbidden` per FR-011, FR-012, FR-020; ADMIN+ may access `/admin`; SUPERADMIN-only for `/admin/users`

**Checkpoint**: Auth.js v5 configured, middleware guards active, utility libs ready — all stories can now proceed in parallel

---

## Phase 3: User Story 4 — Registration (Priority: P1) 🎯 MVP

**Goal**: An EPAM employee can register with a valid `@epam.com` email. Account is created with `role=SUBMITTER`. Email verification email sent (or account immediately active if flag disabled).

**Independent Test**: `POST /api/auth/register` with `{ email: "test@epam.com", password: "Test1234!" }` → 201 response; Prisma confirms User row with `role=SUBMITTER, emailVerified=false`; VerificationToken row created. With `FEATURE_EMAIL_VERIFICATION_ENABLED=false`: `emailVerified=true`, no token row.

- [x] T010 [US4] Create `app/(auth)/layout.tsx` — centered card layout (full-height flex, EPAM brand colors); no nav chrome; wraps all auth pages
- [x] T011 [P] [US4] Create `components/auth/register-form.tsx` — `'use client'` form component; Zod schema: `email` (ends with `@epam.com`, max 255), `password` (min 8, ≥1 upper, ≥1 lower, ≥1 digit, max 72), `displayName` (optional, max 100), `confirmPassword` (matches password); client-side validation before fetch (FR-003); calls `POST /api/auth/register`; on 201 redirects to `/register/check-email`; on 409 shows "An account with this email already exists"; on error shows server message
- [x] T012 [US4] Create `app/api/auth/register/route.ts` — `POST` handler: parse + Zod-validate body; check `@epam.com` domain (400 if not); `prisma.user.findUnique` by email (409 if exists); `hashPassword(password, 12)`; derive `displayName` from `email.split('@')[0]` if blank; `prisma.user.create` with `emailVerified: FEATURE_EMAIL_VERIFICATION_ENABLED !== 'true'`; when flag true: `generateToken()`, `prisma.verificationToken.create({ email, token, expires: now+24h })`, call `sendVerificationEmail(email, token)`; log structured stdout event (`register.success` or `register.fail`); return 201
- [x] T013 [US4] Create `app/(auth)/register/page.tsx` — Server Component: import and render `<RegisterForm />`; redirect to `/dashboard` if already authenticated (`auth()`)
- [x] T014 [P] [US4] Create `app/(auth)/register/check-email/page.tsx` — static Server Component: "Check your inbox" confirmation copy; link back to `/login`

**Checkpoint**: Full registration flow works end-to-end. User can register and reach the check-email page (or dashboard if flag off).

---

## Phase 4: User Story 5 — Email Verification (Priority: P2)

**Goal**: A registered user can activate their account by clicking the link in their verification email. Expired and already-used links show specific error states.

**Independent Test**: Create a User + VerificationToken row directly in DB. Visit `/verify-email?token=<token>`. Confirm `emailVerified=true` in User row and VerificationToken row deleted. Visit same URL again → "Already verified" state.

- [ ] T015 [US5] Create `app/(auth)/verify-email/page.tsx` — `async` Server Component; extract `token` from `searchParams`; `prisma.verificationToken.findUnique({ where: { token } })`; if not found → render "Invalid or already used link" state; if `expires < now` → render "Link expired" state with copy "This verification link is invalid or has expired."; if valid → `prisma.user.update({ where: { email }, data: { emailVerified: true } })`, `prisma.verificationToken.delete({ where: { token } })`, log `verify.success` → render "Email verified! You can now sign in." with link to `/login`
- [ ] T016 [P] [US5] Create `app/api/auth/verify-email/route.ts` — `GET` handler (programmatic): same token-lookup logic as T015; on success returns `{ message: "Email verified" }` + sets flag; on expired returns 400 `{ error: "Verification link has expired. Please register again." }`; on not-found returns 404 `{ error: "Invalid verification link." }`

**Checkpoint**: Full email verification flow works. Registered users can activate their account.

---

## Phase 5: User Story 6 — Login & Logout (Priority: P1)

**Goal**: A verified user can log in and receive a JWT session cookie (1-hour, non-persistent). Failed logins show generic error without field specificity. After 5 failures, account is rate-limited for 15 minutes. Logout destroys the session.

**Independent Test**: Register a user (verification disabled), then `POST /api/auth/callback/credentials` with correct credentials → session cookie set, redirect to `/dashboard`. Submit wrong password 5× → 6th attempt returns rate-limit error.

- [ ] T017 [US6] Create `components/auth/login-form.tsx` — `'use client'` form; Zod schema: `email` (string), `password` (string); calls `signIn('credentials', { email, password, redirect: false })`; handles `error` param from URL: `CredentialsSignin` → "Invalid email or password.", `RateLimited` → "Too many login attempts. Please try again in 15 minutes.", `UnverifiedEmail` → "Please verify your email before signing in."; on success reads `callbackUrl` from params and `router.push`
- [ ] T018 [US6] Create `app/(auth)/login/page.tsx` — Server Component; redirect to `/dashboard` if already authenticated; read `error` and `verified` from `searchParams`; if `verified=1` show success banner "Email verified! You can now sign in."; render `<LoginForm />`
- [ ] T019 [P] [US6] Create `app/forbidden/page.tsx` — Server Component; renders "You don't have permission to access this page." with back-to-dashboard link; HTTP 403 status via `notFound()` alternative or response metadata
- [ ] T020 [P] [US6] Create `app/dashboard/page.tsx` — protected Server Component; call `auth()` → redirect to `/login` if no session (proxy.ts already handles this, but defensive check); render greeting with `session.user.displayName`

**Checkpoint**: Full login → session → dashboard flow works. Logout clears session. Rate limiting blocks after 5 failures.

---

## Phase 6: User Story 7 — RBAC & Superadmin Seed (Priority: P1)

**Goal**: Running `npm run db:seed` promotes `SUPERADMIN_EMAIL` to SUPERADMIN. SUBMITTER is blocked from `/admin` with 403. ADMIN can access idea review dashboard. SUPERADMIN can manage user roles via `/admin/users`. Self-role-change is prevented.

**Independent Test**: Run `npm run db:seed` → confirm `role=SUPERADMIN` in DB for `SUPERADMIN_EMAIL`. Log in as SUBMITTER and navigate to `/admin` → confirm `/forbidden` page shown.

- [ ] T021 [US7] Create `prisma/seed.ts` — read `process.env.SUPERADMIN_EMAIL`; throw if missing; `generateToken().slice(0, 20)` for temp password; `hashPassword(tempPassword, 12)`; `prisma.user.upsert({ where: { email }, update: { role: 'SUPERADMIN' }, create: { email, passwordHash, displayName: email.split('@')[0], role: 'SUPERADMIN', emailVerified: true } })`; log seeded email + temp password to stdout; `prisma.$disconnect()`
- [ ] T022 [P] [US7] Create `app/admin/page.tsx` — Server Component; call `auth()` + `prisma.user.findUnique` to re-read role from DB (per research.md R-007 for staleness prevention); redirect to `/forbidden` if `role` is not `ADMIN` or `SUPERADMIN`; render admin dashboard stub with user role header (ideas review content is out of scope for this epic)
- [ ] T023 [P] [US7] Create `app/admin/users/page.tsx` — Server Component; auth + DB role check (SUPERADMIN only); if `FEATURE_USER_MANAGEMENT_ENABLED !== 'true'` call `notFound()`; fetch all users via `prisma.user.findMany`; render user table with `id, email, displayName, role, emailVerified, createdAt`; render `<RoleSelector>` for each non-self user
- [ ] T024 [P] [US7] Create `components/auth/role-selector.tsx` — `'use client'` dropdown; options: `SUBMITTER`, `ADMIN` only (never expose `SUPERADMIN` as selectable option per FR-017); on change calls `updateUserRole` Server Action; shows loading state during mutation; shows error if rejected
- [ ] T025 [US7] Create `lib/actions/update-user-role.ts` — `'use server'` Server Action `updateUserRole(targetId: string, newRole: 'SUBMITTER' | 'ADMIN')`; call `auth()` + `prisma.user.findUnique` to re-read caller role (must be `SUPERADMIN`); reject if `targetId === caller.id` with "You cannot change your own role."; reject if `newRole === 'SUPERADMIN'` with "Only SUPERADMIN can assign the SUPERADMIN role."; `prisma.user.update({ where: { id: targetId }, data: { role: newRole } })`; log `role.changed` event to stdout; return updated user
- [ ] T026 [P] [US7] Create `app/api/admin/users/route.ts` — `GET`: auth check (ADMIN+), DB role re-read, `FEATURE_USER_MANAGEMENT_ENABLED` guard (503 if off), `prisma.user.findMany` with pagination (`page`, `limit`), return `{ users, total, page, limit }`; `PATCH`: parse `{ role }`, auth check (SUPERADMIN), self-change guard, `SUPERADMIN` assignment guard, `prisma.user.update`, log event

**Checkpoint**: RBAC fully enforced. Superadmin seeded. User management UI functional behind flag.

---

## Final Phase: Polish & Cross-Cutting Concerns

- [ ] T027 [P] Add `"db:seed": "tsx prisma/seed.ts"` to `package.json` scripts and `"test:unit": "vitest run __tests__/unit"` (verify T002 was applied correctly; update if tsx not available — use `ts-node --esm` or `npx tsx`)
- [ ] T028 [P] Add Auth.js v5 error code mapping in `auth.ts` to surface `UnverifiedEmail` custom error code: throw `CredentialsSignin` with custom `code` field when `emailVerified === false` so `login-form.tsx` can show the specific message
- [ ] T029 Perform full quality gate pass: `npm run type-check` (0 errors) → `npm run lint` (0 warnings) → `npm run test` (≥80% coverage) → `npm run build` (clean build); fix any issues found

**Checkpoint**: All quality gates pass. PR ready.

---

## Dependencies Graph

```
Phase 1 (T001-T003)
    └── Phase 2 (T004-T009)
            ├── Phase 3: US-004 (T010-T014)  ─╮
            ├── Phase 5: US-006 (T017-T020)  ─┤  Can start after Phase 2
            ├── Phase 6: US-007 (T021-T026)  ─╯
            └── Phase 4: US-005 (T015-T016)     Requires T012 (register route) for tokens to exist

US-004 must complete T012 before US-005 T015 is testable end-to-end
US-006 (login) requires US-004 (registration) to create test accounts
US-007 seed (T021) is fully independent of US-004/005/006
```

## Parallel Execution Examples

### After Phase 2 completes — 3 tracks in parallel:

**Track A — US-004 Registration**:

```
T010 → T011‖T012 → T013 → T014
```

**Track B — US-005 Verification** (can begin after T012 exists):

```
T015‖T016
```

**Track C — US-007 RBAC** (independent):

```
T021 → T022‖T023‖T024 → T025 → T026‖T027
```

**Track D — US-006 Login** (after T012 for test accounts):

```
T017 → T018 → T019‖T020
```

### Phase 1 parallelism:

```
T001 → T002‖T003   (T001 must finish first; T002 and T003 can run together after)
```

### Phase 2 parallelism:

```
T004 → T005‖T006 → T007 → T008‖T009
```

---

## Implementation Strategy

**MVP scope (minimum shippable)**: Phase 1 + Phase 2 + Phase 3 (US-004) + Phase 5 (US-006)

- Users can register and log in. `FEATURE_EMAIL_VERIFICATION_ENABLED=false` keeps it simple.
- All protected pages redirect to `/login`.
- Delivers: working end-to-end auth loop (register → login → dashboard → logout)

**Increment 2**: Phase 6 (US-007)

- RBAC enforcement, superadmin seeded, admin dashboard and user management UI

**Increment 3**: Phase 4 (US-005)

- Email verification enabled, `/verify-email` page and token lifecycle

**Full delivery**: Final Phase quality gate sweep + PR

---

## Task Count Summary

| Phase                 | User Story  | Tasks  | [P] Parallelizable |
| --------------------- | ----------- | ------ | ------------------ |
| 1: Setup              | —           | 3      | 2                  |
| 2: Foundational       | —           | 6      | 4                  |
| 3: Registration       | US-004 (P1) | 5      | 2                  |
| 4: Email Verification | US-005 (P2) | 2      | 1                  |
| 5: Login/Logout       | US-006 (P1) | 4      | 2                  |
| 6: RBAC + Seed        | US-007 (P1) | 6      | 4                  |
| Final: Polish         | —           | 3      | 2                  |
| **Total**             |             | **29** | **17**             |
