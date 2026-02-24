/**
 * Skeleton loading UI for the My Ideas page.
 * Shown automatically by Next.js App Router while the async page component
 * resolves its DB queries.
 * Mirrors the real page layout: back link · header · 4-card grid.
 */
import type { CSSProperties } from 'react'

function SkeletonPulse({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)', ...style }}
    />
  )
}

function IdeaCardSkeleton() {
  return (
    <li
      className="rounded-2xl p-5 space-y-3"
      style={{
        background: '#1A1A2A',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Top row: status badge + visibility pill */}
      <div className="flex items-center justify-between gap-2">
        <SkeletonPulse className="h-5 w-20 rounded-full" />
        <SkeletonPulse className="h-5 w-14 rounded-full" />
      </div>

      {/* Title — 2 lines */}
      <div className="space-y-2">
        <SkeletonPulse className="h-4 w-full" />
        <SkeletonPulse className="h-4 w-2/3" />
      </div>

      {/* Footer: author dot date */}
      <div className="flex items-center gap-2 pt-1">
        <SkeletonPulse className="h-3 w-24" />
        <SkeletonPulse className="h-1.5 w-1.5 rounded-full" />
        <SkeletonPulse className="h-3 w-20" />
      </div>
    </li>
  )
}

export default function MyIdeasLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <SkeletonPulse className="h-7 w-28 rounded-full" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonPulse className="h-7 w-28" />
          <SkeletonPulse className="h-4 w-64" />
        </div>
        <SkeletonPulse className="h-9 w-28 rounded-full" />
      </div>

      {/* Card grid */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {Array.from({ length: 4 }).map((_, i) => (
          <IdeaCardSkeleton key={i} />
        ))}
      </ul>
    </div>
  )
}
