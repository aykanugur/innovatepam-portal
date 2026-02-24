import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import IdeaCard from '@/components/ideas/idea-card'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Ideas — InnovatEPAM',
}

/**
 * T029 — My ideas page (US-011).
 * Server component: fetches only the authenticated employee's own submissions
 * (both public and private), ordered newest-first.
 * Empty state: "You haven't submitted any ideas yet." with CTA.
 * FR-023, FR-024, FR-025.
 */
export default async function MyIdeasPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/my-ideas')

  const userId = session.user.id

  const ideas = await db.idea.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { displayName: true } } },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F0F0FA' }}>
            My Ideas
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#8888A8' }}>
            Your submitted ideas — both public and private.
          </p>
        </div>
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

      {ideas.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center rounded-2xl py-16 text-center"
          style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="mb-4 text-sm" style={{ color: '#8888A8' }}>
            You haven&apos;t submitted any ideas yet.
          </p>
          <Link
            href="/ideas/new"
            className="rounded-full px-5 py-2 text-sm font-semibold text-white transition"
            style={{
              background: 'linear-gradient(135deg, #00c8ff, #0070f3)',
              boxShadow: '0 2px 12px rgba(0,200,255,0.2)',
            }}
          >
            Submit Your First Idea
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
          {ideas.map((idea) => (
            <li key={idea.id}>
              <IdeaCard
                id={idea.id}
                title={idea.title}
                authorName={idea.author.displayName}
                category={idea.category}
                status={idea.status}
                createdAt={idea.createdAt.toISOString()}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
