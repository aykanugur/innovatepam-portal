'use server'

/**
 * lib/actions/update-password.ts
 *
 * Server Action: Change Password (US-015, FR-017, FR-018, FR-019).
 *
 * - Authenticates session (any role)
 * - Validates with ChangePasswordSchema (min 8 chars, 1 uppercase, 1 digit)
 * - Compares currentPassword against stored bcrypt hash
 * - Hashes newPassword with the same bcrypt helper used at registration
 * - Updates User.passwordHash in the database
 */

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { comparePassword, hashPassword } from '@/lib/auth-utils'
import { ChangePasswordSchema } from '@/lib/validations/user'

export interface UpdatePasswordResult {
  success: boolean
  error?: string
}

export async function updatePasswordAction(
  _prevState: unknown,
  formData: FormData
): Promise<UpdatePasswordResult>
export async function updatePasswordAction(args: {
  currentPassword: string
  newPassword: string
}): Promise<UpdatePasswordResult>
export async function updatePasswordAction(
  argsOrPrevState?: { currentPassword: string; newPassword: string } | unknown,
  formData?: FormData
): Promise<UpdatePasswordResult> {
  // Resolve inputs from either call signature
  let currentPassword: string | undefined
  let newPassword: string | undefined

  if (formData instanceof FormData) {
    currentPassword = (formData.get('currentPassword') as string | null) ?? undefined
    newPassword = (formData.get('newPassword') as string | null) ?? undefined
  } else if (
    argsOrPrevState !== null &&
    typeof argsOrPrevState === 'object' &&
    'currentPassword' in (argsOrPrevState as object)
  ) {
    const args = argsOrPrevState as { currentPassword: string; newPassword: string }
    currentPassword = args.currentPassword
    newPassword = args.newPassword
  }

  // Authenticate
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHENTICATED' }
  }

  // Validate schema (policy: min 8, 1 uppercase, 1 digit)
  const parsed = ChangePasswordSchema.safeParse({ currentPassword, newPassword })
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? 'Invalid password'
    return { success: false, error: message }
  }

  // Fetch the stored hash
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!user) {
    return { success: false, error: 'USER_NOT_FOUND' }
  }

  // FR-017: verify current password
  const passwordMatch = await comparePassword(parsed.data.currentPassword, user.passwordHash)
  if (!passwordMatch) {
    return { success: false, error: 'INVALID_CURRENT_PASSWORD' }
  }

  // Hash the new password using the same bcrypt helper as registration
  const newHash = await hashPassword(parsed.data.newPassword)

  await db.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  })

  return { success: true }
}
