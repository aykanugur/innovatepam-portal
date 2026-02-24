/**
 * T018 — Idea list component with pagination controls.
 * Renders a grid of IdeaCard components.
 * Shows "Previous / Page X of Y / Next" controls (disabled at boundaries).
 * Empty state: "No ideas found. Be the first to submit one!" with Submit CTA.
 * FR-014.
 */
import Link from 'next/link'
import IdeaCard from '@/components/ideas/idea-card'
import type { IdeaStatus } from '@/lib/generated/prisma/client'

interface IdeaSummary {
  id: string
  title: string
  authorName: string
  category: string
  status: IdeaStatus
  createdAt: string
}

interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

interface IdeaListProps {
  ideas: IdeaSummary[]
  meta: PaginationMeta
  /** Current URL query params (for pagination links) */
  searchParams: Record<string, string | string[] | undefined>
}

function buildPageUrl(params: Record<string, string | string[] | undefined>, page: number): string {
  const p = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (key === 'page') continue
    if (val !== undefined) p.set(key, String(val))
  }
  p.set('page', String(page))
  return `/ideas?${p.toString()}`
}

export default function IdeaList({ ideas, meta, searchParams }: IdeaListProps) {
  const { page, totalPages } = meta
  const hasPrev = page > 1
  const hasNext = page < totalPages

  if (ideas.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl py-16 text-center"
        style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="mb-4 text-sm" style={{ color: '#8888A8' }}>
          No ideas found. Be the first to submit one!
        </p>
        <Link
          href="/ideas/new"
          className="rounded-full px-5 py-2 text-sm font-semibold text-white transition"
          style={{
            background: 'linear-gradient(135deg, #00c8ff, #0070f3)',
            boxShadow: '0 2px 12px rgba(0,200,255,0.2)',
          }}
        >
          Submit Idea
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Idea grid */}
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
        {ideas.map((idea) => (
          <li key={idea.id}>
            <IdeaCard
              id={idea.id}
              title={idea.title}
              authorName={idea.authorName}
              category={idea.category}
              status={idea.status}
              createdAt={idea.createdAt}
            />
          </li>
        ))}
      </ul>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-4">
          {hasPrev ? (
            <Link
              href={buildPageUrl(searchParams, page - 1)}
              className="rounded-full px-4 py-1.5 text-sm font-medium text-white transition"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#C0C0D8' }}
            >
              ← Previous
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="rounded-full px-4 py-1.5 text-sm font-medium opacity-30"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#60607A' }}
            >
              ← Previous
            </span>
          )}

          <span className="text-sm" style={{ color: '#8888A8' }}>
            Page {page} of {totalPages}
          </span>

          {hasNext ? (
            <Link
              href={buildPageUrl(searchParams, page + 1)}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition"
              style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#C0C0D8' }}
            >
              Next →
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="rounded-full px-4 py-1.5 text-sm font-medium opacity-30"
              style={{ border: '1px solid rgba(255,255,255,0.08)', color: '#60607A' }}
            >
              Next →
            </span>
          )}
        </nav>
      )}
    </div>
  )
}
