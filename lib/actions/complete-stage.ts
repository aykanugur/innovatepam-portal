'use server'

/**
 * lib/actions/complete-stage.ts
 *
 * EPIC-V2-04 — Multi-Stage Review Pipeline
 * EPIC-V2-06 — Scoring System (score + criteria on decision stage)
 *
 * Server Action: completeStage(stageProgressId, outcome, comment, score?, criteria?)
 *
 * The reviewer who claimed the stage records their outcome.
 * PASS → activates the next stage.
 * ESCALATE → surfaces in escalation queue, no next stage activation.
 * ACCEPTED / REJECTED → finalizes the idea (decision stage only).
 *
 * When FEATURE_SCORING_ENABLED=true and stage is a decision stage,
 * a score (1–5) is required and an IdeaScore record is atomically
 * persisted with the decision.
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { CompleteStageWithScoreSchema } from '@/lib/validations/pipeline'
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
  | 'SCORE_REQUIRED'
  | 'SCORE_CONFLICT'
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
  comment: string,
  score?: number,
  criteria?: string[]
): Promise<CompleteStageSuccess | CompleteStageError> {
  // ── Feature flag ───────────────────────────────────────────────────────────
  if (env.FEATURE_MULTI_STAGE_REVIEW_ENABLED !== 'true') {
    return { error: 'Multi-stage review is not enabled.', code: 'FEATURE_DISABLED' }
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const parsed = CompleteStageWithScoreSchema.safeParse({
    stageProgressId,
    outcome,
    comment,
    score,
    criteria,
  })
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

    // ── EPIC-V2-06: score guard on decision stage ──────────────────────────
    const scoringEnabled = env.FEATURE_SCORING_ENABLED === 'true'
    if (scoringEnabled && isDecisionStage && (score == null || score < 1 || score > 5)) {
      return {
        error: 'A score (1–5) is required to finalise the decision.',
        code: 'SCORE_REQUIRED',
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

      // ── EPIC-V2-06: Record IdeaScore on decision stage ────────────────
      if (scoringEnabled && isDecisionStage && score != null) {
        await tx.ideaScore.create({
          data: {
            ideaId,
            reviewerId: actorId,
            score,
            criteria: criteria ?? [],
          },
        })
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'IDEA_SCORED',
            targetId: ideaId,
            metadata: { score, criteria: criteria ?? [], ideaId },
          },
        })
      }

      // ── ESCALATE: no further stage activation; audit already written ──
    })

    revalidatePath('/admin/review')
    revalidatePath(`/admin/review/${ideaId}`)
    revalidatePath(`/ideas/${ideaId}`)
    revalidatePath('/admin/analytics')

    return { success: true }
  } catch (err: unknown) {
    // EPIC-V2-06: handle duplicate IdeaScore race condition (P2002)
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2002'
    ) {
      return {
        error: 'A score has already been recorded for this idea.',
        code: 'SCORE_CONFLICT',
      }
    }
    return { error: 'Failed to complete stage.', code: 'INTERNAL_ERROR' }
  }
}
