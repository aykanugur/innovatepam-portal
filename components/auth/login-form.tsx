'use client'

import { useState, useTransition } from 'react'
import { z } from 'zod'
import { loginAction } from '@/lib/actions/login'

// ─── Error message map (FR-009: don't reveal which field is wrong) ────────────

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin: 'Invalid email or password.',
  RateLimited: 'Too many login attempts. Please try again in 15 minutes.',
  UnverifiedEmail: 'Please verify your email before signing in.',
  Unknown: 'Sign in failed. Please try again.',
}

// ─── Validation schema ────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

interface LoginFormProps {
  /** Pre-populated error message from URL ?error= param */
  initialError?: string
  callbackUrl?: string
}

export function LoginForm({ initialError, callbackUrl }: LoginFormProps) {
  const [fields, setFields] = useState({ email: '', password: '' })
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})
  const [serverError, setServerError] = useState<string | null>(initialError ?? null)
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    setServerError(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    const result = loginSchema.safeParse(fields)
    if (!result.success) {
      const errs: { email?: string; password?: string } = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as 'email' | 'password'
        if (key && !errs[key]) errs[key] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    startTransition(async () => {
      const res = await loginAction({
        email: result.data.email.toLowerCase().trim(),
        password: result.data.password,
        callbackUrl: callbackUrl,
      })

      // res is undefined on success (redirect was thrown + re-thrown by action)
      if (res?.error) {
        setServerError(ERROR_MESSAGES[res.error] ?? ERROR_MESSAGES.Unknown)
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <h2 className="mb-1 text-xl font-semibold">Sign in</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Welcome back — use your EPAM account to continue.
      </p>

      {serverError && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={fields.email}
            onChange={handleChange}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              fieldErrors.email ? 'border-destructive' : 'border-input'
            }`}
          />
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="mt-1 text-xs text-destructive">
              {fieldErrors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-foreground">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={fields.password}
            onChange={handleChange}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              fieldErrors.password ? 'border-destructive' : 'border-input'
            }`}
          />
          {fieldErrors.password && (
            <p id="password-error" role="alert" className="mt-1 text-xs text-destructive">
              {fieldErrors.password}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        No account?{' '}
        <a href="/register" className="font-medium text-primary hover:underline">
          Create one
        </a>
      </p>
    </div>
  )
}
