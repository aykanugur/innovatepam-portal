# Coding Standards — InnovatEPAM Portal

**Last Updated**: 2026-02-24  
**Version**: 1.0  
**Owner**: Aykan Uğur  

> These standards are ground truth for all AI-generated and human-written code on this project.
> Load this file before writing any component, Server Action, Route Handler, or test.

---

## 1. Naming Conventions

### Files & Directories

| Type | Convention | Examples |
|------|-----------|---------|
| Next.js page | `page.tsx` (App Router convention) | `app/ideas/page.tsx`, `app/admin/page.tsx` |
| Next.js layout | `layout.tsx` | `app/layout.tsx`, `app/(auth)/layout.tsx` |
| Next.js loading | `loading.tsx` | `app/ideas/loading.tsx` |
| Route Handler | `route.ts` | `app/api/auth/register/route.ts` |
| React component | `PascalCase.tsx` | `IdeaCard.tsx`, `StatusBadge.tsx` |
| Server Action file | `kebab-case.ts` under `actions/` | `actions/create-idea.ts`, `actions/finalize-review.ts` |
| Utility / helper | `kebab-case.ts` | `lib/auth.ts`, `lib/validations.ts`, `utils/format-date.ts` |
| Prisma schema | `schema.prisma` | (fixed by Prisma convention) |
| Type / interface file | `kebab-case.types.ts` | `idea.types.ts`, `auth.types.ts` |
| Test file | `*.test.ts` / `*.spec.ts` | `create-idea.test.ts`, `register.spec.ts` |
| E2E test file | `*.spec.ts` in `e2e/` | `01-register-verify-login.spec.ts` |
| Constant file | `kebab-case.ts` under `constants/` | `constants/idea-categories.ts` |

### Code Symbols

| Symbol | Convention | Examples |
|--------|-----------|---------|
| React component | `PascalCase` | `IdeaCard`, `AdminDashboard`, `StatusBadge` |
| Hook (custom) | `useCamelCase` | `useIdeas`, `useCurrentUser` |
| TypeScript interface | `PascalCase` (no `I` prefix) | `IdeaWithAuthor`, `SessionUser` |
| TypeScript type alias | `PascalCase` | `IdeaStatus`, `UserRole` |
| Zod schema | `camelCaseSchema` | `createIdeaSchema`, `loginSchema` |
| Function / variable | `camelCase` | `findIdeaById`, `currentUser`, `isLoading` |
| Boolean variable | `is/has/can` prefix | `isLoading`, `hasError`, `canReview` |
| Server Action | `camelCase` verb-noun | `createIdea`, `finalizeReview`, `updateUserRole` |
| Constant (module-level) | `UPPER_SNAKE_CASE` | `MAX_FILE_SIZE_BYTES`, `ALLOWED_FILE_TYPES` |
| Enum value | `UPPER_SNAKE_CASE` (matches Prisma) | `IdeaStatus.UNDER_REVIEW`, `Role.SUPERADMIN` |
| Environment variable | `UPPER_SNAKE_CASE` | `NEXTAUTH_SECRET`, `FEATURE_FILE_ATTACHMENT_ENABLED` |

### Database (Prisma)

| Object | Convention | Examples |
|--------|-----------|---------|
| Model name | `PascalCase` singular | `User`, `Idea`, `IdeaReview` |
| Field name | `camelCase` | `passwordHash`, `authorId`, `createdAt` |
| Enum name | `PascalCase` | `Role`, `IdeaStatus`, `IdeaVisibility` |
| Enum value | `UPPER_SNAKE_CASE` | `SUBMITTED`, `UNDER_REVIEW`, `SUPERADMIN` |
| Relation field | singular camelCase (has-one) / plural (has-many) | `author`, `ideas`, `review` |

---

## 2. File Structure

