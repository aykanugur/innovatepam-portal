'use server'

/**
 * lib/actions/resolve-escalation.ts
 *
 * EPIC-V2-04 — Multi-Stage Review Pipeline
 * Server Action: resolveEscalation(stageProgressId, action, comment)
 *
 * SUPERADMIN-only. Resolves an escalated stage:
 *   PASS  → activates the next stage (or accepts idea if it was the last stage)
 *   REJECT → closes the idea as REJECTED
 *
 * T030: resolveEscalation
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { ResolveEscalationSchema } from '@/lib/validations/pipeline'
import { StageOutcome } from '@/lib/generated/prisma/client'

type ResolveEscalationErrorCode =
  | 'FEATURE_DISABLED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'PROGRESS_NOT_FOUND'
  | 'NOT_ESCALATED'
  | 'STAGE_INCOMPLETE'
  | 'INVALID_STATUS'
  | 'INTERNAL_ERROR'

interface ResolveEscalationSuccess {
  success: true
}

interface ResolveEscalationError {
  error: string
  code: ResolveEscalationErrorCode
}

export async function resolveEscalation(
  stageProgressId: string,
  action: 'PASS' | 'REJECT',
  comment: string
): Promise<ResolveEscalationSuccess | ResolveEscalationError> {
  // ── Feature flag ───────────────────────────────────────────────────────────
  if (env.FEATURE_MULTI_STAGE_REVIEW_ENABLED !== 'true') {
    return { error: 'Multi-stage review is not enabled.', code: 'FEATURE_DISABLED' }
  }

  // ── Input validation ───────────────────────────────────────────────────────
  const parsed = ResolveEscalationSchema.safeParse({ stageProgressId, action, comment })
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' }
  }

  // ── Auth: SUPERADMIN only ─────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated.', code: 'UNAUTHENTICATED' }
  if (session.user.role !== 'SUPERADMIN') {
    return { error: 'Only SUPERADMIN can resolve escalations.', code: 'FORBIDDEN' }
  }
  const actorId = session.user.id

  try {
    // ── Load progress row ──────────────────────────────────────────────────
    const progress = await db.ideaStageProgress.findUnique({
      where: { id: stageProgressId },
      include: {
        stage: { include: { pipeline: { include: { stages: { orderBy: { order: 'asc' } } } } } },
        idea: { select: { id: true, status: true } },
      },
    })
    if (!progress) return { error: 'Stage progress record not found.', code: 'PROGRESS_NOT_FOUND' }

    // ── Pre-condition guards ───────────────────────────────────────────────
    if (progress.outcome !== StageOutcome.ESCALATE) {
      return {
        error: 'This stage progress record is not in ESCALATE status.',
        code: 'NOT_ESCALATED',
      }
    }
    if (progress.completedAt === null) {
      return {
        error: 'The escalation has not been formally recorded (completedAt is null).',
        code: 'STAGE_INCOMPLETE',
      }
    }
    if (progress.idea.status !== 'UNDER_REVIEW') {
      return {
        error: `Idea is no longer under review (status: ${progress.idea.status}).`,
        code: 'INVALID_STATUS',
      }
    }

    const now = new Date()
    const ideaId = progress.idea.id
    const stage = progress.stage
    const allStages = stage.pipeline.stages

    await db.$transaction(async (tx) => {
      if (action === 'PASS') {
        const nextStage = allStages.find((s) => s.order === stage.order + 1)

        if (nextStage) {
          // Activate next stage
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
                escalationResolution: 'PASS',
              },
            },
          })
        } else {
          // No next stage → accept the idea
          await tx.idea.update({ where: { id: ideaId }, data: { status: 'ACCEPTED' } })
          await tx.auditLog.create({
            data: {
              actorId,
              action: 'IDEA_REVIEWED',
              targetId: ideaId,
              metadata: {
                decision: 'ACCEPTED',
                via: 'escalation-resolution',
                escalationResolution: 'PASS',
              },
            },
          })
        }

        // Resolution audit entry
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'STAGE_COMPLETED',
            targetId: ideaId,
            metadata: {
              resolution: 'PASS',
              comment,
              stageProgressId,
              resolvedBy: 'SUPERADMIN',
            },
          },
        })
      } else {
        // REJECT
        await tx.idea.update({ where: { id: ideaId }, data: { status: 'REJECTED' } })
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'IDEA_REVIEWED',
            targetId: ideaId,
            metadata: {
              decision: 'REJECTED',
              via: 'escalation-resolution',
              comment,
              escalationResolution: 'REJECT',
            },
          },
        })
        await tx.auditLog.create({
          data: {
            actorId,
            action: 'STAGE_COMPLETED',
            targetId: ideaId,
            metadata: {
              resolution: 'REJECT',
              comment,
              stageProgressId,
              resolvedBy: 'SUPERADMIN',
            },
          },
        })
      }
    })

    revalidatePath('/admin/review')
    revalidatePath(`/ideas/${ideaId}`)

    return { success: true }
  } catch {
    return { error: 'Failed to resolve escalation.', code: 'INTERNAL_ERROR' }
  }
}
