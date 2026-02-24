'use server'

import { auth, signOut } from '@/auth'

/**
 * Server Action: destroy the current session and redirect to /login.
 * US-006 AC-4: session destroyed, cookie cleared on signOut.
 * FR-019: structured logout event logged to stdout.
 */
export async function logoutAction() {
  const session = await auth()

  console.log(
    JSON.stringify({
      event: 'logout',
      userId: session?.user?.id ?? 'unknown',
      ts: new Date().toISOString(),
    })
  )

  await signOut({ redirectTo: '/login' })
}
