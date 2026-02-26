/**
 * app/admin/review/[id]/page.tsx — T018
 *
 * Admin Review page — US-012
 * - Role guard: ADMIN or SUPERADMIN only (FR-001)
 * - Fetches idea with review relation + author
 * - ACCEPTED/REJECTED → renders DecisionCard
 * - SUBMITTED/UNDER_REVIEW → renders ReviewActionPanel
 * - SUPERADMIN gets AbandonReviewButton (UNDER_REVIEW only — FR-030)
 */

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import ReviewActionPanel from '@/components/admin/review-action-panel'
import DecisionCard from '@/components/admin/decision-card'
import AbandonReviewButton from '@/components/admin/abandon-review-button'
import type { AttachmentRow } from '@/components/ideas/attachments-table'
import { STATUS_BADGE_CLASSES } from '@/constants/status-badges'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'
import type { FieldDefinition } from '@/types/field-template'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const idea = await db.idea.findUnique({ where: { id }, select: { title: true } })
  return {
    title: idea ? `Review: ${idea.title ?? 'Untitled'} — InnovatEPAM` : 'Review — InnovatEPAM',
  }
}

export default async function AdminReviewPage({ params }: PageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin')
  }

  // Re-read role from DB to prevent stale JWT (research.md R-007)
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, displayName: true },
  })

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPERADMIN')) {
    redirect('/forbidden')
  }

  const { id } = await params

  const idea = await db.idea.findUnique({
    where: { id },
    include: {
      author: { select: { displayName: true } },
      review: {
        include: { reviewer: { select: { displayName: true } } },
      },
      // T016 — fetch attachments for admin delete affordance (US-025)
      attachments: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!idea) notFound()

  // T029 — Defence-in-depth: DRAFT ideas must never be accessible in admin review
  if (idea.status === 'DRAFT') notFound()

  const isSuperAdmin = dbUser.role === 'SUPERADMIN'
  const isDecided = idea.status === 'ACCEPTED' || idea.status === 'REJECTED'
  const isUnderReview = idea.status === 'UNDER_REVIEW'

  // T014 — fetch field template for the idea's category when Smart Forms flag is on
  const smartFormsEnabled = process.env.FEATURE_SMART_FORMS_ENABLED === 'true'
  const multiAttachmentEnabled = process.env.FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'
  let fieldTemplates: FieldDefinition[] | null = null
  if (smartFormsEnabled) {
    const template = idea.category
      ? await db.categoryFieldTemplate.findUnique({
          where: { category: idea.category },
        })
      : null
    fieldTemplates = template ? (template.fields as unknown as FieldDefinition[]) : null
  }

  const currentUser = {
    id: session.user.id,
    role: dbUser.role,
  }

  return (
    <main className="min-h-screen p-8" style={{ background: '#060608' }}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm" style={{ color: '#8888A8' }}>
          <Link href="/admin" className="transition-colors hover:text-white">
            Admin Dashboard
          </Link>
          <span>/</span>
          <span className="font-medium truncate max-w-xs" style={{ color: '#F0F0FA' }}>
            {idea.title ?? 'Untitled'}
          </span>
        </nav>

        {/* Idea Summary Card */}
        <div
          className="rounded-xl p-6 space-y-3"
          style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold" style={{ color: '#F0F0FA' }}>
                {idea.title ?? 'Untitled'}
              </h1>
              <p className="text-sm" style={{ color: '#8888A8' }}>
                By {idea.author.displayName} ·{' '}
                {idea.category
                  ? (CATEGORY_LABEL[idea.category as CategorySlug] ?? idea.category)
                  : 'No category'}{' '}
                ·{' '}
                {new Date(idea.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
            <span
              className={`shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                STATUS_BADGE_CLASSES[idea.status]?.bg ?? 'bg-white/10'
              } ${STATUS_BADGE_CLASSES[idea.status]?.text ?? 'text-slate-300'}`}
            >
              {STATUS_BADGE_CLASSES[idea.status]?.label ?? idea.status}
            </span>
          </div>

          <p className="text-sm whitespace-pre-wrap" style={{ color: '#D0D0E8' }}>
            {idea.description ?? ''}
          </p>
        </div>

        {/* Decision Card — shown when already decided */}
        {isDecided && idea.review && (
          <DecisionCard
            review={{
              decision: idea.review.decision as 'ACCEPTED' | 'REJECTED',
              comment: idea.review.comment,
              decidedAt: idea.review.decidedAt,
              reviewer: idea.review.reviewer,
            }}
            dynamicFields={idea.dynamicFields as Record<string, unknown> | null}
            fieldTemplates={fieldTemplates}
            smartFormsEnabled={smartFormsEnabled}
          />
        )}

        {/* Review Action Panel — shown for SUBMITTED and UNDER_REVIEW */}
        {!isDecided && (
          <ReviewActionPanel
            idea={{ id: idea.id, status: idea.status, authorId: idea.authorId }}
            currentUser={currentUser}
            attachments={idea.attachments.map(
              (a): AttachmentRow => ({
                id: a.id,
                fileName: a.fileName,
                fileSize: a.fileSize,
                mimeType: a.mimeType,
                createdAt: a.createdAt,
              })
            )}
            multiAttachmentEnabled={multiAttachmentEnabled}
          />
        )}

        {/* Abandon Review Button — SUPERADMIN + UNDER_REVIEW only (FR-030) */}
        {isSuperAdmin && isUnderReview && (
          <AbandonReviewButton ideaId={idea.id} role={dbUser.role} />
        )}

        {/* Back link */}
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#8888A8] bg-white/[0.04] border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            ← Back to Admin
          </Link>
        </div>
      </div>
    </main>
  )
}
