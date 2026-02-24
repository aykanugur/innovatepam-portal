'use client'

/**
 * AbandonReviewButton — US-012 FR-030
 *
 * SUPERADMIN-only button that abandons an active review:
 * - Shows Radix AlertDialog confirmation before calling abandonReviewAction
 * - Only rendered when user is SUPERADMIN (hidden for ADMIN — FR-030)
 * - Handles loading state
 *
 * Lives in components/admin/abandon-review-button.tsx (T017)
 */

import { useState, useTransition } from 'react'
import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { abandonReviewAction } from '@/lib/actions/abandon-review'

interface AbandonReviewButtonProps {
  ideaId: string
  /** Only render for SUPERADMIN — caller must gate this component on role */
  role: string
}

export default function AbandonReviewButton({ ideaId, role }: AbandonReviewButtonProps) {
  // FR-030: SUPERADMIN only — do not render for ADMIN
  if (role !== 'SUPERADMIN') return null

  return <AbandonReviewDialog ideaId={ideaId} />
}

function AbandonReviewDialog({ ideaId }: { ideaId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleAbandon() {
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('ideaId', ideaId)
      const result = await abandonReviewAction(undefined, formData)
      if (!result.success) {
        setError(
          result.error === 'UNAUTHENTICATED'
            ? 'You are not signed in.'
            : result.error === 'FORBIDDEN_ROLE'
              ? 'Only a SUPERADMIN can abandon a review.'
              : result.error === 'REVIEW_NOT_FOUND'
                ? 'No active review found for this idea.'
                : `Error: ${result.error ?? 'Unknown error'}`
        )
      }
    })
  }

  return (
    <div className="space-y-2">
      {error && (
        <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>
          {error}
        </p>
      )}

      <AlertDialog.Root>
        <AlertDialog.Trigger asChild>
          <button
            type="button"
            className="rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-90"
            style={{
              border: '1px solid rgba(245,158,11,0.35)',
              color: '#fbbf24',
              background: 'rgba(245,158,11,0.08)',
            }}
          >
            Abandon Review
          </button>
        </AlertDialog.Trigger>

        <AlertDialog.Portal>
          <AlertDialog.Overlay className="fixed inset-0 z-40 bg-black/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />

          <AlertDialog.Content
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 shadow-2xl focus:outline-none"
            style={{ background: '#16162A', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <AlertDialog.Title className="text-base font-semibold" style={{ color: '#F0F0FA' }}>
              Abandon this review?
            </AlertDialog.Title>

            <AlertDialog.Description className="mt-2 text-sm" style={{ color: '#8888A8' }}>
              This will delete the active review and reset the idea status back to{' '}
              <strong style={{ color: '#C0C0D8' }}>Submitted</strong>. Another reviewer can then
              start a new review. This action cannot be undone.
            </AlertDialog.Description>

            <div className="mt-6 flex justify-end gap-3">
              <AlertDialog.Cancel asChild>
                <button
                  type="button"
                  className="rounded-md px-4 py-2 text-sm font-medium transition hover:opacity-80"
                  style={{
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#C0C0D8',
                    background: 'transparent',
                  }}
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>

              <AlertDialog.Action asChild>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleAbandon}
                  className="rounded-md px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  style={{ background: '#d97706' }}
                >
                  {isPending ? 'Abandoning…' : 'Abandon Review'}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  )
}
