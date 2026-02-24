'use client'

/**
 * components/settings/password-change-form.tsx
 *
 * Client component: Change password form (US-015, FR-017, FR-018, FR-019).
 * Three fields: current password, new password, confirm new password.
 * Client-side confirm equality check before sending to server.
 * Clears all fields on success.
 */

import { useState, useTransition } from 'react'
import { updatePasswordAction } from '@/lib/actions/update-password'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CURRENT_PASSWORD: 'Current password is incorrect.',
  UNAUTHENTICATED: 'Your session has expired. Please sign in again.',
  USER_NOT_FOUND: 'User account not found. Please sign in again.',
}

export function PasswordChangeForm() {
  const [fields, setFields] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [clientError, setClientError] = useState('')
  const [serverError, setServerError] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isPending, startTransition] = useTransition()

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setFields((prev) => ({ ...prev, [name]: value }))
    setClientError('')
    setServerError('')
    setStatus('idle')
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setClientError('')
    setServerError('')
    setStatus('idle')

    // FR-019: client-side confirm check before any server request
    if (fields.newPassword !== fields.confirmPassword) {
      setClientError('Passwords do not match.')
      return
    }

    startTransition(async () => {
      const result = await updatePasswordAction({
        currentPassword: fields.currentPassword,
        newPassword: fields.newPassword,
      })

      if (result.success) {
        setStatus('success')
        setFields({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setStatus('error')
        const msg = result.error
          ? (ERROR_MESSAGES[result.error] ?? result.error)
          : 'Something went wrong. Please try again.'
        setServerError(msg)
      }
    })
  }

  return (
    <section aria-labelledby="password-change-heading">
      <div className="mb-4">
        <h2
          id="password-change-heading"
          className="text-lg font-semibold"
          style={{ color: '#F0F0FA' }}
        >
          Change Password
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#8888A8' }}>
          Use at least 8 characters including one uppercase letter and one number.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {/* Current Password */}
        <div>
          <label
            htmlFor="currentPassword"
            className="block text-sm font-medium"
            style={{ color: '#C0C0D8' }}
          >
            Current Password
          </label>
          <input
            id="currentPassword"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            value={fields.currentPassword}
            onChange={handleChange}
            disabled={isPending}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              background: '#0C0C14',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#F0F0FA',
            }}
          />
        </div>

        {/* New Password */}
        <div>
          <label
            htmlFor="newPassword"
            className="block text-sm font-medium"
            style={{ color: '#C0C0D8' }}
          >
            New Password
          </label>
          <input
            id="newPassword"
            name="newPassword"
            type="password"
            required
            autoComplete="new-password"
            value={fields.newPassword}
            onChange={handleChange}
            disabled={isPending}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              background: '#0C0C14',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#F0F0FA',
            }}
          />
        </div>

        {/* Confirm New Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium"
            style={{ color: '#C0C0D8' }}
          >
            Confirm New Password
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={fields.confirmPassword}
            onChange={handleChange}
            disabled={isPending}
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              background: '#0C0C14',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#F0F0FA',
            }}
          />
        </div>

        {/* Client-side confirm mismatch error */}
        {clientError && (
          <p role="alert" className="text-sm font-medium" style={{ color: '#fca5a5' }}>
            {clientError}
          </p>
        )}

        {/* Server error */}
        {status === 'error' && serverError && (
          <p role="alert" className="text-sm font-medium" style={{ color: '#fca5a5' }}>
            {serverError}
          </p>
        )}

        {/* Success */}
        {status === 'success' && (
          <p role="status" className="text-sm font-medium" style={{ color: '#6ee7b7' }}>
            Password changed successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={
            isPending || !fields.currentPassword || !fields.newPassword || !fields.confirmPassword
          }
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
        >
          {isPending ? 'Updating…' : 'Change Password'}
        </button>
      </form>
    </section>
  )
}
