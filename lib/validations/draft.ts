/**
 * lib/validations/draft.ts
 *
 * T001 — Draft Management: Zod schemas for draft operations.
 * All save-draft fields are optional/nullable — no required-field validation
 * is applied on save (only length caps). Full validation runs on submit (FR-001).
 * data-model.md §4
 */

import { z } from 'zod'

// ─── Save Draft Schema ────────────────────────────────────────────────────────

export const SaveDraftSchema = z.object({
  /** undefined → create new draft; string cuid → update existing draft */
  id: z.string().cuid('Invalid draft ID').optional(),
  title: z.string().max(150, 'Title must be 150 characters or fewer').nullable().optional(),
  description: z
    .string()
    .max(5000, 'Description must be 5,000 characters or fewer')
    .nullable()
    .optional(),
  category: z.string().nullable().optional(),
  visibility: z.enum(['PUBLIC', 'PRIVATE']).optional(),
  /** JSON object of dynamic field values (EPIC-V2-01 Smart Forms) */
  dynamicFields: z.record(z.string(), z.unknown()).nullable().optional(),
  /** Staged attachment URLs to associate with this draft (EPIC-V2-02) */
  attachmentUrls: z.array(z.string()).optional(),
})

export type SaveDraftInput = z.infer<typeof SaveDraftSchema>

// ─── Error Codes ─────────────────────────────────────────────────────────────

export type DraftErrorCode =
  | 'UNAUTHENTICATED'
  | 'FEATURE_DISABLED'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'DRAFT_LIMIT_EXCEEDED'
  | 'NOT_FOUND'
  | 'EXPIRED'
  | 'INTERNAL_ERROR'
