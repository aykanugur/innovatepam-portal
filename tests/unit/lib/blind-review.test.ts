/**
 * tests/unit/lib/blind-review.test.ts
 *
 * EPIC-V2-05 — Blind Review
 * Unit tests for the maskAuthorIfBlind() pure function.
 *
 * Tests all 5 masking conditions (each toggled off individually),
 * the all-on masking case, post-decision unmask, self-view unmask,
 * SUPERADMIN unmask, and null displayName fallback.
 */

import { describe, it, expect } from 'vitest'
import { maskAuthorIfBlind, type MaskAuthorParams } from '@/lib/blind-review'

/** All 5 masking conditions satisfied — should return 'Anonymous' */
const allOn: MaskAuthorParams = {
  authorId: 'user-author-1',
  authorDisplayName: 'Alice Smith',
  requesterId: 'user-admin-1',
  requesterRole: 'ADMIN',
  pipelineBlindReview: true,
  ideaStatus: 'UNDER_REVIEW',
  featureFlagEnabled: true,
}

describe('maskAuthorIfBlind', () => {
  // ─── Positive case ───────────────────────────────────────────────────────

  it('returns "Anonymous" when all 5 masking conditions are true', () => {
    expect(maskAuthorIfBlind(allOn)).toBe('Anonymous')
  })

  // ─── Condition 1: feature flag ───────────────────────────────────────────

  it('returns real name when featureFlagEnabled is false', () => {
    const result = maskAuthorIfBlind({ ...allOn, featureFlagEnabled: false })
    expect(result).toBe('Alice Smith')
  })

  // ─── Condition 2: pipeline.blindReview ───────────────────────────────────

  it('returns real name when pipelineBlindReview is false', () => {
    const result = maskAuthorIfBlind({ ...allOn, pipelineBlindReview: false })
    expect(result).toBe('Alice Smith')
  })

  // ─── Condition 3: idea status ────────────────────────────────────────────

  it('returns real name when ideaStatus is SUBMITTED (not UNDER_REVIEW)', () => {
    const result = maskAuthorIfBlind({ ...allOn, ideaStatus: 'SUBMITTED' })
    expect(result).toBe('Alice Smith')
  })

  it('returns real name (post-decision) when status is ACCEPTED', () => {
    const result = maskAuthorIfBlind({ ...allOn, ideaStatus: 'ACCEPTED' })
    expect(result).toBe('Alice Smith')
  })

  it('returns real name (post-decision) when status is REJECTED', () => {
    const result = maskAuthorIfBlind({ ...allOn, ideaStatus: 'REJECTED' })
    expect(result).toBe('Alice Smith')
  })

  // ─── Condition 4: requester role ─────────────────────────────────────────

  it('returns real name when requesterRole is SUPERADMIN', () => {
    const result = maskAuthorIfBlind({ ...allOn, requesterRole: 'SUPERADMIN' })
    expect(result).toBe('Alice Smith')
  })

  it('returns real name when requesterRole is SUBMITTER', () => {
    const result = maskAuthorIfBlind({ ...allOn, requesterRole: 'SUBMITTER' })
    expect(result).toBe('Alice Smith')
  })

  // ─── Condition 5: self-view exemption ────────────────────────────────────

  it('returns real name when requesterId === authorId (author viewing own idea)', () => {
    const result = maskAuthorIfBlind({ ...allOn, requesterId: allOn.authorId })
    expect(result).toBe('Alice Smith')
  })

  // ─── Null/undefined displayName fallback ─────────────────────────────────

  it('returns "Unknown" when authorDisplayName is null and masking does NOT apply', () => {
    const result = maskAuthorIfBlind({
      ...allOn,
      featureFlagEnabled: false,
      authorDisplayName: null,
    })
    expect(result).toBe('Unknown')
  })

  it('returns "Unknown" when authorDisplayName is undefined and masking does NOT apply', () => {
    const result = maskAuthorIfBlind({
      ...allOn,
      featureFlagEnabled: false,
      authorDisplayName: undefined,
    })
    expect(result).toBe('Unknown')
  })

  it('returns "Anonymous" (not "Unknown") when all conditions true even if displayName is null', () => {
    // When masking applies, the real name is irrelevant — we return 'Anonymous'
    const result = maskAuthorIfBlind({ ...allOn, authorDisplayName: null })
    expect(result).toBe('Anonymous')
  })
})
