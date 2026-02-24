'use client'

/**
 * T026 — Admin delete button component.
 * Uses Radix AlertDialog for ADMIN/SUPERADMIN. No name-match required (R-005).
 * Shows "Delete Idea" trigger → "Are you sure?" confirmation → "Delete" / "Cancel".
 * On confirm, calls deleteIdeaAction.
 * FR-020.
 */

import { useState } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { deleteIdeaAction } from '@/lib/actions/delete-idea'

interface AdminDeleteButtonProps {
  ideaId: string
}

export default function AdminDeleteButton({ ideaId }: AdminDeleteButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setLoading(true)
    setError(null)

    const result = await deleteIdeaAction(ideaId)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success, deleteIdeaAction redirects — no cleanup needed
  }

  return (
    <div className="space-y-2">
      <AlertDialog.Root>
        <AlertDialog.Trigger asChild>
          <button
            type="button"
            className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 hover:border-red-300"
          >
            Delete Idea (Admin)
          </button>
        </AlertDialog.Trigger>

        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />

          <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-background p-6 shadow-xl focus:outline-none">
            <AlertDialog.Title className="text-base font-semibold text-foreground">
              Delete this idea?
            </AlertDialog.Title>

            <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
              As an admin you can delete this idea. This action cannot be undone.
            </AlertDialog.Description>

            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="rounded-md border border-input px-4 py-2 text-sm font-medium text-foreground hover:bg-accent disabled:opacity-50"
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? 'Deleting…' : 'Delete'}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}
