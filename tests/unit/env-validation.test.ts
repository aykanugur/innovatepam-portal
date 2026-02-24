import { describe, it, expect } from 'vitest'
import { ZodError } from 'zod'
import { envSchema } from '@/lib/env'

describe('lib/env.ts — envSchema validation', () => {
  it('throws ZodError with DATABASE_URL in issues when DATABASE_URL is missing', () => {
    const envWithoutDb = {
      DIRECT_URL: 'postgresql://user:pass@direct.neon.tech/db',
      AUTH_SECRET: 'a-secret-that-is-at-least-32-chars-long!!',
      NEXTAUTH_URL: 'http://localhost:3000',
      SUPERADMIN_EMAIL: 'admin@epam.com',
    }

    let thrownError: ZodError | null = null
    try {
      envSchema.parse(envWithoutDb)
    } catch (err) {
      thrownError = err as ZodError
    }

    expect(thrownError).toBeInstanceOf(ZodError)
    expect(thrownError!.issues[0].path).toContain('DATABASE_URL')
  })

  it('passes when all required variables are provided', () => {
    const validEnv = {
      DATABASE_URL: 'postgresql://user:pass@pooler.neon.tech/db',
      DIRECT_URL: 'postgresql://user:pass@direct.neon.tech/db',
      AUTH_SECRET: 'a-secret-that-is-at-least-32-chars-long!!',
      NEXTAUTH_URL: 'http://localhost:3000',
      SUPERADMIN_EMAIL: 'admin@epam.com',
    }

    expect(() => envSchema.parse(validEnv)).not.toThrow()
  })

  it('applies default "true" for PORTAL_ENABLED when not provided', () => {
    const result = envSchema.parse({
      DATABASE_URL: 'postgresql://user:pass@pooler.neon.tech/db',
      DIRECT_URL: 'postgresql://user:pass@direct.neon.tech/db',
      AUTH_SECRET: 'a-secret-that-is-at-least-32-chars-long!!',
      NEXTAUTH_URL: 'http://localhost:3000',
      SUPERADMIN_EMAIL: 'admin@epam.com',
    })
    expect(result.PORTAL_ENABLED).toBe('true')
  })
})
