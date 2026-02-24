/**
 * Skeleton loading UI for the Browse Ideas page.
 * Shown automatically by Next.js App Router while the async page component
 * resolves its DB queries.
 * Mirrors the real page layout: header · category filter · 6-card grid.
 */

function SkeletonPulse({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? ''}`}
      style={{ background: 'rgba(255,255,255,0.06)' }}
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
      {/* Top row: status badge left + category pill right */}
      <div className="flex items-center justify-between gap-2">
        <SkeletonPulse className="h-5 w-20 rounded-full" />
        <SkeletonPulse className="h-5 w-16 rounded-full" />
      </div>

      {/* Title — 2 lines */}
      <div className="space-y-2">
        <SkeletonPulse className="h-4 w-full" />
        <SkeletonPulse className="h-4 w-3/4" />
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

export default function IdeasLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonPulse className="h-7 w-24" />
          <SkeletonPulse className="h-4 w-32" />
        </div>
        <SkeletonPulse className="h-9 w-28 rounded-full" />
      </div>

      {/* Category filter chips */}
      <div className="flex items-center gap-2">
        {[56, 80, 64, 72, 60, 80].map((w, i) => (
          <div
            key={i}
            className="h-8 rounded-full animate-pulse"
            style={{ width: w, background: 'rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>

      {/* Card grid */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {Array.from({ length: 6 }).map((_, i) => (
          <IdeaCardSkeleton key={i} />
        ))}
      </ul>

      {/* Pagination placeholder */}
      <div className="flex items-center justify-center gap-4 pt-2">
        <SkeletonPulse className="h-8 w-20 rounded-full" />
        <SkeletonPulse className="h-4 w-28" />
        <SkeletonPulse className="h-8 w-20 rounded-full" />
      </div>
    </div>
  )
}
