/**
 * T004 — Status badge Tailwind class map.
 * Maps each IdeaStatus value to a Tailwind CSS color class set for use in
 * the IdeaCard and IdeaDetail components.
 * FR-015: color-coded badges with text label for accessibility.
 */
import type { IdeaStatus } from '@/lib/generated/prisma/client'

export const STATUS_BADGE_CLASSES: Record<IdeaStatus, { bg: string; text: string; label: string }> =
  {
    SUBMITTED: {
      bg: 'bg-white/[0.08]',
      text: 'text-slate-300',
      label: 'Submitted',
    },
    UNDER_REVIEW: {
      bg: 'bg-amber-400/[0.15]',
      text: 'text-amber-300',
      label: 'Under Review',
    },
    ACCEPTED: {
      bg: 'bg-emerald-500/[0.15]',
      text: 'text-emerald-300',
      label: 'Accepted',
    },
    REJECTED: {
      bg: 'bg-red-500/[0.15]',
      text: 'text-red-400',
      label: 'Rejected',
    },
  }
