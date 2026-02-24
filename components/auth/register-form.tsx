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
    <div>
      {/* Heading */}
      <h2
        className="mb-1 font-bold tracking-tight text-gray-900"
        style={{ fontSize: '1.75rem', letterSpacing: '-0.03em' }}
      >
        Create account
      </h2>
      <p className="mb-8 text-sm text-gray-500">
        Use your <strong className="text-gray-700">@epam.com</strong> email address to register.
      </p>

      {serverError && (
        <div
          role="alert"
          className="mb-5 rounded-lg px-4 py-3 text-sm"
          style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
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
          className="mt-2 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition"
          style={{
            background: loading ? '#3b82f6' : 'linear-gradient(135deg, #1d4ed8, #4f46e5)',
            opacity: loading ? 0.75 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
          }}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <a href="/login" className="font-medium transition" style={{ color: '#4f46e5' }}>
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
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={id}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        aria-invalid={!!error}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition"
        style={{
          border: error ? '1px solid #f87171' : '1px solid #d1d5db',
          background: '#fafafa',
          boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        }}
        {...rest}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-gray-400">
          {hint}
        </p>
      )}
    </div>
  )
}
