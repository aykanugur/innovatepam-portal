// @vitest-environment node
/**
 * tests/unit/actions/resolve-escalation.test.ts
 *
 * T034 — US3 (Escalation)
 * Unit tests for resolveEscalation() Server Action.
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
    },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { resolveEscalation } from '@/lib/actions/resolve-escalation'
import { db } from '@/lib/db'
import { auth } from '@/auth'

const mockAuth = auth as ReturnType<typeof vi.fn>
const mockDb = db as ReturnType<typeof vi.fn> & typeof db

const PROGRESS_ID = 'clxxxxxxxxxxxxxxxxxxxxx5'
const IDEA_ID = 'clxxxxxxxxxxxxxxxxxxxxx1'
const VALID_COMMENT = 'SUPERADMIN resolution comment meeting minimum length.'

function mockSuperAdminSession() {
  mockAuth.mockResolvedValue({ user: { id: 'superadmin-1', role: 'SUPERADMIN' } })
}

function mockEscalatedProgress(hasNextStage = true) {
  const stages = hasNextStage
    ? [
        { id: 'stage-1', order: 1, isDecisionStage: false },
        { id: 'stage-2', order: 2, isDecisionStage: true },
      ]
    : [{ id: 'stage-1', order: 1, isDecisionStage: true }]

  ;(mockDb.ideaStageProgress.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: PROGRESS_ID,
    outcome: 'ESCALATE',
    completedAt: new Date(),
    stage: {
      id: 'stage-1',
      order: 1,
      pipelineId: 'pipeline-1',
      pipeline: { stages },
    },
    idea: { id: IDEA_ID, status: 'UNDER_REVIEW' },
  })
}

function mockTransaction() {
  const tx = {
    ideaStageProgress: {
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

describe('resolveEscalation()', () => {
  it('returns FORBIDDEN for non-SUPERADMIN (ADMIN role)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })

    const result = await resolveEscalation(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'FORBIDDEN' })
  })

  it('returns PROGRESS_NOT_FOUND when progress does not exist', async () => {
    mockSuperAdminSession()
    ;(mockDb.ideaStageProgress.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await resolveEscalation(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'PROGRESS_NOT_FOUND' })
  })

  it('returns NOT_ESCALATED when progress outcome is not ESCALATE', async () => {
    mockSuperAdminSession()
    ;(mockDb.ideaStageProgress.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PROGRESS_ID,
      outcome: 'PASS',
      completedAt: new Date(),
      stage: {
        id: 'stage-1',
        order: 1,
        pipelineId: 'pipeline-1',
        pipeline: { stages: [{ id: 'stage-1', order: 1 }] },
      },
      idea: { id: IDEA_ID, status: 'UNDER_REVIEW' },
    })

    const result = await resolveEscalation(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'NOT_ESCALATED' })
  })

  it('returns STAGE_INCOMPLETE when completedAt is null (no formal record)', async () => {
    mockSuperAdminSession()
    ;(mockDb.ideaStageProgress.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PROGRESS_ID,
      outcome: 'ESCALATE',
      completedAt: null, // no formal completion
      stage: {
        id: 'stage-1',
        order: 1,
        pipelineId: 'pipeline-1',
        pipeline: { stages: [{ id: 'stage-1', order: 1 }] },
      },
      idea: { id: IDEA_ID, status: 'UNDER_REVIEW' },
    })

    const result = await resolveEscalation(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'STAGE_INCOMPLETE' })
  })

  it('returns INVALID_STATUS when idea is no longer UNDER_REVIEW', async () => {
    mockSuperAdminSession()
    ;(mockDb.ideaStageProgress.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PROGRESS_ID,
      outcome: 'ESCALATE',
      completedAt: new Date(),
      stage: {
        id: 'stage-1',
        order: 1,
        pipelineId: 'pipeline-1',
        pipeline: { stages: [{ id: 'stage-1', order: 1 }] },
      },
      idea: { id: IDEA_ID, status: 'REJECTED' }, // already decided
    })

    const result = await resolveEscalation(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toMatchObject({ code: 'INVALID_STATUS' })
  })

  it('returns success for SUPERADMIN PASS (with next stage)', async () => {
    mockSuperAdminSession()
    mockEscalatedProgress(true)
    mockTransaction()

    const result = await resolveEscalation(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toEqual({ success: true })
  })

  it('returns success for PASS on last stage (no next stage → ACCEPTED)', async () => {
    mockSuperAdminSession()
    // Only 1 stage (the decision stage), no next stage
    ;(mockDb.ideaStageProgress.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PROGRESS_ID,
      outcome: 'ESCALATE',
      completedAt: new Date(),
      stage: {
        id: 'stage-1',
        order: 1,
        pipelineId: 'pipeline-1',
        pipeline: { stages: [{ id: 'stage-1', order: 1, isDecisionStage: true }] },
      },
      idea: { id: IDEA_ID, status: 'UNDER_REVIEW' },
    })
    mockTransaction()

    const result = await resolveEscalation(PROGRESS_ID, 'PASS', VALID_COMMENT)

    expect(result).toEqual({ success: true })
  })

  it('returns success for REJECT resolution', async () => {
    mockSuperAdminSession()
    mockEscalatedProgress(true)
    mockTransaction()

    const result = await resolveEscalation(PROGRESS_ID, 'REJECT', VALID_COMMENT)

    expect(result).toEqual({ success: true })
  })
})
