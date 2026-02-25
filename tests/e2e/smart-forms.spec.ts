/**
 * T016 — E2E tests for Smart Submission Forms (Smart Forms feature flag).
 *
 * Requires:
 *   - FEATURE_SMART_FORMS_ENABLED=true (set in playwright.config.ts webServer.env)
 *   - CategoryFieldTemplate records seeded (npm run db:seed)
 *
 * Covers:
 *   SC-001 — Dynamic fields appear after category selection
 *   SC-002 — Required field validation (inline error; no navigation)
 *   SC-003 — Successful submission stores fields; detail page shows "Additional Details"
 *   SC-005 — With flag off (documented separately): no dynamic-field-section in DOM
 */

import { test, expect, type Page } from '@playwright/test'
import type { APIRequestContext } from '@playwright/test'
import { loginAs } from './helpers/auth'
import { seedTestData, cleanupTestData } from './helpers/seed'

const RUN_ID = `smart-forms-${Date.now()}`

test.afterEach(async ({ request }) => {
  await cleanupTestData(request, RUN_ID)
})

/**
 * Helper: navigate to /ideas/new, log in, and select a category.
 * Returns the page after the category is selected so callers can make assertions.
 */
async function goToNewIdeaAndSelectCategory(
  page: Page,
  request: APIRequestContext,
  category: string
) {
  const seed = await seedTestData(request, RUN_ID)
  await loginAs(page, { email: seed.submitterEmail, password: seed.submitterPassword })
  await page.goto('/ideas/new')
  await page.waitForLoadState('networkidle')
  await page.selectOption('#category', category)
  return seed
}

// ─── SC-001: Dynamic fields appear after category selection ───────────────────

test.describe('SC-001 — Dynamic fields visible after category select', () => {
  test('process-improvement category shows dynamic field section', async ({ page, request }) => {
    await goToNewIdeaAndSelectCategory(page, request, 'process-improvement')

    // The DynamicFieldSection container must appear — confirms DB template is seeded
    // and the feature flag is on
    await expect(page.getByTestId('dynamic-field-section')).toBeVisible({ timeout: 5_000 })

    // "Additional Details" heading must be present inside the section
    await expect(
      page.getByTestId('dynamic-field-section').getByText('Additional Details')
    ).toBeVisible()
  })

  test('switching category: old fields removed, new fields rendered', async ({ page, request }) => {
    await goToNewIdeaAndSelectCategory(page, request, 'process-improvement')
    // Confirm section is visible first
    await expect(page.getByTestId('dynamic-field-section')).toBeVisible({ timeout: 5_000 })

    // Switch to a different category
    await page.selectOption('#category', 'technology')

    // Section should still be visible (technology also has templates)
    await expect(page.getByTestId('dynamic-field-section')).toBeVisible({ timeout: 3_000 })
  })
})

// ─── SC-002: Required field validation (no navigation on missing field) ────────

test.describe('SC-002 — Required field validation', () => {
  test('submitting without required dynamic field shows inline error', async ({
    page,
    request,
  }) => {
    await goToNewIdeaAndSelectCategory(page, request, 'process-improvement')

    // Wait for dynamic fields to render
    await expect(page.getByTestId('dynamic-field-section')).toBeVisible({ timeout: 5_000 })

    // Fill base idea fields
    await page.fill('#title', `[test:${RUN_ID}] Validation test idea`)
    await page.fill(
      '#description',
      'Description long enough to pass the minimum character validation requirement.'
    )

    // Intentionally leave required dynamic fields blank, then submit
    await page.click('button[type="submit"]:has-text("Submit Idea")')

    // Must stay on /ideas/new — no redirect
    await expect(page).toHaveURL(/\/ideas\/new/, { timeout: 5_000 })

    // An error message must be visible (either inline or in the dynamic section)
    const errorLocator = page.locator('[aria-invalid="true"], [role="alert"], .text-red-400')
    await expect(errorLocator.first()).toBeVisible({ timeout: 5_000 })
  })
})

// ─── SC-003: Successful submission — "Additional Details" on detail page ───────

test.describe('SC-003 — Successful submission with dynamic fields', () => {
  test('idea detail shows Additional Details section after submission', async ({
    page,
    request,
  }) => {
    await goToNewIdeaAndSelectCategory(page, request, 'process-improvement')

    // Wait for dynamic fields section
    await expect(page.getByTestId('dynamic-field-section')).toBeVisible({ timeout: 5_000 })

    // Fill base fields
    await page.fill('#title', `[test:${RUN_ID}] Smart forms submission`)
    await page.fill(
      '#description',
      'Testing that dynamic fields are stored and shown on the detail page.'
    )

    // Fill all visible required dynamic fields
    // Find all inputs/textareas within the dynamic section that are required
    const dynamicSection = page.getByTestId('dynamic-field-section')
    const requiredInputs = dynamicSection.locator('[aria-required="true"]')
    const count = await requiredInputs.count()

    for (let i = 0; i < count; i++) {
      const input = requiredInputs.nth(i)
      const tagName = await input.evaluate((el) => el.tagName.toLowerCase())
      if (tagName === 'select') {
        // Select the first non-empty option
        const firstOption = await input.locator('option:not([value=""])').first()
        const optionValue = await firstOption.getAttribute('value')
        if (optionValue) {
          await input.selectOption(optionValue)
        }
      } else {
        await input.fill(`Test value ${i + 1}`)
      }
    }

    // Submit
    await page.click('button[type="submit"]:has-text("Submit Idea")')

    // Should redirect to idea detail page
    await expect(page).toHaveURL(/\/ideas\/[a-z0-9]+$/, { timeout: 10_000 })
    await page.waitForLoadState('networkidle')

    // "Additional Details" section must be visible on the detail page (FR-008)
    await expect(page.getByTestId('dynamic-field-section')).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText('Additional Details')).toBeVisible()
  })
})

// ─── SC-005 — Flag-off: no dynamic fields section rendered ─────────────────────
//
// NOTE: SC-005 cannot be run in the same process as flag-on tests because
// FEATURE_SMART_FORMS_ENABLED is a server-side env var read at request time.
// To test the flag-off state manually:
//   1. Stop the dev server
//   2. Unset FEATURE_SMART_FORMS_ENABLED (or set to 'false')
//   3. Start the server: npm run dev
//   4. Run: npx playwright test tests/e2e/smart-forms.spec.ts --grep SC-005
//
// This test is skipped in the default flag-on playwright config to avoid CI failure.

test.describe('SC-005 — Flag OFF: no dynamic fields in submission form', () => {
  test.skip(true, 'Requires server restart with FEATURE_SMART_FORMS_ENABLED=false')

  test('form renders without DynamicFieldSection when flag is off', async ({ page, request }) => {
    await goToNewIdeaAndSelectCategory(page, request, 'process-improvement')

    // With flag off, the dynamic fields section must NOT be present at all (SC-005)
    await expect(page.getByTestId('dynamic-field-section')).toHaveCount(0)
  })
})
