// @vitest-environment node
// Integration test for US-012 Evaluation Workflow server actions.
// Requires DATABASE_URL_TEST env var pointing to a separate test database.
// All tests seed their own data with a unique runId prefix and clean up in afterEach.

import { describe, it, expect, afterEach, afterAll, vi } from 'vitest'

// Mock auth() globally so server actions can be imported in Node test environment
// The server actions accept direct reviewerId/superadminId args for test use
vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue(null), // tests use direct id overrides
}))
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Use the pre-configured db singleton which handles adapter + connection
import { db as testDb } from '@/lib/db'

// These imports succeed after T012/T013/T014 implementation (GREEN phase)
import { startReviewAction } from '@/lib/actions/start-review'
import { finalizeReviewAction } from '@/lib/actions/finalize-review'
import { abandonReviewAction } from '@/lib/actions/abandon-review'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const RUN_ID = `integration-${Date.now()}`
const titlePrefix = (name: string) => `[test:${RUN_ID}] ${name}`

async function seedSubmitterAndIdea(suffix: string) {
  const email = `submitter-${suffix}-${RUN_ID}@test.local`
  const user = await testDb.user.create({
    data: {
      email,
      passwordHash: 'hashed',
      displayName: `Test Submitter ${suffix}`,
      role: 'SUBMITTER',
    },
  })
  const idea = await testDb.idea.create({
    data: {
      title: titlePrefix(`Idea ${suffix}`),
      description: 'Integration test idea description.',
      category: 'Tech',
      authorId: user.id,
    },
  })
  return { user, idea }
}

async function seedAdmin(suffix: string, role: 'ADMIN' | 'SUPERADMIN' = 'ADMIN') {
  const email = `admin-${suffix}-${RUN_ID}@test.local`
  return testDb.user.create({
    data: {
      email,
      passwordHash: 'hashed',
      displayName: `Test Admin ${suffix}`,
      role,
    },
  })
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

afterEach(async () => {
  // Delete all seeded rows by run prefix — no pollution of test database
  const ideas = await testDb.idea.findMany({
    where: { title: { startsWith: `[test:${RUN_ID}]` } },
    select: { id: true },
  })
  const ideaIds = ideas.map((i) => i.id)

  await testDb.auditLog.deleteMany({ where: { targetId: { in: ideaIds } } })
  await testDb.ideaReview.deleteMany({ where: { ideaId: { in: ideaIds } } })
  await testDb.idea.deleteMany({ where: { id: { in: ideaIds } } })
  await testDb.user.deleteMany({
    where: { email: { endsWith: `${RUN_ID}@test.local` } },
  })
})

afterAll(async () => {
  // No need to disconnect - shared singleton managed by lib/db.ts
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('US-012 Evaluation Workflow — integration', () => {
  // (a) startReviewAction — US-012 AC-1, FR-004, FR-028
  it('startReviewAction: creates IdeaReview row + sets UNDER_REVIEW + writes IDEA_REVIEW_STARTED audit log', async () => {
    const { idea } = await seedSubmitterAndIdea('start')
    const admin = await seedAdmin('start-admin', 'ADMIN')

    const result = await startReviewAction({ ideaId: idea.id, reviewerId: admin.id })
    expect(result.success).toBe(true)

    const updatedIdea = await testDb.idea.findUniqueOrThrow({ where: { id: idea.id } })
    expect(updatedIdea.status).toBe('UNDER_REVIEW')

    const review = await testDb.ideaReview.findUniqueOrThrow({ where: { ideaId: idea.id } })
    expect(review.decision).toBeNull()
    expect(review.comment).toBeNull()
    expect(review.reviewerId).toBe(admin.id)
    expect(review.startedAt).toBeDefined()

    const audit = await testDb.auditLog.findFirst({
      where: { targetId: idea.id, action: 'IDEA_REVIEW_STARTED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit).not.toBeNull()
    expect(audit?.actorId).toBe(admin.id)
  })

  // (b) finalizeReviewAction with ACCEPTED — US-012 AC-3, FR-006
  it('finalizeReviewAction(ACCEPTED): sets decision + decidedAt + ACCEPTED status + IDEA_REVIEWED audit', async () => {
    const { idea } = await seedSubmitterAndIdea('finalize-accept')
    const admin = await seedAdmin('finalize-accept-admin', 'ADMIN')

    // First start the review
    await startReviewAction({ ideaId: idea.id, reviewerId: admin.id })

    const comment = 'This is an excellent well-researched idea.'
    const result = await finalizeReviewAction({
      ideaId: idea.id,
      decision: 'ACCEPTED',
      comment,
      reviewerId: admin.id,
    })
    expect(result.success).toBe(true)

    const updatedIdea = await testDb.idea.findUniqueOrThrow({ where: { id: idea.id } })
    expect(updatedIdea.status).toBe('ACCEPTED')

    const review = await testDb.ideaReview.findUniqueOrThrow({ where: { ideaId: idea.id } })
    expect(review.decision).toBe('ACCEPTED')
    expect(review.comment).toBe(comment)
    expect(review.decidedAt).toBeDefined()

    const audit = await testDb.auditLog.findFirst({
      where: { targetId: idea.id, action: 'IDEA_REVIEWED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit).not.toBeNull()
    // metadata.commentSummary should be first 100 chars
    const meta = audit?.metadata as Record<string, unknown> | null
    expect(meta?.decision).toBe('ACCEPTED')
    expect(typeof meta?.commentSummary).toBe('string')
  })

  // (c) abandonReviewAction — FR-030
  it('abandonReviewAction: deletes IdeaReview + resets to SUBMITTED + writes IDEA_REVIEW_ABANDONED audit', async () => {
    const { idea } = await seedSubmitterAndIdea('abandon')
    const admin = await seedAdmin('abandon-admin', 'ADMIN')
    const superadmin = await seedAdmin('abandon-superadmin', 'SUPERADMIN')

    await startReviewAction({ ideaId: idea.id, reviewerId: admin.id })

    const result = await abandonReviewAction({ ideaId: idea.id, superadminId: superadmin.id })
    expect(result.success).toBe(true)

    const updatedIdea = await testDb.idea.findUniqueOrThrow({ where: { id: idea.id } })
    expect(updatedIdea.status).toBe('SUBMITTED')

    const review = await testDb.ideaReview.findUnique({ where: { ideaId: idea.id } })
    expect(review).toBeNull()

    const audit = await testDb.auditLog.findFirst({
      where: { targetId: idea.id, action: 'IDEA_REVIEW_ABANDONED' },
      orderBy: { createdAt: 'desc' },
    })
    expect(audit).not.toBeNull()
    expect(audit?.actorId).toBe(superadmin.id)
  })

  // (d) Concurrency guard — Edge Cases in spec
  it('concurrent startReviewAction calls on same ideaId: second call throws ALREADY_UNDER_REVIEW', async () => {
    const { idea } = await seedSubmitterAndIdea('concurrent')
    const admin1 = await seedAdmin('concurrent-admin1', 'ADMIN')
    const admin2 = await seedAdmin('concurrent-admin2', 'ADMIN')

    // First start succeeds
    const result1 = await startReviewAction({ ideaId: idea.id, reviewerId: admin1.id })
    expect(result1.success).toBe(true)

    // Second start on same idea should fail
    const result2 = await startReviewAction({ ideaId: idea.id, reviewerId: admin2.id })
    expect(result2.success).toBe(false)
    expect(result2.error).toBe('ALREADY_UNDER_REVIEW')
  })
})
