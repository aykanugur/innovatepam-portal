import { describe, it, expect } from 'vitest'
import { DisplayNameSchema, ChangePasswordSchema } from '@/lib/validations/user'

// RED phase: these tests MUST fail until lib/validations/user.ts is created (T010)
// FR-018: ChangePasswordSchema MUST match the existing registration password policy:
//         min 8, max 72, ≥1 uppercase, ≥1 lowercase, ≥1 digit

describe('DisplayNameSchema', () => {
  it('empty string rejects', () => {
    const result = DisplayNameSchema.safeParse('')
    expect(result.success).toBe(false)
  })

  it('single character passes', () => {
    const result = DisplayNameSchema.safeParse('A')
    expect(result.success).toBe(true)
  })

  it('exactly 50 characters passes', () => {
    const result = DisplayNameSchema.safeParse('A'.repeat(50))
    expect(result.success).toBe(true)
  })

  it('51 characters rejects', () => {
    const result = DisplayNameSchema.safeParse('A'.repeat(51))
    expect(result.success).toBe(false)
  })

  it('whitespace-only string rejects (trimmed → empty)', () => {
    const result = DisplayNameSchema.safeParse('   ')
    expect(result.success).toBe(false)
  })

  it('leading/trailing whitespace is trimmed and passes if content valid', () => {
    const result = DisplayNameSchema.safeParse('  Alice  ')
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe('Alice')
    }
  })
})

describe('ChangePasswordSchema — FR-018 must match registration policy', () => {
  // ── Valid inputs ─────────────────────────────────────────────────────────────

  it('valid password with uppercase, lowercase, digit passes', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'any-current-password',
      newPassword: 'ValidPass1',
    })
    expect(result.success).toBe(true)
  })

  // ── Password policy violations ───────────────────────────────────────────────

  it('newPassword missing uppercase rejects', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'any-current-password',
      newPassword: 'validpass1', // no uppercase
    })
    expect(result.success).toBe(false)
  })

  it('newPassword missing digit rejects', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'any-current-password',
      newPassword: 'ValidPassNoDigit', // no number
    })
    expect(result.success).toBe(false)
  })

  it('newPassword with only 7 characters rejects — min 8', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'any-current-password',
      newPassword: 'Short1A', // 7 chars
    })
    expect(result.success).toBe(false)
  })

  it('newPassword with exactly 8 characters passes — boundary', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'any-current-password',
      newPassword: 'Valid1Ab', // 8 chars, has uppercase, digit, lowercase
    })
    expect(result.success).toBe(true)
  })

  it('missing currentPassword rejects', () => {
    const result = ChangePasswordSchema.safeParse({
      newPassword: 'ValidPass1',
    })
    expect(result.success).toBe(false)
  })

  it('missing newPassword rejects', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'any-current-password',
    })
    expect(result.success).toBe(false)
  })

  it('newPassword missing lowercase rejects — FR-018 from register-form.tsx', () => {
    const result = ChangePasswordSchema.safeParse({
      currentPassword: 'any-current-password',
      newPassword: 'ALLUPPERCASE1', // no lowercase
    })
    expect(result.success).toBe(false)
  })
})
