/**
 * T007 — Zod validation schemas for the ideas resource.
 * Used at the API boundary (Route Handlers) and server actions.
 * CategorySlug is derived from constants/categories.ts to stay in sync.
 */
import { z } from 'zod'
import { CATEGORIES, type CategorySlug } from '@/constants/categories'
import type { FieldDefinition } from '@/types/field-template'

// ─── Category ────────────────────────────────────────────────────────────────

const categorySlugs = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]]

export const categorySlugSchema = z.enum(categorySlugs)

// ─── Create Idea ─────────────────────────────────────────────────────────────

/**
 * POST /api/ideas — request body (JSON path, no attachment).
 * FR-002: title 1–100 chars; description 1–2000 chars;
 *         category from allowed slugs; visibility PUBLIC or PRIVATE.
 */
export const CreateIdeaSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or fewer'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(2000, 'Description must be 2,000 characters or fewer'),
  category: categorySlugSchema,
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
})

export type CreateIdeaInput = z.infer<typeof CreateIdeaSchema>

// ─── Idea List Query ─────────────────────────────────────────────────────────

/**
 * GET /api/ideas — query string parameters.
 * R-006: offset-based pagination; page 1-based; pageSize max 100.
 * R-007: category filter by slug.
 */
export const IdeaListQuerySchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  category: categorySlugSchema.optional(),
})

export type IdeaListQuery = z.infer<typeof IdeaListQuerySchema>

// ─── Dynamic Fields Schema ───────────────────────────────────────────────────

/**
 * T007 — Builds a Zod object schema dynamically from a CategoryFieldTemplate's
 * field definitions. Encodes all validation rules from spec.md FR-005, FR-006,
 * FR-013, FR-016, FR-017, FR-018.
 *
 * Unknown keys are stripped (.strip() is Zod's default for z.object).
 * The caller must validate the JSON-parsed payload against this schema.
 */
export function buildDynamicFieldsSchema(fields: FieldDefinition[]): z.ZodObject<z.ZodRawShape> {
  const shape: z.ZodRawShape = {}

  for (const field of fields) {
    const { id, label, type, required, options } = field

    let schema: z.ZodTypeAny

    if (type === 'text') {
      // text: max 255; required = non-blank (after trim)
      const base = z
        .string()
        .max(255, `${label} must be 255 characters or fewer.`)
        .transform((v) => v.trim())
      schema = required
        ? base.refine((v) => v.length > 0, `${label} is required.`)
        : base.optional().or(z.literal(''))
    } else if (type === 'textarea') {
      // textarea: max 2000; required = non-blank
      const base = z
        .string()
        .max(2000, `${label} must be 2000 characters or fewer.`)
        .transform((v) => v.trim())
      schema = required
        ? base.refine((v) => v.length > 0, `${label} is required.`)
        : base.optional().or(z.literal(''))
    } else if (type === 'number') {
      // number: coerce string → number; accepts negatives and zero (FR-006)
      const base = z.coerce.number({ invalid_type_error: `${label} must be a number.` })
      schema = required ? base : base.optional()
    } else if (type === 'select') {
      // select: FR-017 — empty options list → field never rendered; skip validation
      if (!options || options.length === 0) continue
      const enumValues = options as [string, ...string[]]
      const base = z.enum(enumValues, {
        errorMap: () => ({ message: `${label} contains an invalid selection.` }),
      })
      schema = required ? base : base.optional()
    } else {
      // Unknown type — skip
      continue
    }

    shape[id] = schema
  }

  return z.object(shape)
}
