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
    <div>
      {/* Heading */}
      <h2
        className="mb-1 font-bold tracking-tight"
        style={{ fontSize: '1.75rem', letterSpacing: '-0.03em', color: '#F0F0FA' }}
      >
        Welcome back
      </h2>
      <p className="mb-8 text-sm" style={{ color: '#8888A8' }}>
        Sign in to your EPAM account to continue.
      </p>

      {/* Server error banner */}
      {serverError && (
        <div
          role="alert"
          className="mb-5 rounded-lg px-4 py-3 text-sm"
          style={{
            background: 'rgba(239,68,68,0.12)',
            color: '#F87171',
            border: '1px solid rgba(239,68,68,0.25)',
          }}
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#C0C0D8' }}
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@epam.com"
            value={fields.email}
            onChange={handleChange}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={fieldErrors.email ? 'email-error' : undefined}
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition"
            style={{
              background: '#1A1A2A',
              border: fieldErrors.email
                ? '1px solid rgba(239,68,68,0.6)'
                : '1px solid rgba(255,255,255,0.1)',
              color: '#F0F0FA',
            }}
          />
          {fieldErrors.email && (
            <p id="email-error" role="alert" className="mt-1 text-xs" style={{ color: '#F87171' }}>
              {fieldErrors.email}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium"
            style={{ color: '#C0C0D8' }}
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            value={fields.password}
            onChange={handleChange}
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition"
            style={{
              background: '#1A1A2A',
              border: fieldErrors.password
                ? '1px solid rgba(239,68,68,0.6)'
                : '1px solid rgba(255,255,255,0.1)',
              color: '#F0F0FA',
            }}
          />
          {fieldErrors.password && (
            <p
              id="password-error"
              role="alert"
              className="mt-1 text-xs"
              style={{ color: '#F87171' }}
            >
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition"
          style={{
            background: isPending ? '#CC5500' : 'linear-gradient(135deg, #FF6B00, #FF8C38)',
            opacity: isPending ? 0.7 : 1,
            cursor: isPending ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 12px rgba(255,107,0,0.35)',
          }}
        >
          {isPending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Footer link */}
      <p className="mt-7 text-center text-sm" style={{ color: '#8888A8' }}>
        Don&apos;t have an account?{' '}
        <a href="/register" className="font-medium transition" style={{ color: '#FF6B00' }}>
          Create one
        </a>
      </p>
    </div>
  )
}
