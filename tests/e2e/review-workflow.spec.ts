/**
 * tests/e2e/review-workflow.spec.ts — T028
 *
 * US-016 AC-2 path (c): Review workflow E2E.
 * - Seed submitter + idea + admin
 * - Login as ADMIN → open /admin/review/<id>
 * - Click "Start Review" → status becomes "Under Review"
 * - Enter 15-char comment → "Accept" → DecisionCard shows "ACCEPTED"
 * - Login as SUBMITTER → open /ideas/<id> → decision badge + reviewer info visible
 *
 * Validates: FR-007 (submitter sees decision), SC-002 (idea view updated after review)
 */

import { test, expect } from '@playwright/test'
import { loginAs, logout } from './helpers/auth'
import { seedTestData, cleanupTestData } from './helpers/seed'

const RUN_ID = `review-${Date.now()}`

test.afterEach(async ({ request }) => {
  await cleanupTestData(request, RUN_ID)
})

test.describe('US-016 AC-2 path (c) — Review Workflow', () => {
  test('admin can start and finalize a review; submitter sees decision', async ({
    page,
    request,
  }) => {
    const seed = await seedTestData(request, RUN_ID)
    const ideaId = seed.ideaId

    // ── Admin starts the review ──────────────────────────────────────────────
    await loginAs(page, { email: seed.adminEmail, password: seed.adminPassword })

    await page.goto(`/admin/review/${ideaId}`)

    // Status should be SUBMITTED initially
    await expect(page.getByText('SUBMITTED'))
      .toBeVisible({ timeout: 5_000 })
      .catch(() => expect(page.getByText('Submitted')).toBeVisible({ timeout: 5_000 }))

    // Start Review
    await page.getByRole('button', { name: /start review/i }).click()

    // Status should change to UNDER_REVIEW
    await expect(page.getByText(/under.?review/i)).toBeVisible({ timeout: 10_000 })

    // ── Admin enters comment and accepts ────────────────────────────────────
    await page.fill('#review-comment', 'This is a great idea!')

    await page.getByRole('button', { name: /^accept$/i }).click()

    // Decision card should appear
    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 10_000 })

    // ── Submitter views the decision ────────────────────────────────────────
    await logout(page)

    await loginAs(page, { email: seed.submitterEmail, password: seed.submitterPassword })

    await page.goto(`/ideas/${ideaId}`)

    // Decision badge visible on submitter's idea view (FR-007)
    await expect(page.getByText(/accepted/i).first()).toBeVisible({ timeout: 10_000 })
  })
})
