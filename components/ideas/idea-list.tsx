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
      <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-16 text-center">
        <p className="mb-4 text-sm text-muted-foreground">
          No ideas found. Be the first to submit one!
        </p>
        <Link
          href="/ideas/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
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
              className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              ← Previous
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50"
            >
              ← Previous
            </span>
          )}

          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>

          {hasNext ? (
            <Link
              href={buildPageUrl(searchParams, page + 1)}
              className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              Next →
            </Link>
          ) : (
            <span
              aria-disabled="true"
              className="rounded-md border border-input px-3 py-1.5 text-sm font-medium text-muted-foreground opacity-50"
            >
              Next →
            </span>
          )}
        </nav>
      )}
    </div>
  )
}
