// @vitest-environment node
/**
 * tests/unit/actions/pipeline-crud.test.ts
 *
 * T019 — US1 (Pipeline Config)
 * Unit tests for createPipeline, updatePipeline, deletePipeline Server Actions.
 * Prisma and auth are fully mocked — no DB connection required.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Module mocks (hoisted before imports) ────────────────────────────────────
vi.mock('@/lib/db', () => ({
  db: {
    reviewPipeline: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    reviewPipelineStage: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    ideaStageProgress: {
      count: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/env', () => ({
  env: { FEATURE_MULTI_STAGE_REVIEW_ENABLED: 'true' },
}))

// ── Subject under test ────────────────────────────────────────────────────────
import { createPipeline, updatePipeline, deletePipeline } from '@/lib/actions/pipeline-crud'
import { db } from '@/lib/db'
import { auth } from '@/auth'

const mockDb = db as { [key: string]: ReturnType<typeof vi.fn> } & typeof db
const mockAuth = auth as ReturnType<typeof vi.fn>

// ── Helpers ───────────────────────────────────────────────────────────────────
// Must be valid CUID format (Zod .cuid() validates: starts with 'c', ≥9 alphanumeric chars)
const PIPELINE_DEFAULT_ID = 'cldefaultpipelineid00001'
const PIPELINE_CUSTOM_ID = 'clcustompipelineid000001'
const PIPELINE_UPDATE_ID = 'clupdatepipelineid000001'

const VALID_STAGES = [
  { name: 'Initial Review', order: 1, isDecisionStage: false },
  { name: 'Final Decision', order: 2, isDecisionStage: true },
]

function mockSuperAdminSession() {
  mockAuth.mockResolvedValue({ user: { id: 'superadmin-1', role: 'SUPERADMIN' } })
}

function mockAdminSession() {
  mockAuth.mockResolvedValue({ user: { id: 'admin-1', role: 'ADMIN' } })
}

beforeEach(() => {
  vi.clearAllMocks()
  // Default: $transaction passes through callback
  ;(mockDb.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
    async (fn: (tx: typeof db) => Promise<unknown>) => fn(db)
  )
})

// ── createPipeline ────────────────────────────────────────────────────────────

describe('createPipeline()', () => {
  it('returns pipelineId on success (SUPERADMIN)', async () => {
    mockSuperAdminSession()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)
    ;(mockDb.reviewPipeline.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'pipeline-abc',
    })
    ;(mockDb.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const result = await createPipeline({
      categorySlug: 'cost-reduction',
      name: 'Cost Reduction Pipeline',
      isDefault: false,
      stages: VALID_STAGES,
    })

    expect(result).toEqual({ pipelineId: 'pipeline-abc' })
  })

  it('returns 409 PIPELINE_EXISTS when categorySlug already taken', async () => {
    mockSuperAdminSession()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'existing-pipeline',
    })

    const result = await createPipeline({
      categorySlug: 'cost-reduction',
      name: 'Duplicate',
      isDefault: false,
      stages: VALID_STAGES,
    })

    expect(result).toMatchObject({ code: 'PIPELINE_EXISTS' })
  })

  it('returns VALIDATION_ERROR when 0 decision stages provided', async () => {
    mockSuperAdminSession()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await createPipeline({
      categorySlug: 'cost-reduction',
      name: 'Bad Pipeline',
      isDefault: false,
      stages: [
        { name: 'Stage 1', order: 1, isDecisionStage: false },
        { name: 'Stage 2', order: 2, isDecisionStage: false },
      ],
    })

    expect(result).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('returns VALIDATION_ERROR when 2 decision stages provided', async () => {
    mockSuperAdminSession()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await createPipeline({
      categorySlug: 'cost-reduction',
      name: 'Bad Pipeline',
      isDefault: false,
      stages: [
        { name: 'Stage 1', order: 1, isDecisionStage: true },
        { name: 'Stage 2', order: 2, isDecisionStage: true },
      ],
    })

    expect(result).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('returns FORBIDDEN when called as ADMIN (not SUPERADMIN)', async () => {
    mockAdminSession()

    const result = await createPipeline({
      categorySlug: 'cost-reduction',
      name: 'Pipeline',
      isDefault: false,
      stages: VALID_STAGES,
    })

    expect(result).toMatchObject({ code: 'FORBIDDEN' })
  })
})

// ── deletePipeline ────────────────────────────────────────────────────────────

describe('deletePipeline()', () => {
  it('returns CANNOT_DELETE_DEFAULT when pipeline isDefault=true', async () => {
    mockSuperAdminSession()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PIPELINE_DEFAULT_ID,
      isDefault: true,
    })

    const result = await deletePipeline(PIPELINE_DEFAULT_ID)

    expect(result).toMatchObject({ code: 'CANNOT_DELETE_DEFAULT' })
  })

  it('returns PIPELINE_IN_USE when in-flight IdeaStageProgress exists', async () => {
    mockSuperAdminSession()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PIPELINE_CUSTOM_ID,
      isDefault: false,
      stages: [{ id: 'stage-1' }],
    })
    ;(mockDb.ideaStageProgress.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)

    const result = await deletePipeline(PIPELINE_CUSTOM_ID)

    expect(result).toMatchObject({ code: 'PIPELINE_IN_USE' })
  })

  it('returns success when pipeline can be deleted', async () => {
    mockSuperAdminSession()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PIPELINE_CUSTOM_ID,
      isDefault: false,
      stages: [{ id: 'stage-1' }],
    })
    ;(mockDb.ideaStageProgress.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(mockDb.reviewPipeline.delete as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const result = await deletePipeline(PIPELINE_CUSTOM_ID)

    expect(result).toEqual({ success: true })
  })
})

// ── updatePipeline ────────────────────────────────────────────────────────────

describe('updatePipeline()', () => {
  it('returns STAGE_IN_USE when a removed stage has active progress', async () => {
    mockSuperAdminSession()
    // Valid CUID IDs for stages (starts with 'c', no hyphens)
    const STAGE_A_ID = 'clstagea0000000000000001'
    const STAGE_B_ID = 'clstageb0000000000000001'
    const STAGE_C_ID = 'clstagec0000000000000001'
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PIPELINE_UPDATE_ID,
      stages: [
        { id: STAGE_A_ID, order: 1, isDecisionStage: false },
        { id: STAGE_B_ID, order: 2, isDecisionStage: false },
        { id: STAGE_C_ID, order: 3, isDecisionStage: true },
      ],
    })
    // STAGE_A has in-flight progress
    ;(mockDb.ideaStageProgress.count as ReturnType<typeof vi.fn>).mockResolvedValue(1)

    // Update removes STAGE_A — only keeps STAGE_B and STAGE_C
    const result = await updatePipeline({
      pipelineId: PIPELINE_UPDATE_ID,
      stages: [
        { id: STAGE_B_ID, name: 'Quality Check', order: 1, isDecisionStage: false },
        { id: STAGE_C_ID, name: 'Final Decision', order: 2, isDecisionStage: true },
      ],
    })

    expect(result).toMatchObject({ code: 'STAGE_IN_USE' })
  })

  it('returns PIPELINE_NOT_FOUND when pipeline does not exist', async () => {
    mockSuperAdminSession()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await updatePipeline({
      pipelineId: PIPELINE_UPDATE_ID,
      stages: VALID_STAGES,
    })

    expect(result).toMatchObject({ code: 'PIPELINE_NOT_FOUND' })
  })

  it('returns success when pipeline is updated without removing in-use stages', async () => {
    mockSuperAdminSession()
    const STAGE_B_ID = 'clstageb0000000000000001'
    const STAGE_C_ID = 'clstagec0000000000000001'
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: PIPELINE_UPDATE_ID,
      stages: [
        { id: STAGE_B_ID, order: 1, isDecisionStage: false },
        { id: STAGE_C_ID, order: 2, isDecisionStage: true },
      ],
    })
    ;(mockDb.ideaStageProgress.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)
    ;(mockDb.reviewPipeline.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(mockDb.reviewPipelineStage.deleteMany as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(mockDb.reviewPipelineStage.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(mockDb.reviewPipelineStage.update as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(mockDb.reviewPipelineStage.create as ReturnType<typeof vi.fn>).mockResolvedValue({})
    ;(mockDb.auditLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({})

    const result = await updatePipeline({
      pipelineId: PIPELINE_UPDATE_ID,
      name: 'Updated Pipeline Name',
      stages: [
        { id: STAGE_B_ID, name: 'Initial Review', order: 1, isDecisionStage: false },
        { id: STAGE_C_ID, name: 'Final Decision', order: 2, isDecisionStage: true },
      ],
    })

    expect(result).toEqual({ success: true })
  })
})

// ── deletePipeline extra paths ────────────────────────────────────────────────

describe('deletePipeline() — additional paths', () => {
  it('returns VALIDATION_ERROR when pipelineId is not a valid CUID', async () => {
    mockSuperAdminSession()

    const result = await deletePipeline('not-a-valid-cuid')

    expect(result).toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('returns PIPELINE_NOT_FOUND when pipeline does not exist', async () => {
    mockSuperAdminSession()
    ;(mockDb.reviewPipeline.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const result = await deletePipeline(PIPELINE_CUSTOM_ID)

    expect(result).toMatchObject({ code: 'PIPELINE_NOT_FOUND' })
  })
})
