/**
 * app/admin/review-config/page.tsx
 *
 * T018 — US1 (Pipeline Config)
 * T011 — US6 (auth guard — accessible regardless of feature flag state)
 *
 * SUPERADMIN-only Server Component.
 * Fetches all 5 pipelines with their stages and renders PipelineConfigForm
 * per category (one form per category slug, even if no pipeline exists yet).
 *
 * Auth: redirect to /forbidden for ADMIN; redirect to /login for unauthenticated.
 * Flag-independence: page is accessible regardless of FEATURE_MULTI_STAGE_REVIEW_ENABLED
 * (FR-016, spec US6 AC-2).
 */

export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import PipelineConfigForm from '@/components/pipeline/pipeline-config-form'
import { CATEGORIES, type CategorySlug } from '@/constants/categories'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pipeline Configuration — InnovatEPAM',
}

export default async function ReviewConfigPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin/review-config')
  }

  // Re-read role from DB (R-007 stale JWT prevention)
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, displayName: true },
  })

  if (!dbUser || dbUser.role !== 'SUPERADMIN') {
    redirect('/forbidden')
  }

  // Fetch all existing pipelines with stages
  const pipelines = await db.reviewPipeline.findMany({
    include: {
      stages: { orderBy: { order: 'asc' } },
    },
  })

  // Build a lookup map: categorySlug → pipeline
  const pipelineBySlug = Object.fromEntries(pipelines.map((p) => [p.categorySlug, p]))

  // EPIC-V2-05: Count UNDER_REVIEW ideas per category for hasActiveReviews warning
  const activeReviewGroups = await db.idea.groupBy({
    by: ['category'],
    where: { status: 'UNDER_REVIEW' },
    _count: { id: true },
  })
  const activeCountBySlug: Record<string, number> = Object.fromEntries(
    activeReviewGroups.map((g) => [g.category ?? '', g._count.id])
  )

  // EPIC-V2-05: Feature flag state for blind review
  const blindReviewFlagEnabled = env.FEATURE_BLIND_REVIEW_ENABLED === 'true'

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: '#060608', fontFamily: 'var(--font-sora), sans-serif' }}
    >
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-[0.04] blur-3xl"
          style={{ background: 'radial-gradient(circle, #00c8ff, transparent)' }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs mb-8" style={{ color: '#8888A8' }}>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
          <span>/</span>
          <span style={{ color: '#F0F0FA' }}>Review Pipeline Config</span>
        </nav>

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold" style={{ color: '#F0F0FA' }}>
            Review Pipeline Configuration
          </h1>
          <p className="mt-1 text-sm" style={{ color: '#8888A8' }}>
            Configure the multi-stage review pipeline for each idea category. Changes apply to all
            new claims.
          </p>
        </div>

        {/* One form per category */}
        <div className="space-y-6">
          {CATEGORIES.map(({ slug }) => (
            <PipelineConfigForm
              key={slug}
              categorySlug={slug as CategorySlug}
              existing={pipelineBySlug[slug] ?? null}
              userRole={dbUser.role}
              featureFlagEnabled={blindReviewFlagEnabled}
              hasActiveReviews={(activeCountBySlug[slug] ?? 0) > 0}
            />
          ))}
        </div>

        {/* Back link */}
        <div className="mt-8">
          <Link href="/admin" className="text-sm hover:underline" style={{ color: '#8888A8' }}>
            ← Back to Admin Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
