import { z } from 'zod'

export const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  // Auth
  AUTH_SECRET: z.string().min(32),
  NEXTAUTH_URL: z.string().url(),
  // Email (Resend)
  RESEND_API_KEY: z.string().optional(),
  // Rate Limiting (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
  // Seeding
  SUPERADMIN_EMAIL: z.string().email(),
  // Feature flags — default to disabled (opt-in per environment)
  PORTAL_ENABLED: z.string().default('true'),
  FEATURE_EMAIL_VERIFICATION_ENABLED: z.string().default('false'),
  FEATURE_USER_MANAGEMENT_ENABLED: z.string().default('false'),
  FEATURE_FILE_ATTACHMENT_ENABLED: z.string().default('false'),
  FEATURE_ANALYTICS_ENABLED: z.string().default('false'),
})

export type Env = z.infer<typeof envSchema>

/**
 * Validated environment variables. Throws a ZodError at startup if any
 * required variable is missing, failing fast with a clear, named error.
 *
 * In test environments, import `envSchema` directly — do NOT import this
 * binding, as it evaluates process.env at module load time.
 */
/* v8 ignore next 3 */
export const env: Env = process.env.VITEST ? ({} as Env) : envSchema.parse(process.env)
