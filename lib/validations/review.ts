/**
 * lib/validations/review.ts
 *
 * Zod schema for finalizeReviewAction (US-012, FR-005).
 * comment minimum 10 chars after trimming — matches FR-005 exactly.
 */
import { z } from 'zod'

export const FinalizeReviewSchema = z.object({
  ideaId: z.string().min(1, 'ideaId is required'),
  decision: z.enum(['ACCEPTED', 'REJECTED'], {
    errorMap: () => ({ message: "decision must be 'ACCEPTED' or 'REJECTED'" }),
  }),
  comment: z
    .string()
    .transform((v) => v.trim())
    .refine(
      (v) => v.length >= 10,
      'Review comment must be at least 10 characters.' // FR-005
    ),
})

export type FinalizeReviewInput = z.infer<typeof FinalizeReviewSchema>
