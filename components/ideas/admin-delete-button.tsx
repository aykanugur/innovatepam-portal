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
            className="rounded-full px-5 py-2 text-sm font-medium transition"
            style={{ border: '1px solid rgba(239,68,68,0.4)', color: '#F87171' }}
          >
            Delete Idea (Admin)
          </button>
        </AlertDialog.Trigger>

        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />

          <AlertDialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 shadow-2xl focus:outline-none"
            style={{ background: '#16162A', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <AlertDialog.Title className="text-base font-semibold" style={{ color: '#F0F0FA' }}>
              Delete this idea?
            </AlertDialog.Title>

            <AlertDialog.Description className="mt-2 text-sm" style={{ color: '#8888A8' }}>
              As an admin you can delete this idea. This action cannot be undone.
            </AlertDialog.Description>

            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  disabled={loading}
                  className="rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-50"
                  style={{ border: '1px solid rgba(255,255,255,0.1)', color: '#A0A0BC' }}
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={loading}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: 'rgba(239,68,68,0.85)' }}
                >
                  {loading ? 'Deleting…' : 'Delete'}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      {error ? (
        <p role="alert" className="text-xs" style={{ color: '#F87171' }}>
          {error}
        </p>
      ) : null}
    </div>
  )
}