```
innovatepam/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Route group — unauthenticated layout
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── verify-email/page.tsx
│   ├── (portal)/                 # Route group — authenticated layout
│   │   ├── ideas/
│   │   │   ├── page.tsx          # /ideas — idea list
│   │   │   ├── new/page.tsx      # /ideas/new — submit form
│   │   │   ├── mine/page.tsx     # /ideas/mine — my ideas
│   │   │   └── [id]/page.tsx     # /ideas/:id — detail
│   │   ├── admin/
│   │   │   ├── page.tsx          # /admin — dashboard
│   │   │   ├── review/[id]/page.tsx
│   │   │   ├── users/page.tsx
│   │   │   └── analytics/page.tsx
│   │   └── settings/page.tsx
│   ├── api/
│   │   └── auth/
│   │       ├── register/route.ts
│   │       └── verify-email/route.ts
│   ├── layout.tsx                # Root layout
│   ├── not-found.tsx             # 404 page
│   └── error.tsx                 # Error boundary
│
├── actions/                      # Server Actions (mutations)
│   ├── create-idea.ts
│   ├── delete-idea.ts
│   ├── finalize-review.ts
│   ├── start-review.ts
│   ├── update-user-role.ts
│   └── update-profile.ts
│
├── components/                   # Reusable React components
│   ├── ui/                       # shadcn/ui primitives (auto-generated; do not edit)
│   ├── ideas/
│   │   ├── IdeaCard.tsx
│   │   ├── IdeaForm.tsx
│   │   └── StatusBadge.tsx
│   ├── admin/
│   │   ├── ReviewPanel.tsx
│   │   └── StatCard.tsx
│   └── shared/
│       ├── Navbar.tsx
│       └── EmptyState.tsx
│
├── lib/                          # Non-React utilities and singletons
│   ├── auth.ts                   # NextAuth config + auth() helper
│   ├── db.ts                     # Prisma client singleton
│   ├── validations.ts            # Shared Zod schemas
│   ├── email.ts                  # Resend email helpers
│   └── blob.ts                   # Vercel Blob helpers
│
├── constants/
│   ├── idea-categories.ts
│   └── feature-flags.ts
│
├── types/
│   └── index.ts                  # Shared TypeScript types
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── __tests__/                    # Vitest unit + integration tests
│   ├── actions/
│   ├── api/
│   └── lib/
│
├── e2e/                          # Playwright E2E tests
│   ├── 01-register-verify-login.spec.ts
│   ├── 02-submit-idea.spec.ts
│   ├── 03-admin-review.spec.ts
│   └── 04-rbac-403.spec.ts
│
├── middleware.ts                 # NextAuth route protection
├── .env.example
├── .env.local                    # Never committed
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vitest.config.ts
```

**Key rules:**
- `app/` — only Next.js page/layout/route files. No shared logic.
- `actions/` — all Server Actions; one file per domain action; not nested in `app/`
- `components/ui/` — shadcn/ui generated files; do not manually edit
- `lib/` — framework-agnostic; functions here should be importable in both pages and actions
- `__tests__/` mirrors the `src/` structure it tests

---

## 3. Code Organization

### TypeScript

- **`"strict": true`** — always. No suppressions (`// @ts-ignore`, `// @ts-expect-error`) without a comment explaining why.
- **No implicit `any`** — every function parameter and return type is explicit or inferred.
- **Prefer `type` over `interface`** for most cases; use `interface` only for objects that will be extended.
- **Prefer `const` over `let`**; never use `var`.
- **Prefer named exports** over default exports for all utilities, actions, and components (easier to refactor; better IDE support). Exception: Next.js page files require default exports.

### Functions & Components

- **Maximum function length**: 40 lines. If a function exceeds this, extract helpers.
- **Maximum component length**: 100 lines. Extract sub-components or hooks when exceeded.
- **One React component per file.** (shadcn/ui compound components are the exception.)
- **Props interfaces** defined at the top of the component file, just above the component.
- **Server Components are the default** — add `"use client"` only when you need browser APIs, event handlers, or `useState`/`useEffect`.
- **Server Actions** must be in separate files (not inline in page files) to keep page files readable.

```typescript
// ✅ Good — explicit types, short function, named export
export async function getPublicIdeas(page: number = 1): Promise<IdeaWithAuthor[]> {
  const skip = (page - 1) * PAGE_SIZE
  return prisma.idea.findMany({
    where: { visibility: 'PUBLIC' },
    orderBy: { createdAt: 'desc' },
    skip,
    take: PAGE_SIZE,
    include: { author: { select: { displayName: true } } },
  })
}

// ❌ Bad — implicit any, magic numbers, no return type
export async function getIdeas(page) {
  return prisma.idea.findMany({ skip: (page - 1) * 20, take: 20 })
}
```

### DRY Principle

Extract shared logic to `lib/` when:
- The same Prisma query pattern appears in 2+ places
- The same Zod schema validates 2+ endpoints
- The same guard/check (e.g., "is this the idea's author?") appears in 2+ actions

Do **not** abstract prematurely — wait for the second duplication before extracting.

### Constants

All magic values must be named constants in `constants/`:

```typescript
// constants/idea-categories.ts
export const IDEA_CATEGORIES = [
  'Process Improvement',
  'New Product/Service',
  'Cost Reduction',
  'Employee Experience',
  'Technical Innovation',
] as const

export type IdeaCategory = typeof IDEA_CATEGORIES[number]

// constants/feature-flags.ts
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024   // 5 MB
export const ALLOWED_FILE_TYPES = ['application/pdf', 'image/png', 'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown'] as const
export const ITEMS_PER_PAGE = 20
export const BCRYPT_COST_FACTOR = 12
export const VERIFICATION_TOKEN_TTL_HOURS = 24
```

