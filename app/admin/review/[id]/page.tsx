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
import { STATUS_BADGE_CLASSES } from '@/constants/status-badges'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const idea = await db.idea.findUnique({ where: { id }, select: { title: true } })
  return { title: idea ? `Review: ${idea.title} — InnovatEPAM` : 'Review — InnovatEPAM' }
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
    },
  })

  if (!idea) notFound()

  const isSuperAdmin = dbUser.role === 'SUPERADMIN'
  const isDecided = idea.status === 'ACCEPTED' || idea.status === 'REJECTED'
  const isUnderReview = idea.status === 'UNDER_REVIEW'

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
            {idea.title}
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
                {idea.title}
              </h1>
              <p className="text-sm" style={{ color: '#8888A8' }}>
                By {idea.author.displayName} ·{' '}
                {CATEGORY_LABEL[idea.category as CategorySlug] ?? idea.category} ·{' '}
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
            {idea.description}
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
          />
        )}

        {/* Review Action Panel — shown for SUBMITTED and UNDER_REVIEW */}
        {!isDecided && (
          <ReviewActionPanel
            idea={{ id: idea.id, status: idea.status, authorId: idea.authorId }}
            currentUser={currentUser}
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
            className="text-sm transition-colors hover:text-white"
            style={{ color: '#8888A8' }}
          >
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
