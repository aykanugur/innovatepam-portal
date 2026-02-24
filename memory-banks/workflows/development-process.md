# Development Workflow — InnovatEPAM Portal

**Last Updated**: 2026-02-24  
**Version**: 1.0  
**Owner**: Aykan Uğur

> Load this file before branching, committing, opening a PR, running migrations,
> or deploying to production. These are the authoritative process steps for this project.

---

## 1. Development Process: Idea to Production

### Overview (3-Day Sprint)

```
Day 1 AM   → EPIC-01: Foundation (scaffold, DB, env, deploy)
Day 1 PM   → EPIC-02: Auth & Roles (register, verify, login, RBAC)
Day 1 EOD  → EPIC-03 start: Submit Idea form
Day 2 AM   → EPIC-03: Idea list, detail, my ideas
Day 2 PM   → EPIC-04: Evaluation workflow, admin dashboard
Day 3 AM   → EPIC-04: Analytics (P3, cut-first), profile settings (P3, cut-first)
Day 3 PM   → US-016: Test suite, QA gate, GA smoke test, tag v1.0.0
```

### Story-Level Workflow (per user story)

```
1. Read story file (specs/stories/epicXX/US-XXX-*.md)
   └── Review: ACs, edge cases, technical notes, dependencies

2. Check dependencies are done
   └── Blocked? Resolve blocker first. Do NOT start partially.

3. Create feature branch
   └── git checkout -b feat/US-XXX-short-description

4. Implement
   a. Write Zod schema / types first
   b. Write Server Action or Route Handler
   c. Write React Server Component / Client Component
   d. Wire up UI to action

5. Write tests
   a. Unit test for core logic (guards, Zod schema, helpers)
   b. Integration test for primary happy path
   c. Verify coverage stays ≥80%: npm run test:unit -- --coverage

6. Self-verify
   └── Run the Definition of Done checklist from the story file

7. Commit (Conventional Commits format)
   └── git commit -m "feat(scope): description"

8. Push + merge to main
   └── CI passes (lint + test + build) → merge

9. Verify on Vercel preview URL
   └── Check the story's ACs manually on the preview deployment

10. Move to next story
```

### Priority Rules When Behind Schedule

Cut in this order (never cut P1 stories):

| Cut Priority | Story | Flag to set |
|-------------|-------|------------|
| Cut first | US-014 Analytics page | `FEATURE_ANALYTICS_ENABLED=false` |
| Cut second | US-015 Profile & settings | (no flag — just skip) |
| Cut third | US-007 User management table | `FEATURE_USER_MANAGEMENT_ENABLED=false` |
| Never cut | US-001 to US-013, US-016 | — |

---

## 2. Branching Strategy

### Pattern: GitHub Flow (simplified trunk-based)

Single main branch + short-lived feature branches. No `develop` or `release` branches — this project has one developer and a 3-day timeline.

```
main ──────────────────────────────────────────────────── (always deployable)
  └── feat/US-001-project-scaffold  (XS: ~30 min)  ──► merged to main
  └── feat/US-002-prisma-setup      (S:  ~45 min)  ──► merged to main
  └── feat/US-003-env-vercel        (XS: ~20 min)  ──► merged to main
  ...
```

### Branch Naming

```
feat/US-XXX-short-description       # new feature story
fix/US-XXX-bug-description          # bug fix on a specific story
hotfix/critical-short-description   # production hotfix
chore/task-description              # dependency updates, config changes
```

**Examples:**
```
feat/US-004-user-registration
feat/US-007-rbac-middleware
fix/US-008-file-upload-mime-validation
hotfix/auth-cookie-samesite
chore/upgrade-prisma-v6
```

### Branch Rules

| Branch | Rule |
|--------|------|
| `main` | Always deployable. Direct commits only for Day 1 initial scaffold. After US-001, all changes via feature branch. |
| Feature branches | Short-lived — merged within the same work session. Never let a branch survive more than one day. |
| Naming | Must reference the US-XXX story ID so the commit history is traceable to specs. |

### Commit Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description (imperative, ≤72 chars)>

[optional body: why, not what]