---

## 4. Comments

### When to Write Comments

| Situation | Rule |
|-----------|------|
| **Why** a non-obvious decision was made | Always comment |
| **What** the code does | Avoid — code should be self-documenting; refactor first |
| Complex regex or bitwise operation | Comment with a plain-English explanation |
| Feature flag usage | Comment which flag controls this block |
| Security-critical guard | Comment the threat it prevents |
| TODO | Allowed; use standard format (see below) |

### JSDoc

Required for all exported functions in `lib/` and `actions/`:

```typescript
/**
 * Finalizes an admin review for an idea.
 * Guards against self-review and double-review.
 *
 * @param ideaId - The idea to review
 * @param decision - Accept or reject
 * @param comment - Required for REJECTED; recommended for ACCEPTED (min 10 chars on reject)
 * @throws {ForbiddenError} If the reviewer is the idea's author
 * @throws {ConflictError} If the idea has already been reviewed
 */
export async function finalizeReview(
  ideaId: string,
  decision: 'ACCEPTED' | 'REJECTED',
  comment: string
): Promise<void> { ... }
```

Not required for React component props — a well-named prop interface is sufficient.

### TODO Format

```typescript
// TODO(aykan): Replace with Upstash rate limiter before GA — in-memory doesn't work on serverless
// TODO(aykan): Add analytics event tracking once FEATURE_ANALYTICS_ENABLED is true
// FIXME(aykan): Prisma connection drops under load — add retry logic
```

Format: `// TODO(username): Description — optional context or ticket reference`

---

## 5. Testing Requirements

### Test Types & Targets

| Type | Tool | Coverage Target | What to Test |
|------|------|----------------|-------------|
| Unit | Vitest | ≥80% line coverage on `lib/` and `actions/` | Pure functions, Zod schemas, Server Action guards, auth helpers |
| Integration | Vitest + Prisma test client | Key data paths | Route Handlers, Server Actions against a test DB |
| E2E | Playwright | 4 critical paths (100% pass) | Full user journeys from browser |

### Vitest Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['lib/**', 'actions/**', 'app/api/**'],
      exclude: ['**/*.test.ts', 'components/ui/**', 'prisma/**'],
      thresholds: { lines: 80, functions: 80, branches: 75 },
    },
  },
})
```

### File Naming & Organization

```
__tests__/
  actions/
    create-idea.test.ts       # mirrors actions/create-idea.ts
    finalize-review.test.ts
  lib/
    validations.test.ts
    auth.test.ts
  api/
    register.test.ts

e2e/
  01-register-verify-login.spec.ts
  02-submit-idea.spec.ts
  03-admin-review.spec.ts
  04-rbac-403.spec.ts
```

### Test Writing Rules

- **Arrange-Act-Assert** structure in every test
- **Descriptive test names**: `it('returns 403 when reviewer is the idea author')`
- **No shared mutable state** between tests — each test sets up its own fixtures
- **Mock external services** (Resend, Vercel Blob) in unit tests; use real connections in integration
- **Never `it.only` or `describe.only`** in committed code
- Each story's Definition of Done includes: unit test + at minimum one integration test

### 4 Required E2E Paths

```
Path 1: Register → verify email → login → dashboard
Path 2: Login → submit idea → land on detail page
Path 3: Admin login → start review → accept idea → verify state on detail page
Path 4: SUBMITTER navigates to /admin → sees 403 page
```

---

## 6. Error Handling

### Standard Error Response Shape

All Route Handlers return a consistent JSON error shape:

```typescript
// types/index.ts
export type ApiError = {
  error: string       // Human-readable message (safe to display)
  code?: string       // Machine-readable code, e.g. 'DUPLICATE_EMAIL'
  field?: string      // Which field caused the error (for form validation)
}

// Usage in Route Handler:
return Response.json(
  { error: 'An account with this email already exists.', code: 'DUPLICATE_EMAIL', field: 'email' },
  { status: 409 }
)
```

### HTTP Status Codes

| Situation | Status |
|-----------|--------|
| Validation error | 400 |
| Unauthenticated | 401 |
| Unauthorized (RBAC) | 403 |
| Not found | 404 |
| Duplicate resource | 409 |
| Server error | 500 |

### Server Actions Error Handling

Server Actions return a typed result object — never throw to the client:

```typescript
export type ActionResult<T = void> =
  | { success: true; data?: T }
  | { success: false; error: string; field?: string }

