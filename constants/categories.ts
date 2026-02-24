/**
 * T003 — Idea category constants.
 * Slug values are URL-safe kebab-case; label values are used in UI display.
 * Shared between client components and server-side Zod validation (CategorySlug
 * is the source of truth for CreateIdeaSchema's category field).
 */

export const CATEGORIES = [
  { slug: 'process-improvement', label: 'Process Improvement' },
  { slug: 'new-product-service', label: 'New Product/Service' },
  { slug: 'cost-reduction', label: 'Cost Reduction' },
  { slug: 'employee-experience', label: 'Employee Experience' },
  { slug: 'technical-innovation', label: 'Technical Innovation' },
] as const

export type CategorySlug = (typeof CATEGORIES)[number]['slug']

/** Lookup map: slug → label */
export const CATEGORY_LABEL: Record<CategorySlug, string> = Object.fromEntries(
  CATEGORIES.map(({ slug, label }) => [slug, label])
) as Record<CategorySlug, string>
