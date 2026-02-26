'use server'

/**
 * lib/actions/pipeline-crud.ts
 *
 * EPIC-V2-04 — Multi-Stage Review Pipeline
 * Server Actions: createPipeline, updatePipeline, deletePipeline.
 * All require SUPERADMIN role.
 *
 * T013: createPipeline
 * T014: updatePipeline
 * T015: deletePipeline
 */

import { auth } from '@/auth'
import { db } from '@/lib/db'
import {
  CreatePipelineSchema,
  CreatePipelineInput,
  UpdatePipelineSchema,
  UpdatePipelineInput,
  DeletePipelineSchema,
} from '@/lib/validations/pipeline'

// ─── Error codes ──────────────────────────────────────────────────────────────

type PipelineCrudError =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'PIPELINE_EXISTS'
  | 'PIPELINE_NOT_FOUND'
  | 'STAGE_IN_USE'
  | 'INVALID_STAGE_CONFIG'
  | 'CANNOT_DELETE_DEFAULT'
  | 'PIPELINE_IN_USE'
  | 'INTERNAL_ERROR'

interface ErrorResult {
  error: string
  code: PipelineCrudError
}

// ─── Auth helper ──────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<{ userId: string } | ErrorResult> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'Not authenticated.', code: 'UNAUTHENTICATED' }
  if (session.user.role !== 'SUPERADMIN')
    return { error: 'SUPERADMIN role required.', code: 'FORBIDDEN' }
  return { userId: session.user.id }
}

// ─── createPipeline ───────────────────────────────────────────────────────────

export async function createPipeline(
  data: CreatePipelineInput
): Promise<{ pipelineId: string } | ErrorResult> {
  const authResult = await requireSuperAdmin()
  if ('error' in authResult) return authResult

  const parsed = CreatePipelineSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' }
  }

  const { name, categorySlug, isDefault, stages } = parsed.data

  try {
    // Guard: no existing pipeline for this category
    const existing = await db.reviewPipeline.findUnique({ where: { categorySlug } })
    if (existing) {
      return {
        error: `A pipeline already exists for category "${categorySlug}".`,
        code: 'PIPELINE_EXISTS',
      }
    }

    const pipeline = await db.reviewPipeline.create({
      data: {
        name,
        categorySlug,
        isDefault,
        stages: {
          create: stages.map((s) => ({
            name: s.name,
            description: s.description,
            order: s.order,
            isDecisionStage: s.isDecisionStage,
          })),
        },
      },
    })

    await db.auditLog.create({
      data: {
        actorId: authResult.userId,
        action: 'PIPELINE_CREATED',
        targetId: pipeline.id,
        metadata: {
          pipelineId: pipeline.id,
          categorySlug,
          stageCount: stages.length,
        },
      },
    })

    return { pipelineId: pipeline.id }
  } catch {
    return { error: 'Failed to create pipeline.', code: 'INTERNAL_ERROR' }
  }
}

// ─── updatePipeline ───────────────────────────────────────────────────────────

export async function updatePipeline(
  data: UpdatePipelineInput
): Promise<{ success: true } | ErrorResult> {
  const authResult = await requireSuperAdmin()
  if ('error' in authResult) return authResult

  const parsed = UpdatePipelineSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' }
  }

  const { pipelineId, name, stages } = parsed.data

  try {
    const pipeline = await db.reviewPipeline.findUnique({
      where: { id: pipelineId },
      include: { stages: { select: { id: true } } },
    })
    if (!pipeline) return { error: 'Pipeline not found.', code: 'PIPELINE_NOT_FOUND' }

    if (stages) {
      // Identify stages being removed (existing IDs not in new array)
      const newStageIds = new Set(stages.map((s) => s.id).filter(Boolean))
      const removedStageIds = pipeline.stages.map((s) => s.id).filter((id) => !newStageIds.has(id))

      // Guard: block removal of stages with active (uncompleted) progress rows
      if (removedStageIds.length > 0) {
        const inFlightCount = await db.ideaStageProgress.count({
          where: { stageId: { in: removedStageIds }, completedAt: null },
        })
        if (inFlightCount > 0) {
          return {
            error: `Cannot remove ${removedStageIds.length} stage(s) — ${inFlightCount} in-progress review(s) are attached.`,
            code: 'STAGE_IN_USE',
          }
        }
      }

      await db.$transaction(async (tx) => {
        // Delete removed stages
        if (removedStageIds.length > 0) {
          await tx.reviewPipelineStage.deleteMany({ where: { id: { in: removedStageIds } } })
        }

        // Upsert stages (update existing by id, create new ones)
        for (const stage of stages) {
          if (stage.id) {
            await tx.reviewPipelineStage.update({
              where: { id: stage.id },
              data: {
                name: stage.name,
                description: stage.description,
                order: stage.order,
                isDecisionStage: stage.isDecisionStage,
              },
            })
          } else {
            await tx.reviewPipelineStage.create({
              data: {
                pipelineId,
                name: stage.name,
                description: stage.description,
                order: stage.order,
                isDecisionStage: stage.isDecisionStage,
              },
            })
          }
        }

        // Update pipeline name if provided
        if (name !== undefined) {
          await tx.reviewPipeline.update({ where: { id: pipelineId }, data: { name } })
        }
      })
    } else if (name !== undefined) {
      await db.reviewPipeline.update({ where: { id: pipelineId }, data: { name } })
    }

    await db.auditLog.create({
      data: {
        actorId: authResult.userId,
        action: 'PIPELINE_UPDATED',
        targetId: pipelineId,
        metadata: {
          pipelineId,
          stagesUpdated: stages?.length ?? 0,
        },
      },
    })

    return { success: true }
  } catch {
    return { error: 'Failed to update pipeline.', code: 'INTERNAL_ERROR' }
  }
}

// ─── deletePipeline ───────────────────────────────────────────────────────────

export async function deletePipeline(pipelineId: string): Promise<{ success: true } | ErrorResult> {
  const authResult = await requireSuperAdmin()
  if ('error' in authResult) return authResult

  const parsed = DeletePipelineSchema.safeParse({ pipelineId })
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, code: 'VALIDATION_ERROR' }
  }

  try {
    const pipeline = await db.reviewPipeline.findUnique({
      where: { id: pipelineId },
      include: { stages: { select: { id: true } } },
    })
    if (!pipeline) return { error: 'Pipeline not found.', code: 'PIPELINE_NOT_FOUND' }
    if (pipeline.isDefault) {
      return { error: 'Default pipelines cannot be deleted.', code: 'CANNOT_DELETE_DEFAULT' }
    }

    // Guard: block deletion if any in-flight stage progress exists
    const stageIds = pipeline.stages.map((s) => s.id)
    const inFlightCount = await db.ideaStageProgress.count({
      where: { stageId: { in: stageIds }, completedAt: null },
    })
    if (inFlightCount > 0) {
      return {
        error: `Cannot delete pipeline — ${inFlightCount} in-progress review(s) are using it.`,
        code: 'PIPELINE_IN_USE',
      }
    }

    // Cascade delete handled by Prisma (onDelete: Cascade on ReviewPipelineStage)
    await db.reviewPipeline.delete({ where: { id: pipelineId } })

    return { success: true }
  } catch {
    return { error: 'Failed to delete pipeline.', code: 'INTERNAL_ERROR' }
  }
}
