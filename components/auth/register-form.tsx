'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'

// ─── Validation schema (FR-001, FR-003) ──────────────────────────────────────

const registerSchema = z
  .object({
    email: z
      .string()
      .min(1, 'Email is required')
      .max(255)
      .email('Enter a valid email address')
      .refine(
        (v) => v.toLowerCase().endsWith('@epam.com'),
        'Only @epam.com addresses are permitted.'
      ),
    displayName: z.string().max(100).optional().or(z.literal('')),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password must be at most 72 characters')
      .refine((v) => /[A-Z]/.test(v), 'Must contain at least one uppercase letter')
      .refine((v) => /[a-z]/.test(v), 'Must contain at least one lowercase letter')
      .refine((v) => /[0-9]/.test(v), 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RegisterFields = z.infer<typeof registerSchema>
type FieldErrors = Partial<Record<keyof RegisterFields, string>>

// ─── Component ────────────────────────────────────────────────────────────────

export function RegisterForm() {
  const router = useRouter()

  const [fields, setFields] = useState<RegisterFields>({
    email: '',
    displayName: '',
    password: '',
    confirmPassword: '',
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    setServerError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)

    // FR-003: client-side validation before sending to server
    const result = registerSchema.safeParse(fields)
    if (!result.success) {
      const errs: FieldErrors = {}
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof RegisterFields
        if (key && !errs[key]) errs[key] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: result.data.email,
          password: result.data.password,
          displayName: result.data.displayName || undefined,
        }),
      })

      if (res.status === 201) {
        router.push('/register/check-email')
        return
      }

      const body = await res.json().catch(() => ({}))

      if (res.status === 409) {
        setServerError(body.error ?? 'An account with this email already exists')
        return
      }

      setServerError(body.error ?? 'Registration failed. Please try again.')
    } catch {
      setServerError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
      <h2 className="mb-1 text-xl font-semibold">Create account</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        Use your <strong>@epam.com</strong> email address to register.
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
        <Field
          label="Email"
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          value={fields.email}
          error={fieldErrors.email}
          onChange={handleChange}
          required
        />
        <Field
          label="Display Name"
          id="displayName"
          name="displayName"
          type="text"
          autoComplete="name"
          value={fields.displayName ?? ''}
          error={fieldErrors.displayName}
          onChange={handleChange}
          hint="Optional — defaults to your email local part"
        />
        <Field
          label="Password"
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          value={fields.password}
          error={fieldErrors.password}
          onChange={handleChange}
          required
        />
        <Field
          label="Confirm Password"
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={fields.confirmPassword}
          error={fieldErrors.confirmPassword}
          onChange={handleChange}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <a href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </a>
      </p>
    </div>
  )
}

// ─── Field sub-component ──────────────────────────────────────────────────────

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: string
}

function Field({ label, error, hint, id, ...rest }: FieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        aria-invalid={!!error}
        className={`w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
          error ? 'border-destructive' : 'border-input'
        }`}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  )
}
