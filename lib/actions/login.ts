'use server'

import { AuthError } from 'next-auth'
import { signIn } from '@/auth'

export type LoginActionResult =
  | { error: 'CredentialsSignin' | 'RateLimited' | 'UnverifiedEmail' | 'Unknown' }
  | undefined // undefined = success (NEXT_REDIRECT thrown and re-thrown)

/**
 * Server Action: authenticate with CredentialsProvider.
 * Throws NEXT_REDIRECT on success (must be re-thrown by caller).
 * Returns { error: code } on auth failure so the client form can display
 * the appropriate message without a full page navigation.
 */
export async function loginAction(data: {
  email: string
  password: string
  callbackUrl?: string
}): Promise<LoginActionResult> {
  try {
    await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirectTo: validateCallbackUrl(data.callbackUrl),
    })
  } catch (err) {
    // NEXT_REDIRECT is thrown by signIn on success — must be re-thrown
    if (isNextRedirect(err)) throw err

    if (err instanceof AuthError) {
      switch (err.type) {
        case 'CredentialsSignin': {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const code = (err as any).code as string | undefined
          const knownCodes = ['CredentialsSignin', 'RateLimited', 'UnverifiedEmail'] as const
          type KnownCode = (typeof knownCodes)[number]
          const errorCode: KnownCode = (
            knownCodes.includes(code as KnownCode) ? code : 'CredentialsSignin'
          ) as KnownCode
          return { error: errorCode }
        }
        default:
          return { error: 'Unknown' }
      }
    }

    return { error: 'Unknown' }
  }
}

/**
 * FR-011: validate callbackUrl is a same-origin relative path.
 * Reject absolute URLs to prevent open redirect attacks.
 */
function validateCallbackUrl(url: string | undefined): string {
  if (!url) return '/dashboard'
  if (url.startsWith('/') && !url.includes('://')) return url
  return '/dashboard'
}

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as Record<string, unknown>).digest === 'string' &&
    String((err as Record<string, unknown>).digest).startsWith('NEXT_REDIRECT')
  )
}
