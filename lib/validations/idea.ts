/**
 * T007 — Zod validation schemas for the ideas resource.
 * Used at the API boundary (Route Handlers) and server actions.
 * CategorySlug is derived from constants/categories.ts to stay in sync.
 */
import { z } from 'zod'
import { CATEGORIES, type CategorySlug } from '@/constants/categories'

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
