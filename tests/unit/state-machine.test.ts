import { describe, it, expect } from 'vitest'
import {
  transition,
  InvalidTransitionError,
  InsufficientRoleError,
  AlreadyReviewedError,
} from '@/lib/state-machine/idea-status'

// RED phase: these tests MUST fail until lib/state-machine/idea-status.ts is created (T008)

describe('State Machine — transition()', () => {
  // ── Valid transitions ───────────────────────────────────────────────────────

  it('SUBMITTED → UNDER_REVIEW with ADMIN role — US-012 AC-1', () => {
    const result = transition('SUBMITTED', 'START_REVIEW', 'ADMIN')
    expect(result).toBe('UNDER_REVIEW')
  })

  it('SUBMITTED → UNDER_REVIEW with SUPERADMIN role — US-012 AC-1', () => {
    const result = transition('SUBMITTED', 'START_REVIEW', 'SUPERADMIN')
    expect(result).toBe('UNDER_REVIEW')
  })

  it('UNDER_REVIEW → ACCEPTED with ADMIN role — US-012 AC-3', () => {
    const result = transition('UNDER_REVIEW', 'ACCEPT', 'ADMIN')
    expect(result).toBe('ACCEPTED')
  })

  it('UNDER_REVIEW → ACCEPTED with SUPERADMIN role — US-012 AC-3', () => {
    const result = transition('UNDER_REVIEW', 'ACCEPT', 'SUPERADMIN')
    expect(result).toBe('ACCEPTED')
  })

  it('UNDER_REVIEW → REJECTED with ADMIN role — US-012 AC-4', () => {
    const result = transition('UNDER_REVIEW', 'REJECT', 'ADMIN')
    expect(result).toBe('REJECTED')
  })

  it('UNDER_REVIEW → REJECTED with SUPERADMIN role — US-012 AC-4', () => {
    const result = transition('UNDER_REVIEW', 'REJECT', 'SUPERADMIN')
    expect(result).toBe('REJECTED')
  })

  it('UNDER_REVIEW → SUBMITTED via ABANDON by SUPERADMIN — FR-030', () => {
    const result = transition('UNDER_REVIEW', 'ABANDON', 'SUPERADMIN')
    expect(result).toBe('SUBMITTED')
  })

  // ── Insufficient role errors ────────────────────────────────────────────────

  it('SUBMITTER cannot START_REVIEW — throws InsufficientRoleError — US-012 AC-6', () => {
    expect(() => transition('SUBMITTED', 'START_REVIEW', 'SUBMITTER')).toThrow(
      InsufficientRoleError
    )
  })

  it('SUBMITTER cannot ACCEPT — throws InsufficientRoleError', () => {
    expect(() => transition('UNDER_REVIEW', 'ACCEPT', 'SUBMITTER')).toThrow(InsufficientRoleError)
  })

  it('SUBMITTER cannot REJECT — throws InsufficientRoleError', () => {
    expect(() => transition('UNDER_REVIEW', 'REJECT', 'SUBMITTER')).toThrow(InsufficientRoleError)
  })

  it('ADMIN cannot ABANDON — ABANDON is SUPERADMIN-only — throws InsufficientRoleError — FR-030', () => {
    expect(() => transition('UNDER_REVIEW', 'ABANDON', 'ADMIN')).toThrow(InsufficientRoleError)
  })

  it('SUBMITTER cannot ABANDON — throws InsufficientRoleError', () => {
    expect(() => transition('UNDER_REVIEW', 'ABANDON', 'SUBMITTER')).toThrow(InsufficientRoleError)
  })

  // ── Invalid transition errors ───────────────────────────────────────────────

  it('SUBMITTED → ACCEPTED directly throws InvalidTransitionError', () => {
    expect(() => transition('SUBMITTED', 'ACCEPT', 'ADMIN')).toThrow(InvalidTransitionError)
  })

  it('SUBMITTED → REJECTED directly throws InvalidTransitionError', () => {
    expect(() => transition('SUBMITTED', 'REJECT', 'ADMIN')).toThrow(InvalidTransitionError)
  })

  it('ACCEPTED → UNDER_REVIEW throws InvalidTransitionError', () => {
    expect(() => transition('ACCEPTED', 'START_REVIEW', 'ADMIN')).toThrow(InvalidTransitionError)
  })

  it('REJECTED → UNDER_REVIEW throws InvalidTransitionError', () => {
    expect(() => transition('REJECTED', 'START_REVIEW', 'ADMIN')).toThrow(InvalidTransitionError)
  })

  it('ACCEPTED → REJECTED throws InvalidTransitionError', () => {
    expect(() => transition('ACCEPTED', 'REJECT', 'SUPERADMIN')).toThrow(InvalidTransitionError)
  })

  it('REJECTED → ACCEPTED throws InvalidTransitionError', () => {
    expect(() => transition('REJECTED', 'ACCEPT', 'SUPERADMIN')).toThrow(InvalidTransitionError)
  })

  it('SUBMITTED → SUBMITTED (ABANDON on non-UNDER_REVIEW) throws InvalidTransitionError', () => {
    expect(() => transition('SUBMITTED', 'ABANDON', 'SUPERADMIN')).toThrow(InvalidTransitionError)
  })

  // ── Already reviewed guard ──────────────────────────────────────────────────

  it('ACCEPTED → ACCEPT throws AlreadyReviewedError', () => {
    expect(() => transition('ACCEPTED', 'ACCEPT', 'ADMIN')).toThrow(AlreadyReviewedError)
  })

  it('REJECTED → REJECT throws AlreadyReviewedError', () => {
    expect(() => transition('REJECTED', 'REJECT', 'ADMIN')).toThrow(AlreadyReviewedError)
  })

  // ── Error shape assertions ──────────────────────────────────────────────────

  it('InvalidTransitionError carries current and action properties', () => {
    try {
      transition('SUBMITTED', 'ACCEPT', 'ADMIN')
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidTransitionError)
      if (err instanceof InvalidTransitionError) {
        expect(err.current).toBe('SUBMITTED')
        expect(err.action).toBe('ACCEPT')
      }
    }
  })

  it('InsufficientRoleError carries required and actual properties', () => {
    try {
      transition('SUBMITTED', 'START_REVIEW', 'SUBMITTER')
    } catch (err) {
      expect(err).toBeInstanceOf(InsufficientRoleError)
      if (err instanceof InsufficientRoleError) {
        expect(err.required).toBeDefined()
        expect(err.actual).toBe('SUBMITTER')
      }
    }
  })
})
