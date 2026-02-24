/**
 * lib/validations/user.ts
 *
 * Zod schemas for user profile and password change (US-015, FR-018).
 *
 * FR-018: ChangePasswordSchema MUST match the registration password policy
 * defined in app/api/auth/register/route.ts and components/auth/register-form.tsx:
 *   - min 8 chars, max 72 chars
 *   - at least 1 uppercase letter
 *   - at least 1 lowercase letter
 *   - at least 1 digit
 */
import { z } from 'zod'

// ─── Shared password policy constants (single source of truth) ────────────────
// Kept in sync with app/api/auth/register/route.ts — FR-018
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

export const passwordPolicySchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`)
  .refine((v) => /[A-Z]/.test(v), 'Must contain at least one uppercase letter')
  .refine((v) => /[a-z]/.test(v), 'Must contain at least one lowercase letter')
  .refine((v) => /[0-9]/.test(v), 'Must contain at least one number')

// ─── Display name ─────────────────────────────────────────────────────────────

export const DisplayNameSchema = z
  .string()
  .transform((v) => v.trim())
  .refine((v) => v.length >= 1, 'Display name is required')
  .refine((v) => v.length <= 50, 'Display name must be 50 characters or fewer')

export type DisplayNameInput = z.infer<typeof DisplayNameSchema>

// ─── Password change ──────────────────────────────────────────────────────────

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordPolicySchema,
})

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>
