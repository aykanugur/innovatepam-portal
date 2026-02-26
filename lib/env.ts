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
  // T002 — Smart Forms: category-specific dynamic fields (FR-010)
  FEATURE_SMART_FORMS_ENABLED: z.string().default('false'),
  // T001 (US-022) — Multi-Media Attachments: private Vercel Blob storage
  // Empty string is treated as "not set" (local filesystem fallback is used)
  BLOB_READ_WRITE_TOKEN: z
    .string()
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  // T001 (US-022) — Multi-Media Attachments: gates upload/download/delete (FR-019)
  FEATURE_MULTI_ATTACHMENT_ENABLED: z.string().default('false'),
  // T001 — Draft Management: gates draft creation and editing (FR-014)
  FEATURE_DRAFT_ENABLED: z.string().default('false'),
  // T001 — Draft Management: secret for cron endpoint auth (FR-010, FR-017)
  CRON_SECRET: z.string().min(32, 'CRON_SECRET must be at least 32 characters'),
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
