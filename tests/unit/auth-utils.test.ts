import { describe, it, expect } from 'vitest'
import { hashPassword, comparePassword, generateToken } from '@/lib/auth-utils'

describe('hashPassword', () => {
  it('returns a bcrypt hash string', async () => {
    const hash = await hashPassword('MyPassword1')
    expect(hash).toMatch(/^\$2[ab]\$/)
  })

  it('produces a different hash on each call (salt randomness)', async () => {
    const hash1 = await hashPassword('MyPassword1')
    const hash2 = await hashPassword('MyPassword1')
    expect(hash1).not.toBe(hash2)
  })
})

describe('comparePassword', () => {
  it('returns true when password matches the hash', async () => {
    const hash = await hashPassword('CorrectHorse99')
    const result = await comparePassword('CorrectHorse99', hash)
    expect(result).toBe(true)
  })

  it('returns false when password does not match hash', async () => {
    const hash = await hashPassword('CorrectHorse99')
    const result = await comparePassword('WrongPassword1', hash)
    expect(result).toBe(false)
  })
})

describe('generateToken', () => {
  it('returns a 64-character hex string', () => {
    const token = generateToken()
    expect(token).toHaveLength(64)
    expect(token).toMatch(/^[0-9a-f]{64}$/)
  })

  it('generates unique tokens on each call', () => {
    const token1 = generateToken()
    const token2 = generateToken()
    expect(token1).not.toBe(token2)
  })
})
