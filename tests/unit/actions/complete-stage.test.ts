// @vitest-environment node
/**
 * tests/unit/actions/complete-stage.test.ts
 *
 * T028 — US4 (Decision Stage) / US2 (PASS)
 * Unit tests for completeStage() Server Action.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/env', () => ({
  env: { FEATURE_MULTI_STAGE_REVIEW_ENABLED: 'true' },
}))
vi.mock('@/lib/db', () => ({
  db: {
    ideaStageProgress: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { completeStage } from '@/lib/actions/complete-stage'
import { db } from '@/lib/db'
import { auth } from '@/auth'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as ReturnType<typeof vi.fn> & typeof db

const ACTOR_ID = 'admin-actor-1'
const PROGRESS_ID = 'clxxxxxxxxxxxxxxxxxxxxx3'
const IDEA_ID = 'clxxxxxxxxxxxxxxxxxxxxx1'
const VALID_COMMENT = 'This is a valid comment meeting the minimum length requirement.'

function mockAdminSession() {
  mockAuth.mockResolvedValue({ user: { id: ACTOR_ID, role: 'ADMIN' } })
}

function mockNonDecisionStageProgress(overrides: Record<string, unknown> = {}) {
  ;(mockDb.ideaStageProgress.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: PROGRESS_ID,
    reviewerId: ACTOR_ID,
    startedAt: new Date(),
    completedAt: null,
    stage: {
      id: 'stage-1',
      order: 1,
      isDecisionStage: false,
      pipelineId: 'pipeline-1',
      pipeline: {
        stages: [
          { id: 'stage-1', order: 1, isDecisionStage: false },
          { id: 'stage-2', order: 2, isDecisionStage: true },
        ],
      },
    },
    idea: { id: IDEA_ID, status: 'UNDER_REVIEW' },
    ...overrides,
  })
}

function mockDecisionStageProgress() {
  ;(mockDb.ideaStageProgress.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: PROGRESS_ID,
    reviewerId: ACTOR_ID,
    startedAt: new Date(),
    completedAt: null,
    stage: {
      id: 'stage-2',
      order: 2,
      isDecisionStage: true,
      pipelineId: 'pipeline-1',
      pipeline: {
        stages: [
          { id: 'stage-1', order: 1, isDecisionStage: false },
          { id: 'stage-2', order: 2, isDecisionStage: true },
        ],
      },
    },
    idea: { id: IDEA_ID, status: 'UNDER_REVIEW' },
  })
}

function mockTransaction() {
  const tx = {
    ideaStageProgress: {
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({}),
    },
    idea: { update: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  }
  ;(mockDb.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: unknown) => Promise<unknown>) => fn(tx)
  )
  return tx
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(mockDb.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof db) => Promise<unknown>) => fn(db)
  )
})

describe('completeStage()', () => {
  it('returns success for PASS on non-decision stage', async () => {
    mockAdminSession()
    mockNonDecisionStageProgress()
    mockTransaction()

    const result = await completeStage(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toEqual({ success: true })
  })

  it('returns INVALID_OUTCOME for PASS on decision stage', async () => {
    mockAdminSession()
    mockDecisionStageProgress()

    const result = await completeStage(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'INVALID_OUTCOME' })
  })

  it('returns INVALID_OUTCOME for ACCEPTED on non-decision stage', async () => {
    mockAdminSession()
    mockNonDecisionStageProgress()

    const result = await completeStage(PROGRESS_ID, 'ACCEPTED', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'INVALID_OUTCOME' })
  })

  it('returns success for ACCEPTED on decision stage', async () => {
    mockAdminSession()
    mockDecisionStageProgress()
    mockTransaction()

    const result = await completeStage(PROGRESS_ID, 'ACCEPTED', VALID_COMMENT)

    expect(result).toEqual({ success: true })
  })

  it('returns success for REJECTED on decision stage', async () => {
    mockAdminSession()
    mockDecisionStageProgress()
    mockTransaction()

    const result = await completeStage(PROGRESS_ID, 'REJECTED', VALID_COMMENT)

    expect(result).toEqual({ success: true })
  })

  it('returns FORBIDDEN when actor is not the claimer', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'different-admin', role: 'ADMIN' } })
    mockNonDecisionStageProgress({ reviewerId: ACTOR_ID }) // reviewer is ACTOR_ID, not different-admin

    const result = await completeStage(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'FORBIDDEN' })
  })

  it('returns ALREADY_COMPLETED when completedAt is set', async () => {
    mockAdminSession()
    mockNonDecisionStageProgress({ completedAt: new Date() })

    const result = await completeStage(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'ALREADY_COMPLETED' })
  })

  it('returns VALIDATION_ERROR for comment shorter than 10 chars', async () => {
    mockAdminSession()
    mockNonDecisionStageProgress()

    const result = await completeStage(PROGRESS_ID, 'PASS', 'short')

    expect(result).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('returns PROGRESS_NOT_FOUND when progress row does not exist', async () => {
    mockAdminSession()
    ;(mockDb.ideaStageProgress.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await completeStage(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'PROGRESS_NOT_FOUND' })
  })

  it('returns success for ESCALATE on non-decision stage', async () => {
    mockAdminSession()
    mockNonDecisionStageProgress()
    mockTransaction()

    const result = await completeStage(PROGRESS_ID, 'ESCALATE', VALID_COMMENT)

    expect(result).toEqual({ success: true })
  })
})