[optional footer: BREAKING CHANGE, closes #issue]
```

**Types:** `feat`, `fix`, `chore`, `refactor`, `test`, `docs`, `style`, `perf`  
**Scopes:** `auth`, `ideas`, `admin`, `db`, `infra`, `profile`, `ui`

```bash
# Good examples
git commit -m "feat(auth): add email verification with 24h token expiry"
git commit -m "fix(ideas): prevent double-submit via button disable on click"
git commit -m "test(admin): add integration test for finalize-review guard"
git commit -m "chore(db): add cascade delete rule on IdeaReview"
git commit -m "refactor(ideas): extract visibility guard to lib/idea-guards.ts"

# Bad examples
git commit -m "fix bug"                    # too vague
git commit -m "WIP"                        # never commit WIP to main
git commit -m "added stuff"               # no type, no scope, past tense
```

---

## 3. Pull Request Process

### When to Open a PR

This is a solo project. "PR" = pushing a feature branch and merging after CI passes. Even solo, follow the PR discipline — it keeps the git history clean and CI-gated.

### Before Merging (Self-Review Checklist)

```
Definition of Done — run through every item before merge:

Build & Lint
  [ ] npm run build     → zero TypeScript errors
  [ ] npm run lint      → zero ESLint warnings or errors
  [ ] No console.log debug statements left in code
  [ ] No commented-out code blocks

Tests
  [ ] npm run test:unit -- --coverage  → ≥80% line coverage maintained
  [ ] New unit test written for core logic
  [ ] New integration test for happy path
  [ ] No it.only or describe.only in committed test files

Correctness
  [ ] All ACs from the story file pass (manually verified)
  [ ] Edge cases from the story's table are handled
  [ ] Feature flag respected (tested both on and off path)

Security
  [ ] No PII in console.error calls
  [ ] User input validated with Zod before any DB write
  [ ] RBAC checked in Server Action (not only in middleware)
  [ ] File uploads: MIME + size validated server-side (if applicable)

UX
  [ ] Loading state: button disabled on submit / spinner shown
  [ ] Empty state: page never shows blank white
  [ ] Error state: user sees actionable message ("Try again" — not "Error 500")
  [ ] Keyboard accessible

Git
  [ ] Conventional Commit message written
  [ ] Branch named feat/US-XXX-*
  [ ] No merge commits (use rebase: git pull --rebase origin main)
```

### CI Checks (Must All Pass)

```yaml
# .github/workflows/ci.yml
- Run:  npm run lint
- Run:  npm run test:unit -- --coverage
- Run:  npm run build
```

If any step fails: **do not merge**. Fix the failure first.

### Merge Strategy

```bash
# After CI passes:
git checkout main
git merge --squash feat/US-XXX-description   # squash all feature branch commits into one
git commit -m "feat(scope): description"     # clean single commit on main
git push origin main
git branch -d feat/US-XXX-description        # delete the feature branch
```

**Squash merge** keeps `main` history linear and readable. One story = one commit on `main`.

---

## 4. Testing Strategy

### Test Types

| Type | Tool | When to Write | What to Cover |
|------|------|--------------|---------------|
| **Unit** | Vitest | As you write business logic | Server Action guards, Zod validation, auth helpers, pure utility functions |
| **Integration** | Vitest + Prisma test client | After unit tests pass | Route Handler responses, Server Action DB side-effects, edge cases across layers |
| **E2E** | Playwright | After each EPIC is complete | Full user journeys via browser; 4 required paths (US-016) |

### Coverage Requirements

```
Overall (all src/ files)    ≥80% line coverage    [hard gate — CI fails if below]
lib/ and actions/            ≥80% line coverage    [highest priority; all business logic lives here]
components/                 ≥60% line coverage    [RSCs are harder to unit test; integration covers the rest]
components/ui/ (shadcn)     excluded              [third-party; not ours to test]
prisma/                     excluded              [schema; no logic to cover]
```

### When to Write Tests

**Unit tests — write first (light TDD):**
1. Define the Zod schema → write failing test for invalid input
2. Write the guard logic → write test for the guard rejection
3. Implement → tests pass

**Integration tests — write after implementation:**
- After the Server Action or Route Handler is working, write the integration test that hits the real DB (test DB)
- Verify the DB state after the action, not just the return value

**E2E tests — write after each epic:**
- After EPIC-02 is done: write E2E Path 1 (register → verify → login)
- After EPIC-03 is done: write E2E Path 2 (submit idea)
- After EPIC-04 is done: write E2E Paths 3 + 4 (admin review, RBAC 403)

### Test File Location

```
Source: actions/finalize-review.ts
Test:   __tests__/actions/finalize-review.test.ts   ← mirrors source path

Source: lib/validations.ts
Test:   __tests__/lib/validations.test.ts

Source: app/api/auth/register/route.ts
Test:   __tests__/api/register.test.ts

E2E:    e2e/03-admin-review.spec.ts
```

### Running Tests

```bash
# Unit + integration (with coverage report)
npm run test:unit -- --coverage

# Watch mode during development
npm run test:unit -- --watch

# Single file
npm run test:unit -- finalize-review.test.ts

# E2E (requires running dev server)
npm run dev &
npm run test:e2e

# E2E with UI (debug mode)
npm run test:e2e -- --ui
```

---

## 5. Database Migration Workflow

### Creating a New Migration

```bash
# 1. Edit prisma/schema.prisma

# 2. Generate and apply migration locally
npx prisma migrate dev --name describe-change
# e.g.: npx prisma migrate dev --name add-idea-visibility-column

# 3. Verify migration file in prisma/migrations/
# 4. Test with prisma studio
npx prisma studio

# 5. Commit migration file alongside the code that uses it
git add prisma/migrations/ prisma/schema.prisma
git commit -m "chore(db): add idea visibility column"
```

### Migration Safety Rules

| Rule | Reason |
|------|--------|
| **Additive only in MVP** — no `DROP COLUMN`, `DROP TABLE`, `ALTER COLUMN` that loses data | Vercel instant rollback must always work; old deployment must still run against new schema |
| Always migrate before shipping code that uses the new column | Application code expecting a column that doesn't exist = runtime crash |
| Migration files are committed to git | Reproducible environment; Vercel CI runs `prisma migrate deploy` |
| Never manually edit migration SQL files | Prisma regenerates the client from the schema; manual edits cause drift |

### Production Migration (Vercel CI/CD)

```bash
# This runs automatically in CI before the Next.js build:
npx prisma migrate deploy   # applies all pending migrations
npx prisma generate         # regenerates Prisma client
npm run build               # Next.js build
```

### Seeding (Superadmin Bootstrap — One-Time)

```bash
# After initial deploy to production:
# 1. Set SUPERADMIN_EMAIL in Vercel environment variables
# 2. Open Vercel dashboard → Functions → CLI tab, OR run locally against prod DB:
npx prisma db seed

# Verify:
npx prisma studio  # User with SUPERADMIN_EMAIL should have role=SUPERADMIN
```

---

## 6. Deployment Process

### Deployment Environments

| Environment | Trigger | URL Pattern | Purpose |
|-------------|---------|------------|---------|
| Local dev | `npm run dev` | `localhost:3000` | Active development |
| Vercel Preview | Push to any non-main branch | `https://<hash>-innovatepam.vercel.app` | Review before merging |
| Vercel Production | Push/merge to `main` | `https://innovatepam.vercel.app` | Live portal |

### Automatic Deployment (Normal Flow)

```
1. Push feature branch
   └── Vercel automatically builds preview deployment
   └── Check: does the story work on the preview URL?

2. Merge to main (squash)
   └── GitHub Actions CI runs: lint → test:unit → build
   └── If CI passes: Vercel automatically deploys to production
   └── Production deployment takes ~90 seconds

3. Verify production (see smoke test below)
```

### Pre-Merge Verification (Preview URL)

Before merging any story to `main`, manually verify on the Vercel preview URL:

- [ ] The feature works end-to-end (all ACs pass)
- [ ] No console errors in browser devtools
- [ ] No server errors in Vercel function logs

### Production Smoke Test (After Each Merge to Main)

```bash
# Check these 6 URLs on the live production URL:
✓  /                 → HTTP 200 or redirect to /login
✓  /login            → login form renders
✓  /register         → register form renders
✓  /ideas            → idea list renders (authenticated)
✓  /admin            → admin dashboard (as ADMIN); 403 (as SUBMITTER)
✓  /admin/review/:id → review panel renders (as ADMIN)
```

If any smoke test item fails → trigger rollback immediately.

### Full GA Smoke Test (Day 3 — Before Announcing Launch)

1. Run all 6 URL checks above
2. Manually execute the 4 E2E critical paths as a real user in incognito:
   - Path 1: Register → verify → login → dashboard
   - Path 2: Login → submit idea → land on detail page
   - Path 3: Admin login → start review → accept → verify detail page
   - Path 4: SUBMITTER navigates to `/admin` → sees 403
3. Run `npm run test:e2e` against production URL (`PLAYWRIGHT_BASE_URL=https://...`)
4. Verify Vercel function logs show no errors
5. `git tag v1.0.0 && git push origin v1.0.0`

---

## 7. Rollback Procedure

### Instant Rollback (Vercel Dashboard — Default Path)

Use this for any production issue. Takes < 30 seconds.

```
1. Open Vercel dashboard → innovatepam project → Deployments
2. Find the last known-good deployment
3. Click "..." → "Promote to Production"
4. Verify production URL is healthy (smoke test)
5. Investigate the root cause on a feature branch before re-deploying
```

### Feature Flag Rollback (Targeted — No Redeployment)

When only a specific feature is broken:

```
1. Open Vercel dashboard → Settings → Environment Variables
2. Set the controlling flag to 'false':
   FEATURE_FILE_ATTACHMENT_ENABLED=false   (for attachment issues)
   FEATURE_EMAIL_VERIFICATION_ENABLED=false (for email issues)
   PORTAL_ENABLED=false                    (nuclear option — maintenance page)
3. Redeploy (Vercel re-reads env vars on next deploy, or trigger manual redeploy)
4. Verify the broken feature is hidden/disabled on production
5. File a fix on a feature branch; re-enable flag after fix merges
```

### Database Rollback (Last Resort)

MVP schema is additive-only, so this is rarely needed:

```
1. Vercel instant-rollback the application first (see above)
2. If a migration added a column that has bad data:
   - Connect to Neon dashboard → SQL editor
   - Manually run: ALTER TABLE ... DROP COLUMN ... (only if column is empty)
3. Add a down migration to prisma/migrations/ for the future
4. Never revert a migration that has live user data without a backup
```

### Rollback Decision Tree

```
Production issue detected
      │
      ▼
Is it isolated to one feature?
  ├── Yes → Disable feature flag → investigate on branch → re-enable after fix
  └── No  → Is it a build issue (TypeScript, route error)?
              ├── Yes → Vercel instant rollback → fix on branch → re-deploy
              └── No  → Is it a data issue?
                          ├── Yes → Rollback app + assess DB (see above)
                          └── No  → Check Vercel function logs → fix → re-deploy
```

---

## 8. Environment Variable Management

### Local Development

```bash
# Copy .env.example to .env.local and fill in values
cp .env.example .env.local

# Required for local dev:
DATABASE_URL=postgresql://...       # Neon dev branch connection string
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
RESEND_API_KEY=re_...               # or set FEATURE_EMAIL_VERIFICATION_ENABLED=false
```

### Adding a New Environment Variable

1. Add to `.env.local` locally
2. Add the key (no value) to `.env.example` with a comment
3. Add the value to Vercel dashboard under Settings → Environment Variables:
   - Add to all three environments: Production, Preview, Development
4. Commit the `.env.example` change

**Never commit `.env.local`.** Verify with `git status` before any commit.

### Feature Flags in Code

```typescript
// ✅ Correct — check at route boundary, use notFound() or redirect()
// app/admin/analytics/page.tsx
if (process.env.FEATURE_ANALYTICS_ENABLED !== 'true') {
  return notFound()
}

// ❌ Wrong — don't gate with if/else deep inside business logic
async function getAnalyticsData() {
  if (process.env.FEATURE_ANALYTICS_ENABLED !== 'true') return null  // ← bad
  ...
}
```

---

## 9. Agent Workflow Alignment

This workflow directly implements the principles from `.github/copilot-instructions.md`:

| Principle | Process Step |
|-----------|-------------|
| **Plan before build** | Step 1: Read story file fully before writing a line of code |
| **Track progress** | Story DoD checklist — run through before every merge |
| **Verification before done** | Smoke test on preview URL before merging; CI gate before production |
| **No laziness** | No `// TODO: fix later` merged to main; all edge cases from story file handled |
| **Minimal impact** | Squash merge = one story, one commit; only change files in scope |
| **Capture lessons** | After any unexpected issue: update `tasks/lessons.md` with the pattern |
| **Autonomous bug fixing** | Production issue → rollback decision tree → fix branch → re-deploy; no hand-holding |
