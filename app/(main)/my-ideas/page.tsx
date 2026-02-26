import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import IdeaCard from '@/components/ideas/idea-card'
import DraftsTab, { type DraftRow } from '@/components/ideas/drafts-tab'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Ideas — InnovatEPAM',
}

/**
 * T016 — Draft Management: Redesigned My Ideas page with Tabs.
 *
 * "Submitted" tab: all non-draft ideas ordered newest-first.
 * "Drafts" tab: active + expired drafts (only when FEATURE_DRAFT_ENABLED=true).
 * Fetches both in parallel with Promise.all. FR-023, FR-024, FR-025.
 */
export default async function MyIdeasPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/my-ideas')

  const userId = session.user.id
  const draftEnabled = env.FEATURE_DRAFT_ENABLED === 'true'
  const now = new Date()

  // Guard draft queries with .catch() in case T003 (Neon migration) hasn't been
  // applied yet — gracefully disables draft UI rather than throwing (FR-010).
  let draftFeatureActive = draftEnabled

  type DraftFetchRow = {
    id: string
    title: string | null
    category: string | null
    updatedAt: Date
    draftExpiresAt: Date | null
    isExpiredDraft: boolean
  }

  const [ideas, activeDrafts, expiredDrafts] = await Promise.all([
    db.idea.findMany({
      where: { authorId: userId, status: { not: 'DRAFT' } },
      orderBy: { createdAt: 'desc' },
      include: { author: { select: { displayName: true } } },
    }),
    draftEnabled
      ? db.idea
          .findMany({
            where: {
              authorId: userId,
              status: 'DRAFT',
              isExpiredDraft: false,
              draftExpiresAt: { gt: now },
            },
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              title: true,
              category: true,
              updatedAt: true,
              draftExpiresAt: true,
              isExpiredDraft: true,
            },
          })
          .catch(() => {
            draftFeatureActive = false
            return [] as DraftFetchRow[]
          })
      : Promise.resolve([] as DraftFetchRow[]),
    draftEnabled
      ? db.idea
          .findMany({
            where: {
              authorId: userId,
              status: 'DRAFT',
              OR: [{ isExpiredDraft: true }, { draftExpiresAt: { lte: now } }],
            },
            orderBy: { updatedAt: 'desc' },
            select: {
              id: true,
              title: true,
              category: true,
              updatedAt: true,
              draftExpiresAt: true,
              isExpiredDraft: true,
            },
          })
          .catch(() => [] as DraftFetchRow[])
      : Promise.resolve([] as DraftFetchRow[]),
  ])

  const activeDraftRows: DraftRow[] = activeDrafts.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    updatedAt: d.updatedAt.toISOString(),
    draftExpiresAt: d.draftExpiresAt?.toISOString() ?? null,
    isExpiredDraft: d.isExpiredDraft,
  }))

  const expiredDraftRows: DraftRow[] = expiredDrafts.map((d) => ({
    id: d.id,
    title: d.title,
    category: d.category,
    updatedAt: d.updatedAt.toISOString(),
    draftExpiresAt: d.draftExpiresAt?.toISOString() ?? null,
    isExpiredDraft: d.isExpiredDraft,
  }))

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#8888A8] bg-white/[0.04] border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          ← Dashboard
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#F0F0FA' }}>
            My Ideas
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: '#8888A8' }}>
            Your submitted ideas and saved drafts.
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
          New Idea
        </Link>
      </div>

      <Tabs defaultValue="submitted">
        <TabsList className="bg-white/[0.06] border border-white/10 rounded-full p-1 h-auto">
          <TabsTrigger
            value="submitted"
            className="rounded-full px-4 py-1.5 text-sm font-medium text-[#8888A8] data-[state=active]:bg-white/[0.12] data-[state=active]:text-white data-[state=active]:shadow-none transition-all"
          >
            Submitted
          </TabsTrigger>
          {draftFeatureActive && (
            <TabsTrigger
              value="drafts"
              className="rounded-full px-4 py-1.5 text-sm font-medium text-[#8888A8] data-[state=active]:bg-white/[0.12] data-[state=active]:text-white data-[state=active]:shadow-none transition-all"
            >
              Drafts
              {activeDraftRows.length > 0 && (
                <span
                  className="ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-bold"
                  style={{ background: 'rgba(0,200,255,0.15)', color: '#00c8ff' }}
                >
                  {activeDraftRows.length}
                </span>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="submitted" className="pt-4">
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
                    title={idea.title ?? 'Untitled'}
                    authorName={idea.author.displayName}
                    category={idea.category ?? ''}
                    status={idea.status}
                    createdAt={idea.createdAt.toISOString()}
                  />
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        {draftFeatureActive && (
          <TabsContent value="drafts" className="pt-4">
            <DraftsTab drafts={activeDraftRows} expiredDrafts={expiredDraftRows} userId={userId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
