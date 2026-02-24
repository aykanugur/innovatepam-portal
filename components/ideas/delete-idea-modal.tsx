'use client'

/**
 * T023 — Delete idea confirmation modal for idea authors.
 * Uses Radix UI Dialog for accessibility: focus trap, Escape-to-close,
 * backdrop is non-dismissible (must use Cancel button or Escape per FR-019).
 *
 * "Confirm Delete" button stays disabled until the text input value matches
 * session.user.displayName exactly (case-sensitive, leading/trailing trimmed).
 * On confirm, calls deleteIdeaAction server action.
 * FR-019 / R-001.
 */

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { deleteIdeaAction } from '@/lib/actions/delete-idea'

interface DeleteIdeaModalProps {
  ideaId: string
  /** The authenticated user's displayName — must match exactly to confirm */
  userDisplayName: string
}

export default function DeleteIdeaModal({ ideaId, userDisplayName }: DeleteIdeaModalProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const trimmed = inputValue.trim()
  const isConfirmed = trimmed === userDisplayName

  async function handleConfirm() {
    if (!isConfirmed) return
    setLoading(true)
    setError(null)

    const result = await deleteIdeaAction(ideaId)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, deleteIdeaAction redirects to /my-ideas — no need to setLoading(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setInputValue('')
      setError(null)
    }
    setOpen(nextOpen)
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:border-red-300"
        >
          Delete Idea
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />

        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-6 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
          aria-describedby="delete-modal-description"
        >
          <Dialog.Title className="text-base font-semibold text-foreground">
            Delete this idea?
          </Dialog.Title>

          <p id="delete-modal-description" className="mt-2 text-sm text-muted-foreground">
            This action cannot be undone. To confirm, type your display name{' '}
            <strong className="text-foreground">{userDisplayName}</strong> below.
          </p>

          <div className="mt-4 space-y-1">
            <label htmlFor="confirm-name" className="block text-sm font-medium text-foreground">
              Your display name
            </label>
            <input
              id="confirm-name"
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={userDisplayName}
              autoComplete="off"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              aria-describedby={error ? 'delete-modal-error' : undefined}
            />
          </div>

          {error && (
            <p id="delete-modal-error" role="alert" className="mt-2 text-xs text-red-600">
              {error}
            </p>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <Dialog.Close asChild>
              <button
                type="button"
                disabled={loading}
                className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
              >
                Cancel
              </button>
            </Dialog.Close>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={!isConfirmed || loading}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
