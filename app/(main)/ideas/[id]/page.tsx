import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import IdeaDetail from '@/components/ideas/idea-detail'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const idea = await db.idea.findUnique({
    where: { id },
    select: { title: true },
  })
  return { title: idea ? `${idea.title} — InnovatEPAM` : 'Idea — InnovatEPAM' }
}

/**
 * T022 — Idea detail page (US-010).
 * Server component: fetches idea detail, enforces visibility rules,
 * and passes current session user info to IdeaDetail for delete affordance logic.
 */
export default async function IdeaDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const { id } = await params
  const userId = session.user.id
  const role = session.user.role ?? 'SUBMITTER'

  const idea = await db.idea.findUnique({
    where: { id },
    include: {
      author: { select: { displayName: true } },
      review: {
        include: { reviewer: { select: { displayName: true } } },
      },
    },
  })

  if (!idea) notFound()

  const canAccess =
    role === 'ADMIN' ||
    role === 'SUPERADMIN' ||
    idea.visibility === 'PUBLIC' ||
    idea.authorId === userId

  if (!canAccess) notFound()

  const attachmentEnabled = process.env.FEATURE_FILE_ATTACHMENT_ENABLED === 'true'

  const currentUserRecord = await db.user.findUnique({
    where: { id: userId },
    select: { displayName: true },
  })

  const currentUser = {
    id: userId,
    displayName:
      currentUserRecord?.displayName ?? session.user.name ?? session.user.email ?? 'Unknown',
    role,
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/ideas" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to ideas
        </Link>
      </div>

      <IdeaDetail
        id={idea.id}
        title={idea.title}
        description={idea.description}
        category={idea.category}
        status={idea.status}
        visibility={idea.visibility}
        authorName={idea.author.displayName}
        authorId={idea.authorId}
        createdAt={idea.createdAt.toISOString()}
        attachmentUrl={idea.attachmentPath}
        review={
          idea.review
            ? {
                // decision and comment are nullable (set only when finalized)
                decision: idea.review.decision as 'ACCEPTED' | 'REJECTED' | null,
                comment: idea.review.comment,
                reviewerName: idea.review.reviewer.displayName ?? 'Reviewer',
                reviewedAt:
                  idea.review.decidedAt?.toISOString() ?? idea.review.createdAt.toISOString(),
              }
            : null
        }
        currentUser={currentUser}
        attachmentEnabled={attachmentEnabled}
      />
    </div>
  )
}
