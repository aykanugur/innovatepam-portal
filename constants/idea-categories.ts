import { z } from 'zod'

export const IDEA_CATEGORIES = [
  'Process Improvement',
  'Technology & Tools',
  'Culture & Wellbeing',
  'Customer Experience',
  'Cost Reduction',
  'Learning & Development',
  'Other',
] as const

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number]

export const ideaCategorySchema = z.enum(IDEA_CATEGORIES)
