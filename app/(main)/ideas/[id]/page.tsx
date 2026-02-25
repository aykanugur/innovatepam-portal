import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import IdeaDetail from '@/components/ideas/idea-detail'
import type { FieldDefinition } from '@/types/field-template'
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
  const smartFormsEnabled = process.env.FEATURE_SMART_FORMS_ENABLED === 'true'

  // T015 — fetch field template for the idea's category when flag is on (FR-010)
  let fieldTemplates: FieldDefinition[] | null = null
  if (smartFormsEnabled) {
    const template = await db.categoryFieldTemplate.findUnique({
      where: { category: idea.category },
    })
    fieldTemplates = template ? (template.fields as unknown as FieldDefinition[]) : null
  }

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
        <Link
          href="/ideas"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#8888A8] bg-white/[0.04] border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200"
        >
          ← Browse Ideas
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
        dynamicFields={idea.dynamicFields as Record<string, unknown> | null}
        fieldTemplates={fieldTemplates}
        smartFormsEnabled={smartFormsEnabled}
      />
    </div>
  )
}
