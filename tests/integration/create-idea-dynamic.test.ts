// @vitest-environment node
/**
 * T013 — Integration tests for createIdeaAction with Smart Forms (dynamic fields).
 * Verifies FR-002, FR-005, FR-006, FR-010, FR-012, FR-013, FR-016, FR-018.
 *
 * Seeds its own user + CategoryFieldTemplate rows using a unique RUN_ID prefix.
 * Cleans up in afterEach to avoid test pollution.
 */

import { describe, it, expect, afterEach, afterAll, vi } from 'vitest'

// ─── Hoist mocks (must come before any subject imports) ───────────────────────

// auth() returns a synthetic session; each test overrides with the seeded user's id
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: '__placeholder__' } }),
}))

// Never hit the actual rate-limit store (Upstash) in integration tests
vi.mock('@/lib/rate-limit', () => ({
  ideaSubmitRateLimiter: {
    limit: vi.fn().mockResolvedValue({ success: true, reset: Date.now() + 60_000 }),
  },
}))

// Prevent server-action revalidation side-effects in tests
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// ─── Subject and DB imports (after mocks) ─────────────────────────────────────

import { db as testDb } from '@/lib/db'
import { createIdeaAction } from '@/lib/actions/create-idea'
import { auth } from '@/auth'

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const RUN_ID = `create-idea-dynamic-${Date.now()}`
const emailOf = (suffix: string) => `${suffix}-${RUN_ID}@test.local`

/**
 * Minimal template: one required text field, one optional number field.
 * Stored in the DB so createIdeaAction can fetch it via findUnique.
 */
const TEST_TEMPLATE_FIELDS = [
  {
    id: 'target_market',
    label: 'Target market or audience',
    type: 'text',
    required: true,
  },
  {
    id: 'time_saved',
    label: 'Estimated time saved (hours/week)',
    type: 'number',
    required: false,
  },
]

const TEST_CATEGORY = `test-${RUN_ID}` // unique slug per run → no cross-test pollution

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function seedUser(suffix: string) {
  return testDb.user.create({
    data: {
      email: emailOf(suffix),
      passwordHash: 'hashed',
      displayName: `Test User ${suffix}`,
      role: 'SUBMITTER',
    },
  })
}

async function seedTemplate() {
  return testDb.categoryFieldTemplate.upsert({
    where: { category: TEST_CATEGORY },
    update: { fields: TEST_TEMPLATE_FIELDS, version: 1 },
    create: { category: TEST_CATEGORY, fields: TEST_TEMPLATE_FIELDS, version: 1 },
  })
}

/**
 * Build a minimal valid FormData for the base idea fields.
 * dynamicFieldsJson is added separately per test.
 */
function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('title', overrides.title ?? `[test:${RUN_ID}] Smart forms idea`)
  fd.set('description', overrides.description ?? 'A test idea description with enough detail.')
  fd.set('category', overrides.category ?? TEST_CATEGORY)
  fd.set('visibility', overrides.visibility ?? 'PUBLIC')
  return fd
}

