/**
 * app/admin/resolve/[progressId]/page.tsx
 *
 * T032 companion — US3 (Escalation)
 *
 * Server Component: SUPERADMIN-only escalation resolution page.
 * Renders ResolveEscalationForm with full escalation context.
 */

export const dynamic = 'force-dynamic'

import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import ResolveEscalationForm from '@/components/admin/resolve-escalation-form'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'
import type { Metadata } from 'next'

interface PageProps {
  params: Promise<{ progressId: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { progressId } = await params
  const progress = await db.ideaStageProgress.findUnique({
    where: { id: progressId },
    include: { idea: { select: { title: true } } },
  })
  return {
    title: progress?.idea?.title
      ? `Resolve Escalation: ${progress.idea.title} — InnovatEPAM`
      : 'Resolve Escalation — InnovatEPAM',
  }
}

export default async function ResolveEscalationPage({ params }: PageProps) {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin')
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPERADMIN')) {
    redirect('/forbidden')
  }

  const isSuperAdmin = dbUser.role === 'SUPERADMIN'
  const { progressId } = await params

  const progress = await db.ideaStageProgress.findUnique({
    where: { id: progressId },
    include: {
      idea: {
        select: { id: true, title: true, category: true, status: true },
      },
      stage: { select: { name: true, order: true } },
      reviewer: { select: { displayName: true } },
    },
  })

  if (!progress) notFound()
  if (progress.outcome !== 'ESCALATE') notFound()

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
          <Link href={`/admin/review/${idea.id}`} className="hover:underline">
            {idea.title ?? 'Untitled'}
          </Link>
          <span>/</span>
          <span style={{ color: '#F0F0FA' }}>Resolve Escalation</span>
        </nav>

        {/* Context card */}
        <div
          className="rounded-xl p-5 mb-6 space-y-2"
          style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h1 className="text-lg font-semibold" style={{ color: '#F0F0FA' }}>
            {idea.title ?? 'Untitled Idea'}
          </h1>
          <p className="text-xs" style={{ color: '#8888A8' }}>
            {CATEGORY_LABEL[idea.category as CategorySlug] ?? idea.category} · Stage{' '}
            {progress.stage.order}: {progress.stage.name}
          </p>
          <p className="text-xs" style={{ color: '#555577' }}>
            Escalated by {progress.reviewer?.displayName ?? 'Unknown'}
          </p>
        </div>

        <ResolveEscalationForm
          stageProgressId={progressId}
          isSuperAdmin={isSuperAdmin}
          ideaTitle={idea.title ?? 'Untitled'}
        />

        <div className="mt-6">
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#8888A8' }}>
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
