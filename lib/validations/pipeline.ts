/**
 * lib/validations/pipeline.ts
 *
 * EPIC-V2-04 — Multi-Stage Review Pipeline
 * Shared Zod schemas for all pipeline-related Server Actions.
 */

import { z } from 'zod'
import { StageOutcome } from '@/lib/generated/prisma/client'

// ─── Category slugs ───────────────────────────────────────────────────────────

export const PIPELINE_CATEGORY_SLUGS = [
  'process-improvement',
  'new-product-service',
  'cost-reduction',
  'employee-experience',
  'technical-innovation',
] as const

export type PipelineCategorySlug = (typeof PIPELINE_CATEGORY_SLUGS)[number]

// ─── Stage input ──────────────────────────────────────────────────────────────

const StageInputSchema = z.object({
  /** Existing stage ID — omit for new stages */
  id: z.string().cuid().optional(),
  name: z
    .string()
    .min(1, 'Stage name is required')
    .max(60, 'Stage name must be 60 characters or fewer'),
  description: z.string().max(500, 'Description must be 500 characters or fewer').optional(),
  order: z.number().int().positive('Order must be a positive integer'),
  isDecisionStage: z.boolean(),
})

export type StageInput = z.infer<typeof StageInputSchema>

/** Validates that exactly one decision stage exists and orders are contiguous from 1. */
const stageArrayRefinement = (stages: StageInput[], ctx: z.RefinementCtx) => {
  const decisionCount = stages.filter((s) => s.isDecisionStage).length
  if (decisionCount !== 1) {
    ctx.addIssue({
      code: 'custom',
      message: `Exactly one stage must be marked as the decision stage (found ${decisionCount}).`,
      path: ['stages'],
    })
  }
  const sortedOrders = stages.map((s) => s.order).sort((a, b) => a - b)
  const expected = Array.from({ length: stages.length }, (_, i) => i + 1)
  const isContiguous = sortedOrders.every((o, i) => o === expected[i])
  if (!isContiguous) {
    ctx.addIssue({
      code: 'custom',
      message: 'Stage orders must be contiguous starting at 1.',
      path: ['stages'],
    })
  }
}

// ─── claimStage ───────────────────────────────────────────────────────────────

export const ClaimStageSchema = z.object({
  ideaId: z.string().cuid('Invalid idea ID'),
})

export type ClaimStageInput = z.infer<typeof ClaimStageSchema>

// ─── completeStage ────────────────────────────────────────────────────────────

export const CompleteStageSchema = z.object({
  stageProgressId: z.string().cuid('Invalid stage progress ID'),
  outcome: z.nativeEnum(StageOutcome),
  comment: z
    .string()
    .min(10, 'A comment is required (minimum 10 characters).')
    .max(2000, 'Comment must be 2000 characters or fewer.'),
})

export type CompleteStageInput = z.infer<typeof CompleteStageSchema>

// ─── EPIC-V2-06: completeStage with scoring ──────────────────────────────────

import { SCORING_CRITERIA } from '@/constants/scoring-criteria'

const scoringCriteriaTuple = SCORING_CRITERIA as readonly [string, ...string[]]

export const CompleteStageWithScoreSchema = z.object({
  stageProgressId: z.string().cuid('Invalid stage progress ID'),
  outcome: z.nativeEnum(StageOutcome),
  comment: z
    .string()
    .min(10, 'A comment is required (minimum 10 characters).')
    .max(2000, 'Comment must be 2000 characters or fewer.'),
  score: z.number().int().min(1).max(5).optional(),
  criteria: z.array(z.enum(scoringCriteriaTuple)).max(5).optional(),
})

export type CompleteStageWithScoreInput = z.infer<typeof CompleteStageWithScoreSchema>

// ─── resolveEscalation ────────────────────────────────────────────────────────

export const ResolveEscalationSchema = z.object({
  stageProgressId: z.string().cuid('Invalid stage progress ID'),
  action: z.enum(['PASS', 'REJECT']),
  comment: z
    .string()
    .min(10, 'A comment is required (minimum 10 characters).')
    .max(2000, 'Comment must be 2000 characters or fewer.'),
})

export type ResolveEscalationInput = z.infer<typeof ResolveEscalationSchema>

// ─── createPipeline ───────────────────────────────────────────────────────────

export const CreatePipelineSchema = z.object({
  name: z
    .string()
    .min(1, 'Pipeline name is required')
    .max(80, 'Pipeline name must be 80 characters or fewer'),
  categorySlug: z.enum(PIPELINE_CATEGORY_SLUGS, {
    errorMap: () => ({ message: 'Invalid category slug.' }),
  }),
  isDefault: z.boolean().default(false),
  // EPIC-V2-05 — Blind Review: SUPERADMIN-only field
  blindReview: z.boolean().default(false),
  stages: z
    .array(StageInputSchema)
    .min(2, 'A pipeline must have at least 2 stages.')
    .superRefine(stageArrayRefinement),
})

export type CreatePipelineInput = z.infer<typeof CreatePipelineSchema>

// ─── updatePipeline ───────────────────────────────────────────────────────────

export const UpdatePipelineSchema = z.object({
  pipelineId: z.string().cuid('Invalid pipeline ID'),
  name: z
    .string()
    .min(1, 'Pipeline name is required')
    .max(80, 'Pipeline name must be 80 characters or fewer')
    .optional(),
  // EPIC-V2-05 — Blind Review: SUPERADMIN-only field; server action guards per-field
  blindReview: z.boolean().optional(),
  stages: z
    .array(StageInputSchema)
    .min(2, 'A pipeline must have at least 2 stages.')
    .superRefine(stageArrayRefinement)
    .optional(),
})

export type UpdatePipelineInput = z.infer<typeof UpdatePipelineSchema>

// ─── deletePipeline ───────────────────────────────────────────────────────────

export const DeletePipelineSchema = z.object({
  pipelineId: z.string().cuid('Invalid pipeline ID'),
})

export type DeletePipelineInput = z.infer<typeof DeletePipelineSchema>
