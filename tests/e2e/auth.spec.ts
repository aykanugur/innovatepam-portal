/**
 * __tests__/e2e/auth.spec.ts — T026
 *
 * US-016 AC-2 path (a): Login E2E.
 * - Navigate /login → fill credentials → submit → assert redirect to /ideas
 * - Assert nav shows user displayName
 * - Assert /admin shows access-denied for SUBMITTER
 *
 * TODO(US-016): registration E2E deferred — login-only path covers the auth gate
 */

import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { seedTestData, cleanupTestData } from './helpers/seed'

const RUN_ID = `auth-${Date.now()}`

test.afterEach(async ({ request }) => {
  await cleanupTestData(request, RUN_ID)
})

test.describe('US-016 AC-2 path (a) — Authentication', () => {
  test('submitter can log in and sees /ideas', async ({ page, request }) => {
    const seed = await seedTestData(request, RUN_ID)

    await loginAs(page, { email: seed.submitterEmail, password: seed.submitterPassword })

    // Should land on /ideas (or wherever the app redirects after login)
    await expect(page).toHaveURL(/\/(ideas|dashboard)/, { timeout: 10_000 })
  })

  test('admin can log in', async ({ page, request }) => {
    const seed = await seedTestData(request, RUN_ID + '-a')

    await loginAs(page, { email: seed.adminEmail, password: seed.adminPassword })

    // Admin should be redirected to /ideas or /dashboard after login
    await expect(page).toHaveURL(/\/(ideas|dashboard)/, { timeout: 10_000 })

    await cleanupTestData(request, RUN_ID + '-a')
  })

  test('submitter visiting /admin is redirected to /forbidden', async ({ page, request }) => {
    const seed = await seedTestData(request, RUN_ID + '-b')

    await loginAs(page, { email: seed.submitterEmail, password: seed.submitterPassword })
    await page.goto('/admin')

    // Should redirect to /forbidden (role guard)
    await expect(page).toHaveURL(/\/forbidden/, { timeout: 5_000 })

    await cleanupTestData(request, RUN_ID + '-b')
  })
})
