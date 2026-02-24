import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'
import { IDEA_CATEGORIES, ideaCategorySchema, type IdeaCategory } from '@/constants/idea-categories'

describe('idea-categories', () => {
  it('has exactly 7 categories', () => {
    expect(IDEA_CATEGORIES).toHaveLength(7)
  })

  it('all 7 values pass ideaCategorySchema.parse() without error', () => {
    for (const category of IDEA_CATEGORIES) {
      expect(() => ideaCategorySchema.parse(category)).not.toThrow()
    }
  })

  it('"Unknown Category" throws ZodError', () => {
    expect(() => ideaCategorySchema.parse('Unknown Category')).toThrow(ZodError)
  })

  it('empty string throws ZodError', () => {
    expect(() => ideaCategorySchema.parse('')).toThrow(ZodError)
  })

  it('IdeaCategory type is derived from IDEA_CATEGORIES tuple', () => {
    const category: IdeaCategory = 'Other'
    expect(IDEA_CATEGORIES).toContain(category)
  })
})
