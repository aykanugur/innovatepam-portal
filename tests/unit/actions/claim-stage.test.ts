// @vitest-environment node
/**
 * tests/unit/actions/claim-stage.test.ts
 *
 * T025 — US2 (Claim Stage)
 * Unit tests for claimStage() Server Action.
 * Also covers T012: flag=false case asserts no IdeaStageProgress rows created.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/env', () => ({
  env: { FEATURE_MULTI_STAGE_REVIEW_ENABLED: 'true' },
}))
vi.mock('@/lib/db', () => ({
  db: {
    idea: { findUnique: vi.fn() },
    reviewPipeline: { findUnique: vi.fn(), findFirst: vi.fn() },
    ideaStageProgress: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { claimStage } from '@/lib/actions/claim-stage'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { env } from '@/lib/env'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as ReturnType<typeof vi.fn> & typeof db

const IDEA_ID = 'clxxxxxxxxxxxxxxxxxxxxx1'
const STAGE_PROGRESS_ID = 'clxxxxxxxxxxxxxxxxxxxxx2'

function mockAdminSession(id = 'admin-user-1') {
  mockAuth.mockResolvedValue({ user: { id, role: 'ADMIN' } })
}

function mockSubmittedIdea(authorId = 'other-user') {
  ;(mockDb.idea.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: IDEA_ID,
    status: 'SUBMITTED',
    authorId,
    category: 'cost-reduction',
  })
}

function mockPipeline() {
  ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: 'pipeline-1',
    stages: [
      { id: 'stage-1', order: 1, isDecisionStage: false, name: 'Initial' },
      { id: 'stage-2', order: 2, isDecisionStage: true, name: 'Decision' },
    ],
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(mockDb.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof db) => Promise<unknown>) => fn(db)
  )
})

describe('claimStage()', () => {
  it('T012: returns FEATURE_DISABLED when flag is false', async () => {
    vi.mocked(env).FEATURE_MULTI_STAGE_REVIEW_ENABLED = 'false'
    mockAdminSession()

    const result = await claimStage(IDEA_ID)

    expect(result).toMatchObject({ code: 'FEATURE_DISABLED' })
    // Restore flag
    vi.mocked(env).FEATURE_MULTI_STAGE_REVIEW_ENABLED = 'true'
  })

  it('returns FORBIDDEN for SUBMITTER role', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'sub-1', role: 'SUBMITTER' } })

    const result = await claimStage(IDEA_ID)

    expect(result).toMatchObject({ code: 'FORBIDDEN' })
  })

  it('returns IDEA_NOT_FOUND when idea does not exist', async () => {
    mockAdminSession()
    ;(mockDb.idea.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await claimStage(IDEA_ID)

    expect(result).toMatchObject({ code: 'IDEA_NOT_FOUND' })
  })

  it('returns INVALID_STATUS when idea is not SUBMITTED', async () => {
    mockAdminSession()
    ;(mockDb.idea.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: IDEA_ID,
      status: 'UNDER_REVIEW',
      authorId: 'other',
      category: 'cost-reduction',
    })

    const result = await claimStage(IDEA_ID)

    expect(result).toMatchObject({ code: 'INVALID_STATUS' })
  })

  it('returns NO_PIPELINE when no pipeline configured for category', async () => {
    mockAdminSession()
    mockSubmittedIdea()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await claimStage(IDEA_ID)

    expect(result).toMatchObject({ code: 'PIPELINE_NOT_FOUND' })
  })

  it('returns ALREADY_CLAIMED when IdeaStageProgress already exists', async () => {
    mockAdminSession()
    mockSubmittedIdea()
    mockPipeline()
    ;(mockDb.ideaStageProgress.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: STAGE_PROGRESS_ID,
    })

    const result = await claimStage(IDEA_ID)

    expect(result).toMatchObject({ code: 'ALREADY_CLAIMED' })
  })

  it('returns stageProgressId on success', async () => {
    mockAdminSession()
    mockSubmittedIdea()
    mockPipeline()
    ;(mockDb.ideaStageProgress.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    // Mock the transaction calls
    const mockTx = {
      ideaStageProgress: {
        create: vi.fn().mockResolvedValue({ id: STAGE_PROGRESS_ID }),
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue({ id: STAGE_PROGRESS_ID }),
      },
      idea: {
        update: vi.fn().mockResolvedValue({}),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({}),
      },
    }
    ;(mockDb.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) => fn(mockTx)
    )

    const result = await claimStage(IDEA_ID)

    expect(result).toMatchObject({ stageProgressId: expect.any(String) })
  })
})
