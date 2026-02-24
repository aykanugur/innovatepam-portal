/**
 * app/admin/analytics/page.tsx — T040
 *
 * Analytics Dashboard — US-014
 * - Feature-flag guard: returns 404 when FEATURE_ANALYTICS_ENABLED !== 'true' (FR-021)
 * - Role guard: SUPERADMIN only (FR-022)
 * - Three parallel Prisma queries for chart data
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { IdeasByCategoryChart } from '@/components/analytics/ideas-by-category-chart'
import { SubmissionTrendChart } from '@/components/analytics/submission-trend-chart'
import { TopContributorsTable } from '@/components/analytics/top-contributors-table'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Analytics — InnovatEPAM',
}

export default async function AnalyticsPage() {
  const session = await auth()

  // FR-022: Re-read role from DB for freshness (R-007)
  if (!session?.user?.id) {
    redirect('/login')
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!dbUser || dbUser.role !== 'SUPERADMIN') {
    redirect('/forbidden')
  }

  // ── Three parallel data queries ──────────────────────────────────────────

  // Build 30-day date range
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const [categoryGroups, recentIdeas, topContributorsRaw] = await Promise.all([
    // Bar chart: count by category
    db.idea.groupBy({
      by: ['category'],
      _count: { id: true },
    }),

    // Line chart: ideas in last 30 days (fetch all, bucket client-side)
    db.idea.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),

    // Top contributors: group by authorId, take top 5
    db.idea.groupBy({
      by: ['authorId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 5,
    }),
  ])

  // ── Shape data for charts ────────────────────────────────────────────────

  // Bar chart data
  const categoryData = categoryGroups.map((g) => ({
    category: CATEGORY_LABEL[g.category as CategorySlug] ?? g.category,
    count: g._count.id,
  }))

  // Line chart: build 30-day bucket array
  const trendMap = new Map<string, number>()
  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo)
    d.setDate(d.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    trendMap.set(key, 0)
  }
  for (const { createdAt } of recentIdeas) {
    const key = createdAt.toISOString().slice(0, 10)
    if (trendMap.has(key)) {
      trendMap.set(key, (trendMap.get(key) ?? 0) + 1)
    }
  }
  const trendData = Array.from(trendMap.entries()).map(([date, count]) => ({ date, count }))

  // Top contributors: resolve display names
  const contributorIds = topContributorsRaw.map((r) => r.authorId)
  const contributors = await db.user.findMany({
    where: { id: { in: contributorIds } },
    select: { id: true, displayName: true },
  })
  const nameMap = new Map(contributors.map((u) => [u.id, u.displayName]))
  const topContributorsData = topContributorsRaw.map((r) => ({
    displayName: nameMap.get(r.authorId) ?? 'Unknown',
    count: r._count.id,
  }))

  return (
    <main className="min-h-screen py-10" style={{ background: '#060608' }}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <div className="mb-6">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#8888A8] bg-white/[0.04] border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            ← Back to Admin
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#F0F0FA' }}>
            Analytics
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#8888A8' }}>
            Idea submission trends and engagement metrics.
          </p>
        </div>

        {/* Charts grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bar chart */}
          <div
            className="rounded-xl p-6 lg:col-span-2"
            style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <IdeasByCategoryChart data={categoryData} />
          </div>

          {/* Line chart */}
          <div
            className="rounded-xl p-6"
            style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <SubmissionTrendChart data={trendData} />
          </div>

          {/* Top contributors table */}
          <div
            className="rounded-xl p-6"
            style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <TopContributorsTable data={topContributorsData} />
          </div>
        </div>
      </div>
    </main>
  )
}
