/**
 * tests/e2e/helpers/seed.ts — T025
 *
 * Shared Playwright API helpers for E2E seed/cleanup.
 * Uses Playwright's APIRequestContext to call /api/test/seed and /api/test/cleanup.
 *
 * Pattern: each test gets a unique runId, calls seedTestData() in beforeEach,
 * and cleanupTestData() in afterEach to ensure DB isolation.
 */

import type { APIRequestContext } from '@playwright/test'

export interface SeedResult {
  adminEmail: string
  adminPassword: string
  submitterEmail: string
  submitterPassword: string
  ideaId: string
}

/**
 * Seed a minimal test dataset for a given runId.
 * Returns credentials for the seeded admin/submitter users and the seed ideaId.
 */
export async function seedTestData(request: APIRequestContext, runId: string): Promise<SeedResult> {
  const response = await request.post('/api/test/seed', {
    data: { runId },
  })

  if (!response.ok()) {
    const body = await response.text()
    throw new Error(`Seed failed (${response.status()}): ${body}`)
  }

  return response.json() as Promise<SeedResult>
}

/**
 * Clean up all test data seeded for a given runId.
 * Call in afterEach to prevent DB pollution between tests.
 */
export async function cleanupTestData(request: APIRequestContext, runId: string): Promise<void> {
  const response = await request.post('/api/test/cleanup', {
    data: { runId },
  })

  if (!response.ok()) {
    console.warn(`[e2e/cleanup] Cleanup failed for runId=${runId}: ${response.status()}`)
  }
}
