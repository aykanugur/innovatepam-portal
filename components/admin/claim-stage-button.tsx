'use client'

/**
 * components/admin/claim-stage-button.tsx
 *
 * T024 — US2 (Admin Claims Stage)
 *
 * Client Component: "Start Review" button that calls claimStage(ideaId).
 * On success redirects to the stage review page.
 * Visible only when FEATURE_MULTI_STAGE_REVIEW_ENABLED=true (enforced by parent).
 */

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { claimStage } from '@/lib/actions/claim-stage'

interface ClaimStageButtonProps {
  ideaId: string
}

export default function ClaimStageButton({ ideaId }: ClaimStageButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClaim() {
    startTransition(async () => {
      const result = await claimStage(ideaId)
      if ('stageProgressId' in result) {
        router.push(`/admin/review/${ideaId}/stage/${result.stageProgressId}`)
      } else {
        // Surface error — in a real UX you'd show a toast; for now a quick alert
        if (typeof window !== 'undefined') {
          window.alert(`Could not start review: ${result.error}`)
        }
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClaim}
      disabled={isPending}
      className="inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
      aria-busy={isPending}
    >
      {isPending ? 'Starting…' : 'Start Review'}
    </button>
  )
}
