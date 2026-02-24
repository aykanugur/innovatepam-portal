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
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      label: 'Submitted',
    },
    UNDER_REVIEW: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      label: 'Under Review',
    },
    ACCEPTED: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      label: 'Accepted',
    },
    REJECTED: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      label: 'Rejected',
    },
  }
