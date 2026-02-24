/**
 * __tests__/e2e/helpers/auth.ts — T024
 *
 * Shared Playwright helper: loginAs(page, role)
 * Navigates to /login, fills credentials, and waits for redirect.
 *
 * Credentials are constants pointing to the E2E seed users.
 * The actual email/password values are returned by the seed helper.
 */

import type { Page } from '@playwright/test'

/** Well-known credentials for E2E seed users (set by /api/test/seed) */
export interface UserCreds {
  email: string
  password: string
}

/**
 * Log in via the login form and wait for redirect to /ideas or /admin.
 * Throws if login doesn't complete within a reasonable timeout.
 */
export async function loginAs(page: Page, creds: UserCreds): Promise<void> {
  await page.goto('/login')
  await page.fill('#email', creds.email)
  await page.fill('#password', creds.password)
  await page.click('button[type="submit"]')
  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10_000 })
}

/**
 * Log out — navigates to the login page and clears cookies.
 */
export async function logout(page: Page): Promise<void> {
  await page.context().clearCookies()
  await page.goto('/login')
}
