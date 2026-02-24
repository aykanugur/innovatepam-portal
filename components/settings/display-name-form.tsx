'use client'

/**
 * components/settings/display-name-form.tsx
 *
 * Client component: Update display name form (US-015, FR-016).
 * Pre-filled with current user display name; shows success/error feedback.
 */

import { useState, useTransition } from 'react'
import { updateDisplayNameAction } from '@/lib/actions/update-display-name'

interface DisplayNameFormProps {
  currentDisplayName: string
}

export function DisplayNameForm({ currentDisplayName }: DisplayNameFormProps) {
  const [displayName, setDisplayName] = useState(currentDisplayName)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('idle')
    setErrorMessage('')

    startTransition(async () => {
      const result = await updateDisplayNameAction({ displayName })
      if (result.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setErrorMessage(result.error ?? 'Something went wrong. Please try again.')
      }
    })
  }

  return (
    <section aria-labelledby="display-name-heading">
      <div className="mb-4">
        <h2 id="display-name-heading" className="text-lg font-semibold text-gray-900">
          Display Name
        </h2>
        <p className="mt-1 text-sm text-gray-600">
          This name is shown on your submitted ideas and in the admin panel.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
            Display Name
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            minLength={1}
            maxLength={50}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value)
              setStatus('idle')
            }}
            disabled={isPending}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="Your display name"
          />
        </div>

        {status === 'success' && (
          <p role="status" className="text-sm font-medium text-green-600">
            Display name updated successfully.
          </p>
        )}

        {status === 'error' && (
          <p role="alert" className="text-sm font-medium text-red-600">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || displayName.trim().length === 0}
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save Display Name'}
        </button>
      </form>
    </section>
  )
}
