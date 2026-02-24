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
        <h2
          id="display-name-heading"
          className="text-lg font-semibold"
          style={{ color: '#F0F0FA' }}
        >
          Display Name
        </h2>
        <p className="mt-1 text-sm" style={{ color: '#8888A8' }}>
          This name is shown on your submitted ideas and in the admin panel.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label
            htmlFor="displayName"
            className="block text-sm font-medium"
            style={{ color: '#C0C0D8' }}
          >
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
            className="mt-1 block w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 disabled:opacity-50"
            style={{
              background: '#0C0C14',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#F0F0FA',
            }}
            placeholder="Your display name"
          />
        </div>

        {status === 'success' && (
          <p role="status" className="text-sm font-medium" style={{ color: '#6ee7b7' }}>
            Display name updated successfully.
          </p>
        )}

        {status === 'error' && (
          <p role="alert" className="text-sm font-medium" style={{ color: '#fca5a5' }}>
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isPending || displayName.trim().length === 0}
          className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
        >
          {isPending ? 'Saving…' : 'Save Display Name'}
        </button>
      </form>
    </section>
  )
}
