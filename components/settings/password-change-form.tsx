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
        <h2 id="password-change-heading" className="text-lg font-semibold text-gray-900">
          Change Password
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          Use at least 8 characters including one uppercase letter and one number.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {/* Current Password */}
        <div>
          <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
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
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        {/* New Password */}
        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
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
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        {/* Confirm New Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
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
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>

        {/* Client-side confirm mismatch error */}
        {clientError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {clientError}
          </p>
        )}

        {/* Server error */}
        {status === 'error' && serverError && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {serverError}
          </p>
        )}

        {/* Success */}
        {status === 'success' && (
          <p role="status" className="text-sm font-medium text-green-600">
            Password changed successfully.
          </p>
        )}

        <button
          type="submit"
          disabled={
            isPending || !fields.currentPassword || !fields.newPassword || !fields.confirmPassword
          }
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Updating…' : 'Change Password'}
        </button>
      </form>
    </section>
  )
}
