'use server'

/**
 * lib/actions/complete-stage.ts
 *
 * EPIC-V2-04 — Multi-Stage Review Pipeline
 * Server Action: completeStage(stageProgressId, outcome, comment)
 *
 * The reviewer who claimed the stage records their outcome.
 * PASS → activates the next stage.
 * ESCALATE → surfaces in escalation queue, no next stage activation.
 * ACCEPTED / REJECTED → finalizes the idea (decision stage only).
 *
 * T021 (PASS path), T026 (ACCEPTED/REJECTED path), T027 (outcome cross-validation),
 * T029 (ESCALATE path)
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { CompleteStageSchema } from '@/lib/validations/pipeline'
import { StageOutcome } from '@/lib/generated/prisma/client'

type CompleteStageErrorCode =
  | 'FEATURE_DISABLED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'PROGRESS_NOT_FOUND'
  | 'ALREADY_COMPLETED'
  | 'STAGE_NOT_STARTED'
  | 'INVALID_OUTCOME'
  | 'INTERNAL_ERROR'

interface CompleteStageSuccess {
  success: true
}

interface CompleteStageError {
  error: string
  code: CompleteStageErrorCode
}

export async function completeStage(
  stageProgressId: string,
  outcome: StageOutcome,
  comment: string
): Promise<CompleteStageSuccess | CompleteStageError> {
  // ── Feature flag ───────────────────────────────────────────────────────────
  if (env.FEATURE_MULTI_STAGE_REVIEW_ENABLED !== 'true') {
    return { error: 'Multi-stage review is not enabled.', code: 'FEATURE_DISABLED' }
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const parsed = CompleteStageSchema.safeParse({ stageProgressId, outcome, comment })
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' }
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'Not authenticated.', code: 'UNAUTHENTICATED' }
  }
  const actorId = session.user.id

  try {
    // ── Load progress row ──────────────────────────────────────────────────
    const progress = await db.ideaStageProgress.findUnique({
      where: { id: stageProgressId },
      include: {
        stage: { include: { pipeline: { include: { stages: { orderBy: { order: 'asc' } } } } } },
      },
    })
    if (!progress) return { error: 'Stage progress record not found.', code: 'PROGRESS_NOT_FOUND' }

    // ── Owner guard ────────────────────────────────────────────────────────
    if (progress.reviewerId !== actorId) {
      return {
        error: 'Only the reviewer who claimed this stage may complete it.',
        code: 'FORBIDDEN',
      }
    }

    // ── State guards ───────────────────────────────────────────────────────
    if (progress.completedAt !== null) {
      return { error: 'This stage has already been completed.', code: 'ALREADY_COMPLETED' }
    }
    if (progress.startedAt === null) {
      return { error: 'This stage has not been started yet.', code: 'STAGE_NOT_STARTED' }
    }

    // ── Outcome vs stage-type cross-validation ─────────────────────────────
    const { isDecisionStage } = progress.stage
    const nonDecisionOutcomes: StageOutcome[] = [StageOutcome.PASS, StageOutcome.ESCALATE]
    const decisionOutcomes: StageOutcome[] = [StageOutcome.ACCEPTED, StageOutcome.REJECTED]

    if (!isDecisionStage && !nonDecisionOutcomes.includes(outcome)) {
      return {
        error: `Only PASS or ESCALATE are valid on non-decision stages (received ${outcome}).`,
        code: 'INVALID_OUTCOME',
      }
    }
    if (isDecisionStage && !decisionOutcomes.includes(outcome)) {
      return {
        error: `Only ACCEPTED or REJECTED are valid on the decision stage (received ${outcome}).`,
        code: 'INVALID_OUTCOME',
      }
    }

    const now = new Date()
    const ideaId = progress.ideaId
    const stage = progress.stage
    const allStages = stage.pipeline.stages

    await db.$transaction(async (tx) => {
      // Mark this stage complete
      await tx.ideaStageProgress.update({
        where: { id: stageProgressId },
        data: { outcome, comment, completedAt: now },
      })

      // Write STAGE_COMPLETED audit
      await tx.auditLog.create({
        data: {
          actorId,
          action: 'STAGE_COMPLETED',
          targetId: ideaId,
          metadata: {
            stageId: stage.id,
            stageName: stage.name,
            outcome,
            pipelineId: stage.pipelineId,
          },
        },
      })

      // ── PASS: activate next stage ─────────────────────────────────────
      if (outcome === StageOutcome.PASS) {
        const nextStage = allStages.find((s) => s.order === stage.order + 1)
        if (nextStage) {
          await tx.ideaStageProgress.updateMany({
            where: { ideaId, stageId: nextStage.id },
            data: { startedAt: now },
          })
          await tx.auditLog.create({
            data: {
              actorId,
              action: 'STAGE_STARTED',
              targetId: ideaId,
              metadata: {
                stageId: nextStage.id,
                stageName: nextStage.name,
                pipelineId: stage.pipelineId,
              },
            },
          })
        }
      }

      // ── ACCEPTED: finalize idea ────────────────────────────────────────
      if (outcome === StageOutcome.ACCEPTED) {
        await tx.idea.update({ where: { id: ideaId }, data: { status: 'ACCEPTED' } })
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'IDEA_REVIEWED',
            targetId: ideaId,
            metadata: { decision: 'ACCEPTED', stageId: stage.id, via: 'multi-stage-review' },
          },
        })
      }

      // ── REJECTED: finalize idea ────────────────────────────────────────
      if (outcome === StageOutcome.REJECTED) {
        await tx.idea.update({ where: { id: ideaId }, data: { status: 'REJECTED' } })
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'IDEA_REVIEWED',
            targetId: ideaId,
            metadata: { decision: 'REJECTED', stageId: stage.id, via: 'multi-stage-review' },
          },
        })
      }

      // ── ESCALATE: no further stage activation; audit already written ──
    })

    revalidatePath('/admin/review')
    revalidatePath(`/admin/review/${ideaId}`)
    revalidatePath(`/ideas/${ideaId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to complete stage.', code: 'INTERNAL_ERROR' }
  }
}
