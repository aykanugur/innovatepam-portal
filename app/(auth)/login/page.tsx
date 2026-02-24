import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { LoginForm } from '@/components/auth/login-form'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; verified?: string; callbackUrl?: string }>
}

// Error code → human-readable message mapping (FR-009, FR-018, FR-008)
const ERROR_MAP: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password.',
  RateLimited: 'Too many login attempts. Please try again in 15 minutes.',
  UnverifiedEmail: 'Please verify your email before signing in.',
}

export const metadata = {
  title: 'Sign in — InnovatEPAM',
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  // Redirect already-authenticated users (proxy.ts also handles this)
  const session = await auth()
  if (session) redirect('/dashboard')

  const { error, verified, callbackUrl } = await searchParams

  const initialError = error ? (ERROR_MAP[error] ?? 'Sign in failed. Please try again.') : undefined

  return (
    <>
      {verified === '1' && (
        <div
          role="status"
          className="mb-4 rounded-md bg-primary/10 px-4 py-3 text-sm font-medium text-primary"
        >
          Email verified! You can now sign in.
        </div>
      )}
      <LoginForm initialError={initialError} callbackUrl={callbackUrl} />
    </>
  )
}
