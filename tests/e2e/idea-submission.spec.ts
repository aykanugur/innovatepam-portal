/**
 * tests/e2e/idea-submission.spec.ts — T027
 *
 * US-016 AC-2 path (b): Idea submission E2E.
 * - Login as SUBMITTER → navigate to /ideas/new
 * - Fill title, description, category
 * - Submit → assert redirect to /ideas/<id>
 * - Assert title and "Submitted" badge visible
 */

import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { seedTestData, cleanupTestData } from './helpers/seed'

const RUN_ID = `submission-${Date.now()}`

test.afterEach(async ({ request }) => {
  await cleanupTestData(request, RUN_ID)
})

test.describe('US-016 AC-2 path (b) — Idea Submission', () => {
  test('submitter can submit a new idea', async ({ page, request }) => {
    const seed = await seedTestData(request, RUN_ID)

    await loginAs(page, { email: seed.submitterEmail, password: seed.submitterPassword })

    await page.goto('/ideas/new')
    await page.waitForLoadState('networkidle')

    // Fill title
    await page.fill('#title', '[test] E2E submitted idea title')

    // Fill description (min 20 chars required per form validation)
    await page.fill('#description', 'E2E test description that is long enough to pass validation.')

    // Select category
    await page.selectOption('#category', 'process-improvement')

    // Submit — use text selector to avoid clicking the nav's "Sign out" button
    await page.click('button[type="submit"]:has-text("Submit Idea")')

    // Should redirect to /ideas/<id>
    await expect(page).toHaveURL(/\/ideas\/[a-z0-9]+$/, { timeout: 10_000 })
    await page.waitForLoadState('networkidle')

    // Title visible (use heading role to avoid matching Next.js route announcer)
    await expect(
      page.getByRole('heading', { name: '[test] E2E submitted idea title' })
    ).toBeVisible({ timeout: 10_000 })

    // Status badge shows "Submitted" — use aria-label to be specific
    await expect(page.getByLabel('Status: Submitted')).toBeVisible({ timeout: 5_000 })
  })
})
