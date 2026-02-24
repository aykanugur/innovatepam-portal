# User Story: Test Suite & QA Gate

**Story ID**: US-016  
**Epic**: EPIC-04 — Evaluation Workflow, Admin Tools & Quality Gate  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: M  
**Sprint**: Day 3 — PM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As a** developer,  
**I want to** establish a complete test suite with ≥80% line coverage (Vitest) and 4 critical E2E paths (Playwright), and run a GA smoke test on the Vercel production URL,  
**so that** the InnovatEPAM Portal can ship to general availability with verified quality.

---

## Context & Motivation

Test coverage is a hard go/no-go criterion for GA. Without it, the portal cannot be confidently handed to users. This story covers the final QA gate: writing the missing tests, verifying coverage, running E2E paths, and executing a smoke test on the live Vercel deployment.

---

## Acceptance Criteria

1. **Given** all feature stories (US-001 to US-015) are complete,  
   **When** `npm run test:unit` is executed,  
   **Then** Vitest reports ≥80% line coverage on all `src/` files.

2. **Given** the Playwright E2E suite is configured,  
   **When** `npm run test:e2e` is executed,  
   **Then** all 4 critical paths pass:
   - Path 1: Register → verify email → login → dashboard
   - Path 2: Login → submit idea → land on detail page
   - Path 3: Admin login → start review → accept idea → verify detail page
   - Path 4: SUBMITTER attempts `/admin` → 403 page

3. **Given** the Vercel production deployment is live,  
   **When** a manual smoke test is performed,  
   **Then** all smoke test items in the checklist below pass without errors.

4. **Given** the test suite is configured,  
   **When** a commit is pushed to `main`,  
   **Then** GitHub Actions runs `npm run lint && npm run test:unit && npm run build` and all steps pass.

---

## Smoke Test Checklist (Manual — Production)

- [ ] `/` → HTTP 200 or redirect to `/login`
- [ ] `/login` → renders login form
- [ ] `/register` → renders registration form
- [ ] `/ideas` → renders idea list (authenticated)
- [ ] `/admin` → renders dashboard for ADMIN; 403 for SUBMITTER
- [ ] `/admin/review/<id>` → renders review page

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | Coverage drops below 80% due to new code | CI gate fails; must add tests before merge |
| 2 | E2E test is flaky due to timing | Add `waitForSelector` / `waitForURL` guards; mark flaky and fix |
| 3 | Production DB differs from local schema | Run `npx prisma migrate deploy` as part of CI/CD before smoke test |

---

## Technical Notes

### Vitest Configuration (`vitest.config.ts`)
```ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 75 }
    }
  }
})
```

### Playwright Configuration (`playwright.config.ts`)
```ts
export default defineConfig({
  use: { baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000' },
  projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }]
})
```

### GitHub Actions (`.github/workflows/ci.yml`)
```yaml
- name: Lint
  run: npm run lint
- name: Test + Coverage
  run: npm run test:unit -- --coverage
- name: Build
  run: npm run build
```

### Test Structure
```
src/
  __tests__/         ← Vitest unit tests
  e2e/               ← Playwright tests
    01-register-verify-login.spec.ts
    02-submit-idea.spec.ts
    03-admin-review.spec.ts
    04-rbac-403.spec.ts
```

- **Feature Flag**: None

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-001 to US-015 — All feature stories | Story | Must be complete | Yes |
| Vitest + @vitest/coverage-v8 installed | Package | Required | Yes |
| Playwright installed (`npx playwright install`) | Package | Required | Yes |
| GitHub Actions workflow file | Config | `/.github/workflows/ci.yml` | Yes |

---

## Test Plan

### Manual Testing
- [ ] Run `npm run test:unit -- --coverage` → ≥80% line coverage
- [ ] Run `npm run test:e2e` → all 4 paths green
- [ ] Execute smoke test checklist on production URL

### Automated Testing
_This story IS the test suite — the automated tests are the deliverable._

---

## Definition of Done

- [ ] Vitest reports ≥80% line coverage
- [ ] All 4 E2E paths pass locally
- [ ] GitHub Actions CI pipeline passes on `main`
- [ ] Smoke test checklist fully green on Vercel production
- [ ] `git tag v1.0.0` created
- [ ] `git commit: test: complete test suite and qa gate for ga`
