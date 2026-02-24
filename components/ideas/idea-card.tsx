/**
 * T015 — Idea card component.
 * Renders a summary card for a single idea: title, author, category label,
 * color-coded status badge, and relative submission time.
 * Links to /ideas/<id> on click (FR-012).
 * Status badge includes both color and text label for color-blind accessibility.
 */
import Link from 'next/link'
import { STATUS_BADGE_CLASSES } from '@/constants/status-badges'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'
import type { IdeaStatus } from '@/lib/generated/prisma/client'

interface IdeaCardProps {
  id: string
  title: string
  authorName: string
  category: string
  status: IdeaStatus
  createdAt: string // ISO 8601
}

/**
 * Returns a human-readable relative time string (FR-012).
 * Within 24 hours: "X hours ago" / "X minutes ago"
 * Beyond 24 hours: locale date string
 */
function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const diffMs = now - then
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function IdeaCard({
  id,
  title,
  authorName,
  category,
  status,
  createdAt,
}: IdeaCardProps) {
  const badge = STATUS_BADGE_CLASSES[status]
  const categoryLabel = CATEGORY_LABEL[category as CategorySlug] ?? category

  return (
    <Link
      href={`/ideas/${id}`}
      className="block rounded-2xl p-5 transition-all duration-200 group"
      style={{
        background: '#1A1A2A',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onMouseEnter={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.border = '1px solid rgba(255,107,0,0.35)'
        el.style.boxShadow = '0 4px 20px rgba(255,107,0,0.1)'
      }}
      onMouseLeave={(e) => {
        const el = e.currentTarget as HTMLElement
        el.style.border = '1px solid rgba(255,255,255,0.08)'
        el.style.boxShadow = 'none'
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="line-clamp-2 text-sm font-semibold" style={{ color: '#F0F0FA' }}>
          {title}
        </h2>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.bg} ${badge.text}`}
          aria-label={`Status: ${badge.label}`}
        >
          {badge.label}
        </span>
      </div>

      <div
        className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs"
        style={{ color: '#8888A8' }}
      >
        <span>{authorName}</span>
        <span aria-hidden>·</span>
        <span>{categoryLabel}</span>
        <span aria-hidden>·</span>
        <time dateTime={createdAt}>{formatRelativeTime(createdAt)}</time>
      </div>
    </Link>
  )
}