// Usage:
export async function createIdea(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const parsed = createIdeaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message, field: parsed.error.errors[0].path[0] as string }
  }
  try {
    const idea = await prisma.idea.create({ data: { ...parsed.data, authorId: session.user.id } })
    return { success: true, data: { id: idea.id } }
  } catch (e) {
    console.error('[createIdea] DB error:', e)
    return { success: false, error: 'Something went wrong. Please try again.' }
  }
}
```

### Custom Error Classes

```typescript
// lib/errors.ts
export class ForbiddenError extends Error {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class NotFoundError extends Error {
  constructor(resource = 'Resource') {
    super(`${resource} not found.`)
    this.name = 'NotFoundError'
  }
}
```

### Logging Rules

| What to log | Level | Where |
|------------|-------|-------|
| Unhandled server errors | `console.error('[context] message:', error)` | Route Handlers, Server Actions |
| Successful auth events | `console.info('[auth] user registered:', email)` | Auth routes |
| External service failures (Resend, Blob) | `console.error('[resend] failed to send:', error)` | Email/Blob helpers |
| **Never log** | — | Passwords, tokens, full user PII |

Format: `console.error('[module] description:', errorObject)` — always prefix with the module name for grep-ability.

### External Service Failures — Graceful Degradation

| Service | Failure mode | Degradation |
|---------|-------------|-------------|
| Resend (email) | API error | Registration succeeds; show banner "Couldn't send verification email. Contact support." Log error. |
| Vercel Blob | Upload error | Idea saved without attachment; show toast "File upload failed. Idea saved without attachment." |
| Neon (DB) | Connection error | Return 500; log error; show generic "Something went wrong" to user |

---

## 7. Quality Criteria

### Definition of Done (per story)

Every story is done when ALL of the following are true:

- [ ] All Acceptance Criteria in the story file pass
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm run lint` passes with zero ESLint warnings
- [ ] Unit test written for core logic (Server Action guards, Zod schema, auth helper)
- [ ] Integration test written for the primary happy path
- [ ] Line coverage remains ≥80% after the change
- [ ] Feature flags respected (flag-off path tested or verified)
- [ ] No `console.log` debug statements left in code
- [ ] No commented-out code blocks left in files
- [ ] Conventional commit written: `feat(scope): description`

### Conventional Commit Format

```
<type>(<scope>): <short description>

Types: feat, fix, chore, refactor, test, docs, style, perf
Scope: auth, ideas, admin, db, infra, profile

Examples:
feat(auth): user registration with email verification
fix(ideas): prevent duplicate idea submission on double-click
test(admin): add E2E for review acceptance flow
chore(db): add IdeaReview cascade delete rule
```

### Code Review Checklist

Before asking for review (or running `specify check`), verify:

**Correctness**
- [ ] All ACs pass manually
- [ ] Edge cases from the story's table are handled
- [ ] No business logic violations (e.g., self-review allowed, wrong role can access)

**Security**
- [ ] No PII in logs
- [ ] RBAC checked in Server Action (not only in middleware)
- [ ] User input validated with Zod before any DB write
- [ ] File uploads validated MIME type + size server-side

**Code quality**
- [ ] No function > 40 lines, no component > 100 lines
- [ ] No magic numbers (all in `constants/`)
- [ ] No `any` types introduced
- [ ] Imports sorted (`eslint-plugin-import` enforces this)

**Tests**
- [ ] Test file exists and mirrors source file location
- [ ] Happy path + at least one unhappy path tested
- [ ] No `it.only` or `describe.only`

**UX**
- [ ] Loading state handled (button disabled on submit, spinner shown)
- [ ] Empty state rendered (not blank white)
- [ ] Error state shows actionable message (not "Error 500")
- [ ] Keyboard-accessible (tab order, focus management after async actions)

### Performance Expectations

| Metric | Threshold |
|--------|-----------|
| Page load (P95) | < 2 seconds |
| API response (P95) | < 500 ms |
| Prisma query (simple) | < 50 ms |
| Prisma query (with join) | < 200 ms |
| File upload (5 MB) | < 5 seconds |

Flag slow queries: if a Prisma query takes > 200 ms in dev, add appropriate `select` to limit returned fields before shipping.

### Agent Workflow Alignment

This project follows the **agent.md** principles from `.github/copilot-instructions.md`:

| Principle | How it applies here |
|-----------|-------------------|
| **Plan before build** | Read the story file + this standards doc before writing any code |
| **Verification before done** | Run `npm run build && npm run lint && npm run test:unit` before marking a task complete |
| **No laziness** | Find root causes; no `// @ts-ignore`; no `eslint-disable` without documented reason |
| **Minimal impact** | Only change files necessary for the current story; no refactoring unrelated code |
| **Self-improvement** | After any correction, add a rule to `tasks/lessons.md` |
| **Elegant over hacky** | If a fix feels wrong, stop and ask "what's the right solution?" |
