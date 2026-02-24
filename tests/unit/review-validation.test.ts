import { describe, it, expect } from 'vitest'
import { FinalizeReviewSchema } from '@/lib/validations/review'

// RED phase: these tests MUST fail until lib/validations/review.ts is created (T009)

const validIdeaId = 'clxxxxxxxxxxxxxxxxxxxxxx' // 25-char cuid-like

describe('FinalizeReviewSchema', () => {
  // ── Valid inputs ─────────────────────────────────────────────────────────────

  it('valid ACCEPTED decision with long comment passes', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: validIdeaId,
      decision: 'ACCEPTED',
      comment: 'This is a great idea worth implementing.',
    })
    expect(result.success).toBe(true)
  })

  it('valid REJECTED decision with long comment passes', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: validIdeaId,
      decision: 'REJECTED',
      comment: 'Not feasible within current constraints.',
    })
    expect(result.success).toBe(true)
  })

  it('comment of exactly 10 characters passes — FR-005', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: validIdeaId,
      decision: 'ACCEPTED',
      comment: '1234567890', // exactly 10 chars
    })
    expect(result.success).toBe(true)
  })

  // ── Invalid inputs ────────────────────────────────────────────────────────

  it('missing comment rejects', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: validIdeaId,
      decision: 'ACCEPTED',
    })
    expect(result.success).toBe(false)
  })

  it('comment of exactly 9 characters rejects — FR-005 boundary', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: validIdeaId,
      decision: 'ACCEPTED',
      comment: '123456789', // 9 chars
    })
    expect(result.success).toBe(false)
  })

  it('whitespace-only comment (trimmed length < 10) rejects — FR-005', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: validIdeaId,
      decision: 'ACCEPTED',
      comment: '         ', // 9 spaces — trimmed = 0 chars
    })
    expect(result.success).toBe(false)
  })

  it('whitespace-padded comment trimmed to 9 chars rejects', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: validIdeaId,
      decision: 'ACCEPTED',
      comment: '  123456789  ', // trimmed = 9 chars
    })
    expect(result.success).toBe(false)
  })

  it('invalid decision string rejects', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: validIdeaId,
      decision: 'PENDING',
      comment: 'Valid comment here yes.',
    })
    expect(result.success).toBe(false)
  })

  it('missing ideaId rejects', () => {
    const result = FinalizeReviewSchema.safeParse({
      decision: 'ACCEPTED',
      comment: 'Valid comment here yes.',
    })
    expect(result.success).toBe(false)
  })

  it('empty ideaId rejects', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: '',
      decision: 'ACCEPTED',
      comment: 'Valid comment here yes.',
    })
    expect(result.success).toBe(false)
  })

  // ── Parsed output type ───────────────────────────────────────────────────────

  it('successful parse returns ideaId, decision, and trimmed comment', () => {
    const result = FinalizeReviewSchema.safeParse({
      ideaId: validIdeaId,
      decision: 'REJECTED',
      comment: '  Good effort, but out of scope.  ',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ideaId).toBe(validIdeaId)
      expect(result.data.decision).toBe('REJECTED')
      expect(result.data.comment).toBe('Good effort, but out of scope.')
    }
  })
})
