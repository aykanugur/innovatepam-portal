/**
 * app/admin/review/[id]/stage/[stageId]/page.tsx
 *
 * T023 — US2 (Admin Claims Stage + PASS)
 *
 * Server Component: the stage review page.
 * - Auth: ADMIN or SUPERADMIN only
 * - Fetches IdeaStageProgress row with stage + idea data
 * - If completed → redirects back to idea review page
 * - If active (startedAt set, completedAt null) → renders StageCompletionPanel
 * - If not yet started → 404
 */

export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import StageCompletionPanel from '@/components/admin/stage-completion-panel'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ id: string; stageId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const idea = await db.idea.findUnique({ where: { id }, select: { title: true } })
  return {
    title: idea
      ? `Stage Review: ${idea.title ?? 'Untitled'} — InnovatEPAM`
      : 'Stage Review — InnovatEPAM',
  }
}

export default async function StageReviewPage({ params }: PageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin')
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, displayName: true },
  })

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPERADMIN')) {
    redirect('/forbidden')
  }

  const { id: ideaId, stageId: progressId } = await params

  // Fetch stage progress with all related data
  const progress = await db.ideaStageProgress.findUnique({
    where: { id: progressId },
    include: {
      stage: true,
      idea: {
        select: {
          id: true,
          title: true,
          status: true,
          category: true,
          author: { select: { displayName: true } },
        },
      },
      reviewer: { select: { displayName: true } },
    },
  })

  if (!progress || progress.ideaId !== ideaId) notFound()
  // Must be assigned to the requesting admin (or SUPERADMIN can view)
  if (dbUser.role !== 'SUPERADMIN' && progress.reviewerId !== session.user.id) {
    redirect('/forbidden')
  }

  // Already completed → back to idea
  if (progress.completedAt !== null) {
    redirect(`/admin/review/${ideaId}`)
  }

  // Not yet started → shouldn't be accessible
  if (progress.startedAt === null) notFound()

  const stage = progress.stage
  const idea = progress.idea

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: '#060608', fontFamily: 'var(--font-sora), sans-serif' }}
    >
      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-6" style={{ color: '#8888A8' }}>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
          <span>/</span>
          <Link href="/admin/review" className="hover:underline">
            Review
          </Link>
          <span>/</span>
          <Link href={`/admin/review/${ideaId}`} className="hover:underline">
            {idea.title ?? 'Untitled'}
          </Link>
          <span>/</span>
          <span style={{ color: '#F0F0FA' }}>{stage.name}</span>
        </nav>

        {/* Idea summary */}
        <div
          className="rounded-xl p-5 mb-6 space-y-2"
          style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between">
            <h1 className="text-lg font-semibold" style={{ color: '#F0F0FA' }}>
              {idea.title ?? 'Untitled Idea'}
            </h1>
            <span
              className="ml-3 flex-shrink-0 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-slate-300"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              {idea.status}
            </span>
          </div>
          <p className="text-xs" style={{ color: '#8888A8' }}>
            Submitted by {idea.author.displayName ?? 'Unknown'} · Category: {idea.category}
          </p>
          <p className="text-xs" style={{ color: '#555577' }}>
            Stage {stage.order}: {stage.name}
            {stage.isDecisionStage && (
              <span
                className="ml-2 rounded-full px-2 py-0.5 text-xs"
                style={{ background: 'rgba(0,200,255,0.1)', color: '#00c8ff' }}
              >
                Decision Stage
              </span>
            )}
          </p>
        </div>

        {/* Stage completion panel */}
        <StageCompletionPanel
          stageProgressId={progress.id}
          isDecisionStage={stage.isDecisionStage}
          stageName={stage.name}
          onSuccess={
            // Client-side redirect handled by router.push; we pass a noop here
            // since this is a Server Component passing to a Client Component.
            // The Server Action calls revalidatePath so navigation will update.
            undefined
          }
        />

        <div className="mt-6">
          <Link
            href={`/admin/review/${ideaId}`}
            className="text-sm hover:underline"
            style={{ color: '#8888A8' }}
          >
            ← Back to idea
          </Link>
        </div>
      </div>
    </div>
  )
}
