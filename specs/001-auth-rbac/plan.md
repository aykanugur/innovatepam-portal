# Implementation Plan: Authentication & Role Management

**Branch**: `001-auth-rbac` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-auth-rbac/spec.md`  
**Stories**: US-004 (Registration), US-005 (Email Verification), US-006 (Login/Logout), US-007 (RBAC + Seed)

---

## Summary

Implement full authentication for the InnovatEPAM Portal: email+password registration restricted to `@epam.com` addresses, optional display name (auto-derived from email), email verification via Resend (feature-flagged), JWT-based 1-hour sessions via Auth.js v5 CredentialsProvider, rate-limited login (5 attempts / 15 min), role-based route protection via `proxy.ts`, and superadmin seeding via `prisma db seed`. Admin UI for user role management behind `FEATURE_USER_MANAGEMENT_ENABLED` flag.

---

## Technical Context

**Language/Version**: TypeScript 5.4+ / Node.js 24.13.1  
**Primary Dependencies**: Next.js 16.1.6, `next-auth@beta` (Auth.js v5), `bcryptjs`, `@resend/node`, `@upstash/ratelimit`, `@upstash/redis`, Prisma 7.4.1, shadcn/ui canary, Zod, Tailwind CSS v4  
**Storage**: Neon PostgreSQL via `@prisma/adapter-pg` (existing from 001-foundation); two new nullable fields added to `User` model via migration  
**Testing**: Vitest 2.1.9 (unit + integration), v8 coverage ≥80%, Playwright (E2E for critical auth paths)  
**Target Platform**: Next.js App Router — all auth logic in Server Components, Server Actions, and Route Handlers; no client-side auth state management  
**Project Type**: Web application (App Router monolith — no separate backend)  
**Performance Goals**: <500ms P95 for login/register API (spec SC-003); session read <10ms (JWT, no DB round-trip)  
**Constraints**: 1-hour session (non-persistent cookie), `@epam.com` domain lock, 5 attempts / 15-min rate limit, ESLint 0 warnings, ≥80% coverage, zero TS errors  
**Scale/Scope**: Alpha ≤100 users; GA ~500 EPAM employees; single-region Neon PostgreSQL

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                                       | Status  | Notes                                                                |
| ----------------------------------------------- | ------- | -------------------------------------------------------------------- |
| I. Prime Directive — all work traced to spec    | ✅ PASS | Every file maps to US-004/005/006/007 ACs                            |
| II. No-Vibe-Coding — copy from spec verbatim    | ✅ PASS | All error messages, copy from spec/FRs                               |
| III. TDD — RED before GREEN                     | ✅ PASS | Test files must be created and failing before any implementation     |
| IV. Scope Protection — no Phase 2 features      | ✅ PASS | OAuth, SSO, password reset, account deletion explicitly out of scope |
| V. Traceability — commits cite story + AC       | ✅ PASS | Commit format: `feat(auth): … — US-XXX AC-1 to AC-N`                 |
| Quality Gates — build + lint + tests + coverage | ✅ PASS | All existing gates maintained; new `npm run test:unit` script added  |

**All gates PASS. Proceeding to Phase 0.**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-rbac/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   ├── api.md           ← API route contracts (Phase 1)
│   └── env.contract.md  ← New env vars (Phase 1)
└── tasks.md             ← Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code Layout

```text
innovatepam-portal/
│
├── auth.ts                          # Auth.js v5 config — CredentialsProvider, JWT callbacks, session shape
├── proxy.ts                         # UPDATED — compose portal check + auth() guard
│
├── app/
│   ├── (auth)/                      # Auth route group (no shared layout chrome)
│   │   ├── layout.tsx               # Centered card layout, EPAM brand
│   │   ├── register/
│   │   │   ├── page.tsx             # US-004 registration form
│   │   │   └── check-email/
│   │   │       └── page.tsx         # "Check your inbox" confirmation
│   │   ├── login/
│   │   │   └── page.tsx             # US-006 login form
│   │   └── verify-email/
│   │       └── page.tsx             # US-005 verification handler + success/error states
│   │
│   ├── dashboard/
│   │   └── page.tsx                 # Protected landing page (authenticated users)
│   │
│   ├── admin/
│   │   ├── page.tsx                 # US-007 admin dashboard (ADMIN + SUPERADMIN)
│   │   └── users/
│   │       └── page.tsx             # US-007 user management (SUPERADMIN, flag-gated)
│   │
│   ├── forbidden/
│   │   └── page.tsx                 # 403 page — "You don't have permission…"
│   │
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/
│       │   │   └── route.ts         # Auth.js v5 handlers (GET + POST)
│       │   ├── register/
│       │   │   └── route.ts         # US-004 POST /api/auth/register
│       │   └── verify-email/
│       │       └── route.ts         # US-005 GET /api/auth/verify-email?token=
│       └── admin/
│           └── users/
│               └── route.ts         # US-007 PATCH /api/admin/users/:id/role (flag-gated)
│
├── lib/
│   ├── auth-utils.ts                # hashPassword, comparePassword, generateToken
│   ├── email.ts                     # sendVerificationEmail() via Resend
│   ├── rate-limit.ts                # loginRateLimiter() via Upstash (or in-memory fallback)
│   └── actions/
│       └── update-user-role.ts      # US-007 Server Action — updateUserRole(userId, newRole)
│
├── components/
│   └── auth/
│       ├── register-form.tsx        # Client component — form + validation
│       ├── login-form.tsx           # Client component — form + error display
│       └── role-selector.tsx        # Client component — US-007 role dropdown
│
├── prisma/
│   └── seed.ts                      # US-007 superadmin seed script
│
└── __tests__/
    └── unit/
        ├── us-004-registration.test.ts
        ├── us-005-email-verification.test.ts
        ├── us-006-login-logout.test.ts
        └── us-007-rbac-seed.test.ts
```

**Structure Decision**: App Router monolith — no /src prefix (matches 001-foundation). Route groups `(auth)` for login/register/verify isolate auth pages from the main chrome. All business logic in Route Handlers and Server Actions (not client-side). `proxy.ts` at root (Next.js 16 naming, confirmed in 001-foundation).

---

## Complexity Tracking

No Constitution violations. All choices are justified by spec requirements:

| Choice                                    | Justification                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `proxy.ts` composes portal + auth logic   | Next.js 16 requires single middleware file; both concerns must coexist                                  |
| Route group `(auth)` with separate layout | Auth pages need centered card layout without navigation chrome                                          |
| In-memory rate-limit fallback             | `UPSTASH_REDIS_REST_URL` optional in alpha; fallback prevents startup failure when Redis not configured |
