import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { maskAuthorIfBlind } from '@/lib/blind-review'
import IdeaDetail from '@/components/ideas/idea-detail'
import { AttachmentsTable, type AttachmentRow } from '@/components/ideas/attachments-table'
import StageProgressStepper from '@/components/ideas/stage-progress-stepper'
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
      // T012 — fetch attachments ordered by upload date (US-023, FR-001)
      attachments: { orderBy: { createdAt: 'asc' } },
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
  const multiAttachmentEnabled = process.env.FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'
  const smartFormsEnabled = process.env.FEATURE_SMART_FORMS_ENABLED === 'true'
  const multiStageEnabled = process.env.FEATURE_MULTI_STAGE_REVIEW_ENABLED === 'true'

  // T015 — fetch field template for the idea's category when flag is on (FR-010)
  let fieldTemplates: FieldDefinition[] | null = null
  if (smartFormsEnabled) {
    const template = idea.category
      ? await db.categoryFieldTemplate.findUnique({
          where: { category: idea.category },
        })
      : null
    fieldTemplates = template ? (template.fields as unknown as FieldDefinition[]) : null
  }

  // T036 — fetch stage progress for stepper (US5)
  const stageProgress = multiStageEnabled
    ? await db.ideaStageProgress.findMany({
        where: { ideaId: id },
        include: {
          stage: { select: { name: true, order: true, isDecisionStage: true } },
          reviewer: { select: { displayName: true } },
        },
        orderBy: { stage: { order: 'asc' } },
      })
    : []

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

  // EPIC-V2-05: Blind Review — mask author identity from ADMINs during active review
  const blindReviewPipeline = await db.reviewPipeline.findFirst({
    where: { categorySlug: idea.category ?? '' },
    select: { blindReview: true },
  })
  const maskedAuthorName = maskAuthorIfBlind({
    authorId: idea.authorId,
    authorDisplayName: idea.author.displayName,
    requesterId: userId,
    requesterRole: role,
    pipelineBlindReview: blindReviewPipeline?.blindReview ?? false,
    ideaStatus: idea.status,
    featureFlagEnabled: env.FEATURE_BLIND_REVIEW_ENABLED === 'true',
  })

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
        title={idea.title ?? 'Untitled'}
        description={idea.description ?? ''}
        category={idea.category ?? ''}
        status={idea.status}
        visibility={idea.visibility}
        authorName={maskedAuthorName}
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

      {/* T036 — Stage progress stepper (US5) */}
      {stageProgress.length > 0 && (
        <div className="mt-6">
          <StageProgressStepper
            stageProgress={stageProgress.map((sp) => ({
              id: sp.id,
              startedAt: sp.startedAt,
              completedAt: sp.completedAt,
              outcome: sp.outcome as 'PASS' | 'ESCALATE' | 'ACCEPTED' | 'REJECTED' | null,
              comment: sp.comment,
              stage: sp.stage,
              reviewer: sp.reviewer,
            }))}
            viewerRole={
              role === 'ADMIN' || role === 'SUPERADMIN'
                ? (role as 'ADMIN' | 'SUPERADMIN')
                : 'SUBMITTER'
            }
          />
        </div>
      )}

      {/* T012 — Multi-attachments list (US-023) */}
      {multiAttachmentEnabled && idea.attachments.length > 0 && (
        <div className="mt-6">
          <AttachmentsTable
            attachments={idea.attachments.map(
              (a): AttachmentRow => ({
                id: a.id,
                fileName: a.fileName,
                fileSize: a.fileSize,
                mimeType: a.mimeType,
                createdAt: a.createdAt,
              })
            )}
            canDelete={false}
          />
        </div>
      )}
    </div>
  )
}