function configureAuthMock(userId: string) {
  const fakeSession = {
    user: { id: userId, email: emailOf('u'), name: 'Test User', role: 'SUBMITTER' },
    expires: new Date(Date.now() + 3_600_000).toISOString(),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vi.mocked(auth).mockResolvedValueOnce(fakeSession as any)
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

afterEach(async () => {
  const ideas = await testDb.idea.findMany({
    where: { title: { contains: RUN_ID } },
    select: { id: true },
  })
  const ideaIds = ideas.map((i) => i.id)

  await testDb.auditLog.deleteMany({ where: { targetId: { in: ideaIds } } })
  await testDb.idea.deleteMany({ where: { id: { in: ideaIds } } })
  await testDb.user.deleteMany({ where: { email: { contains: RUN_ID } } })
  await testDb.categoryFieldTemplate.deleteMany({ where: { category: TEST_CATEGORY } })
})

afterAll(() => {
  // Shared singleton - no explicit disconnect needed
})

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('createIdeaAction — dynamic fields (Smart Forms)', () => {
  // ── FR-010: flag OFF → dynamic fields ignored, dynamicFields = null ─────────

  it('flag OFF: ignores dynamicFields payload and stores null (FR-010)', async () => {
    const savedFlag = process.env.FEATURE_SMART_FORMS_ENABLED
    process.env.FEATURE_SMART_FORMS_ENABLED = 'false'

    try {
      const user = await seedUser('flag-off')
      configureAuthMock(user.id)

      const fd = makeFormData()
      fd.set('dynamicFields', JSON.stringify({ target_market: 'Enterprise' }))

      const result = await createIdeaAction(fd)
      expect(result.id).toBeTruthy()

      const idea = await testDb.idea.findUniqueOrThrow({ where: { id: result.id! } })
      expect(idea.dynamicFields).toBeNull()
    } finally {
      process.env.FEATURE_SMART_FORMS_ENABLED = savedFlag ?? 'false'
    }
  })

  // ── FR-005: flag ON, required field blank → error returned ──────────────────

  it('flag ON: returns error when required text field is empty (FR-005)', async () => {
    const savedFlag = process.env.FEATURE_SMART_FORMS_ENABLED
    process.env.FEATURE_SMART_FORMS_ENABLED = 'true'

    try {
      const user = await seedUser('req-blank')
      await seedTemplate()
      configureAuthMock(user.id)

      const fd = makeFormData()
      // Provide empty string for required target_market
      fd.set('dynamicFields', JSON.stringify({ target_market: '', time_saved: '' }))

      const result = await createIdeaAction(fd)
      expect(result.error).toBeTruthy()
      expect(result.id).toBeUndefined()
      // Must mention the field label in the error message
      expect(result.error).toMatch(/target market or audience/i)
    } finally {
      process.env.FEATURE_SMART_FORMS_ENABLED = savedFlag ?? 'false'
    }
  })

  // ── FR-002 + FR-012: flag ON, valid payload → idea stored with dynamicFields + audit ──

  it('flag ON: stores validated dynamicFields in Idea + audit log on success (FR-002, FR-012)', async () => {
    const savedFlag = process.env.FEATURE_SMART_FORMS_ENABLED
    process.env.FEATURE_SMART_FORMS_ENABLED = 'true'

    try {
      const user = await seedUser('valid')
      await seedTemplate()
      configureAuthMock(user.id)

      const fd = makeFormData()
      fd.set(
        'dynamicFields',
        JSON.stringify({ target_market: 'Enterprise teams', time_saved: '5' })
      )

      const result = await createIdeaAction(fd)
      expect(result.id).toBeTruthy()

      const idea = await testDb.idea.findUniqueOrThrow({ where: { id: result.id! } })
      // dynamicFields persisted with validated values
      expect(idea.dynamicFields).toMatchObject({
        target_market: 'Enterprise teams',
        time_saved: 5, // coerced to number by Zod
      })

      // Audit log includes dynamicFields in metadata (FR-012)
      const audit = await testDb.auditLog.findFirst({
        where: { targetId: idea.id, action: 'IDEA_CREATED' },
      })
      expect(audit).not.toBeNull()
      const metadata = audit!.metadata as Record<string, unknown>
      expect(metadata.dynamicFields).toMatchObject({
        target_market: 'Enterprise teams',
        time_saved: 5,
      })
    } finally {
      process.env.FEATURE_SMART_FORMS_ENABLED = savedFlag ?? 'false'
    }
  })

  // ── FR-018: unknown keys are stripped (not stored) ──────────────────────────

  it('flag ON: strips unknown keys from dynamicFields payload (FR-018)', async () => {
    const savedFlag = process.env.FEATURE_SMART_FORMS_ENABLED
    process.env.FEATURE_SMART_FORMS_ENABLED = 'true'

    try {
      const user = await seedUser('strip-keys')
      await seedTemplate()
      configureAuthMock(user.id)

      const fd = makeFormData()
      fd.set(
        'dynamicFields',
        JSON.stringify({
          target_market: 'SMBs',
          __proto__: 'attack',
          unknown_field: 'should be stripped',
        })
      )

      const result = await createIdeaAction(fd)
      expect(result.id).toBeTruthy()

      const idea = await testDb.idea.findUniqueOrThrow({ where: { id: result.id! } })
      const stored = idea.dynamicFields as Record<string, unknown>
      expect(stored).not.toHaveProperty('unknown_field')
      expect(stored).not.toHaveProperty('__proto__')
      expect(stored.target_market).toBe('SMBs')
    } finally {
      process.env.FEATURE_SMART_FORMS_ENABLED = savedFlag ?? 'false'
    }
  })

  // ── FR-006: number field with non-numeric string → error ────────────────────

  it('flag ON: returns error when number field receives non-numeric string (FR-006)', async () => {
    const savedFlag = process.env.FEATURE_SMART_FORMS_ENABLED
    process.env.FEATURE_SMART_FORMS_ENABLED = 'true'

    try {
      const user = await seedUser('bad-number')
      await seedTemplate()
      configureAuthMock(user.id)

      const fd = makeFormData()
      fd.set(
        'dynamicFields',
        JSON.stringify({ target_market: 'Startups', time_saved: 'not-a-number' })
      )

      const result = await createIdeaAction(fd)
      expect(result.error).toBeTruthy()
      expect(result.id).toBeUndefined()
      // Must reference the field label
      expect(result.error).toMatch(/estimated time saved/i)
    } finally {
      process.env.FEATURE_SMART_FORMS_ENABLED = savedFlag ?? 'false'
    }
  })

  // ── Edge case: flag ON, no dynamicFields in FormData → null stored ───────────

  it('flag ON: stores null when FormData has no dynamicFields key', async () => {
    const savedFlag = process.env.FEATURE_SMART_FORMS_ENABLED
    process.env.FEATURE_SMART_FORMS_ENABLED = 'true'

    try {
      const user = await seedUser('no-dynamic-key')
      await seedTemplate()
      configureAuthMock(user.id)

      const fd = makeFormData()
      // No fd.set('dynamicFields', ...) — submit without key at all

      const result = await createIdeaAction(fd)
      expect(result.id).toBeTruthy()

      const idea = await testDb.idea.findUniqueOrThrow({ where: { id: result.id! } })
      expect(idea.dynamicFields).toBeNull()
    } finally {
      process.env.FEATURE_SMART_FORMS_ENABLED = savedFlag ?? 'false'
    }
  })
})
