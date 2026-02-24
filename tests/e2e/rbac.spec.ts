/**
 * tests/e2e/rbac.spec.ts — T029
 *
 * US-016 AC-2 path (d): RBAC E2E.
 * - Login as SUBMITTER → attempt /admin → redirect to /forbidden
 * - Login as SUBMITTER → /settings IS accessible
 * - Unauthenticated → /admin redirects to /login
 */

import { test, expect } from '@playwright/test'
import { loginAs, logout } from './helpers/auth'
import { seedTestData, cleanupTestData } from './helpers/seed'

const RUN_ID = `rbac-${Date.now()}`

test.afterEach(async ({ request }) => {
  await cleanupTestData(request, RUN_ID)
})

test.describe('US-016 AC-2 path (d) — RBAC Enforcement', () => {
  test('unauthenticated user visiting /admin is redirected to /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/admin')

    // Should redirect to /login (proxy.ts or page-level auth redirect)
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('submitter visiting /admin is redirected to /forbidden', async ({ page, request }) => {
    const seed = await seedTestData(request, RUN_ID)

    await loginAs(page, { email: seed.submitterEmail, password: seed.submitterPassword })

    await page.goto('/admin')

    await expect(page).toHaveURL(/\/forbidden/, { timeout: 5_000 })
  })

  test('submitter can access /settings (T002 proxy guard)', async ({ page, request }) => {
    const seed = await seedTestData(request, RUN_ID + '-s')

    await loginAs(page, { email: seed.submitterEmail, password: seed.submitterPassword })

    await page.goto('/settings')

    // Should NOT redirect to /login or /forbidden
    await expect(page).toHaveURL(/\/settings/, { timeout: 5_000 })

    await cleanupTestData(request, RUN_ID + '-s')
  })
})
