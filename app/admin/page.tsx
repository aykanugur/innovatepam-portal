/**
 * app/admin/page.tsx — T022 (US-013)
 *
 * Admin dashboard — ADMIN+ protected RSC.
 * - force-dynamic: no caching (FR-013)
 * - Role guard: ADMIN or SUPERADMIN only (FR-014)
 * - Parallel Prisma queries for stats and pending queue
 * - Renders DashboardStats + PendingQueue
 */

export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import DashboardStats from '@/components/admin/dashboard-stats'
import PendingQueue from '@/components/admin/pending-queue'

export default async function AdminPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin')
  }

  // Re-read role from DB to prevent stale JWT (R-007)
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, displayName: true, email: true },
  })

  if (!dbUser || (dbUser.role !== 'ADMIN' && dbUser.role !== 'SUPERADMIN')) {
    redirect('/forbidden')
  }

  const isSuperAdmin = dbUser.role === 'SUPERADMIN'

  // Parallel queries — FR-013 requires always-fresh data
  const [groupByStatus, pendingIdeas] = await Promise.all([
    db.idea.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    db.idea.findMany({
      where: { status: 'SUBMITTED' },
      orderBy: { createdAt: 'asc' }, // oldest-first (FR-012)
      include: {
        author: { select: { displayName: true } },
      },
    }),
  ])

  // Map groupBy result to stats object
  const countByStatus = Object.fromEntries(
    groupByStatus.map(({ status, _count }) => [status, _count._all])
  )

  const stats = {
    total:
      (countByStatus['SUBMITTED'] ?? 0) +
      (countByStatus['UNDER_REVIEW'] ?? 0) +
      (countByStatus['ACCEPTED'] ?? 0) +
      (countByStatus['REJECTED'] ?? 0),
    submitted: countByStatus['SUBMITTED'] ?? 0,
    underReview: countByStatus['UNDER_REVIEW'] ?? 0,
    accepted: countByStatus['ACCEPTED'] ?? 0,
    rejected: countByStatus['REJECTED'] ?? 0,
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as <span className="font-medium">{dbUser.displayName ?? dbUser.email}</span> —{' '}
            <span className="font-medium">{dbUser.role}</span>
          </p>
        </header>

        {/* Stats overview */}
        <DashboardStats stats={stats} />

        {/* Pending review queue */}
        <PendingQueue
          ideas={pendingIdeas.map((idea) => ({
            id: idea.id,
            title: idea.title,
            category: idea.category,
            createdAt: idea.createdAt.toISOString(),
            author: { displayName: idea.author.displayName },
          }))}
        />

        {/* Extra admin actions */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {isSuperAdmin && process.env.FEATURE_USER_MANAGEMENT_ENABLED === 'true' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">User Management</h2>
              <p className="mt-2 text-sm text-gray-500">Manage user roles and platform access.</p>
              <Link
                href="/admin/users"
                className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Manage Users
              </Link>
            </div>
          )}

          {isSuperAdmin && process.env.FEATURE_ANALYTICS_ENABLED === 'true' && (
            <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-800">Analytics</h2>
              <p className="mt-2 text-sm text-gray-500">Submission trends and category insights.</p>
              <Link
                href="/admin/analytics"
                className="mt-4 inline-block rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 transition-colors"
              >
                View Analytics
              </Link>
            </div>
          )}
        </div>

        <div>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
