import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import IdeaList from '@/components/ideas/idea-list'
import CategoryFilter from '@/components/ideas/category-filter'
import { IdeaListQuerySchema } from '@/lib/validations/idea'
import type { Metadata } from 'next'
import type { CategorySlug } from '@/constants/categories'

export const metadata: Metadata = {
  title: 'Browse Ideas — InnovatEPAM',
}

/**
 * T019 — Browse all public ideas page (US-009).
 * Server component: reads page + category from searchParams, fetches from DB
 * directly (no intermediate API hop for SSR), renders CategoryFilter + IdeaList.
 * Out-of-bounds page shows empty state (not 404) per R-006 + spec §Edge Cases.
 */
interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function IdeasPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/ideas')

  const params = await searchParams
  const rawPage = typeof params.page === 'string' ? params.page : undefined
  const rawCategory = typeof params.category === 'string' ? params.category : undefined

  const queryResult = IdeaListQuerySchema.safeParse({
    page: rawPage,
    category: rawCategory,
  })

  // On invalid params, fall back to defaults (don't 400 an HTML page)
  const { page, pageSize, category } = queryResult.success
    ? queryResult.data
    : { page: 1, pageSize: 20, category: undefined }

  const skip = (page - 1) * pageSize
  const userId = session.user.id
  const role = session.user.role ?? 'SUBMITTER'

  const visibilityFilter =
    role === 'ADMIN' || role === 'SUPERADMIN'
      ? {}
      : {
          OR: [
            { visibility: 'PUBLIC' as const },
            { authorId: userId, visibility: 'PRIVATE' as const },
          ],
        }

  const categoryFilter = category ? { category } : {}
  const where = { ...visibilityFilter, ...categoryFilter }

  const [rawIdeas, totalItems] = await Promise.all([
    db.idea.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { author: { select: { displayName: true } } },
    }),
    db.idea.count({ where }),
  ])

  const ideas = rawIdeas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    category: idea.category,
    status: idea.status,
    visibility: idea.visibility,
    authorName: idea.author.displayName,
    createdAt: idea.createdAt.toISOString(),
  }))

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ideas</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalItems} idea{totalItems !== 1 ? 's' : ''} total
          </p>
        </div>

        <a
          href="/ideas/new"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
        >
          Submit Idea
        </a>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-4">
        <CategoryFilter currentCategory={category} />
      </div>

      {/* Idea list + pagination */}
      <IdeaList
        ideas={ideas}
        meta={{ page, pageSize, totalItems, totalPages }}
        searchParams={params as Record<string, string | string[] | undefined>}
      />
    </div>
  )
}
