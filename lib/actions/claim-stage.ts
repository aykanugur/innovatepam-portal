'use server'

/**
 * lib/actions/claim-stage.ts
 *
 * EPIC-V2-04 — Multi-Stage Review Pipeline
 * Server Action: claimStage(ideaId)
 *
 * Creates IdeaStageProgress rows for ALL stages atomically when an admin
 * starts a multi-stage review. Only fires when FEATURE_MULTI_STAGE_REVIEW_ENABLED=true.
 *
 * T020: claimStage business logic
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { ClaimStageSchema } from '@/lib/validations/pipeline'

type ClaimStageErrorCode =
  | 'FEATURE_DISABLED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'IDEA_NOT_FOUND'
  | 'INVALID_STATUS'
  | 'PIPELINE_NOT_FOUND'
  | 'ALREADY_CLAIMED'
  | 'INTERNAL_ERROR'

interface ClaimStageSuccess {
  stageProgressId: string
}

interface ClaimStageError {
  error: string
  code: ClaimStageErrorCode
}

export async function claimStage(ideaId: string): Promise<ClaimStageSuccess | ClaimStageError> {
  // ── Feature flag ───────────────────────────────────────────────────────────
  if (env.FEATURE_MULTI_STAGE_REVIEW_ENABLED !== 'true') {
    return { error: 'Multi-stage review is not enabled.', code: 'FEATURE_DISABLED' }
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const parsed = ClaimStageSchema.safeParse({ ideaId })
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' }
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated.', code: 'UNAUTHENTICATED' }
  }
  const { id: actorId, role } = session.user
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return { error: 'Only ADMIN or SUPERADMIN can claim a review stage.', code: 'FORBIDDEN' }
  }

  try {
    // ── Pre-condition: idea exists and is SUBMITTED ─────────────────────────
    const idea = await db.idea.findUnique({
      where: { id: ideaId },
      select: { id: true, status: true, category: true },
    })
    if (!idea) return { error: 'Idea not found.', code: 'IDEA_NOT_FOUND' }
    if (idea.status !== 'SUBMITTED') {
      return {
        error: `Idea is not in SUBMITTED status (current: ${idea.status}).`,
        code: 'INVALID_STATUS',
      }
    }

    // ── Pre-condition: pipeline exists for category ─────────────────────────
    const pipeline = await db.reviewPipeline.findUnique({
      where: { categorySlug: idea.category ?? '__none__' },
      include: { stages: { orderBy: { order: 'asc' } } },
    })
    if (!pipeline || pipeline.stages.length === 0) {
      return {
        error: `No review pipeline configured for category "${idea.category}".`,
        code: 'PIPELINE_NOT_FOUND',
      }
    }

    // ── Pre-condition: not already claimed ─────────────────────────────────
    const existing = await db.ideaStageProgress.findFirst({ where: { ideaId } })
    if (existing) {
      return { error: 'This idea is already in multi-stage review.', code: 'ALREADY_CLAIMED' }
    }

    // ── Transaction: create all stage progress rows atomically ─────────────
    const stage1 = pipeline.stages[0]
    let stage1ProgressId = ''

    await db.$transaction(async (tx) => {
      const now = new Date()

      // Create IdeaStageProgress row for every stage
      for (const stage of pipeline.stages) {
        const isFirstStage = stage.order === 1
        const progress = await tx.ideaStageProgress.create({
          data: {
            ideaId,
            stageId: stage.id,
            reviewerId: isFirstStage ? actorId : null,
            startedAt: isFirstStage ? now : null,
          },
        })
        if (isFirstStage) stage1ProgressId = progress.id
      }

      // Update idea status → UNDER_REVIEW
      await tx.idea.update({
        where: { id: ideaId },
        data: { status: 'UNDER_REVIEW' },
      })

      // Audit: STAGE_STARTED
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'STAGE_STARTED',
          targetId: ideaId,
          metadata: {
            stageId: stage1.id,
            stageName: stage1.name,
            pipelineId: pipeline.id,
          },
        },
      })

      // Audit: IDEA_REVIEW_STARTED
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'IDEA_REVIEW_STARTED',
          targetId: ideaId,
          metadata: { via: 'multi-stage-review', pipelineId: pipeline.id },
        },
      })
    })

    revalidatePath('/admin/review')
    revalidatePath(`/ideas/${ideaId}`)

    return { stageProgressId: stage1ProgressId }
  } catch {
    return { error: 'Failed to claim review stage.', code: 'INTERNAL_ERROR' }
  }
}
