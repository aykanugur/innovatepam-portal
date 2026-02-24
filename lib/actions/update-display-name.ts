'use server'

/**
 * lib/actions/update-display-name.ts
 *
 * Server Action: Update Display Name (US-015).
 *
 * - Authenticates session (any role: SUBMITTER, ADMIN, SUPERADMIN)
 * - Validates with DisplayNameSchema (trimmed, 1–50 chars)
 * - Updates User.displayName in the database
 * - Revalidates paths that render the user's name
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { DisplayNameSchema } from '@/lib/validations/user'

export interface UpdateDisplayNameResult {
  success: boolean
  error?: string
}

export async function updateDisplayNameAction(
  _prevState: unknown,
  formData: FormData
): Promise<UpdateDisplayNameResult>
export async function updateDisplayNameAction(args: {
  displayName: string
}): Promise<UpdateDisplayNameResult>
export async function updateDisplayNameAction(
  argsOrPrevState?: { displayName: string } | unknown,
  formData?: FormData
): Promise<UpdateDisplayNameResult> {
  // Resolve the displayName from either call signature
  let rawDisplayName: string | undefined

  if (formData instanceof FormData) {
    rawDisplayName = (formData.get('displayName') as string | null) ?? undefined
  } else if (
    argsOrPrevState !== null &&
    typeof argsOrPrevState === 'object' &&
    'displayName' in (argsOrPrevState as object)
  ) {
    rawDisplayName = (argsOrPrevState as { displayName: string }).displayName
  }

  // Authenticate
  const session = await auth()
  if (!session?.user?.id) {
    return { success: false, error: 'UNAUTHENTICATED' }
  }

  // Validate
  const parsed = DisplayNameSchema.safeParse(rawDisplayName)
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message ?? 'Invalid display name'
    return { success: false, error: message }
  }

  const displayName = parsed.data

  // Persist
  await db.user.update({
    where: { id: session.user.id },
    data: { displayName },
  })

  // Revalidate nav and settings page so the updated name is reflected
  revalidatePath('/settings')
  revalidatePath('/', 'layout')

  return { success: true }
}
