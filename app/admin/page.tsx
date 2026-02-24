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
import { GlowCard } from '@/components/ui/glow-card'

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
    <div
      className="min-h-screen text-white"
      style={{ background: '#060608', fontFamily: 'var(--font-sora), sans-serif' }}
    >
      {/* Ambient bg */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 85% 0%, rgba(255,59,92,0.12) 0%, transparent 60%)',
          }}
          className="absolute inset-0"
        />
        <div
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 5% 90%, rgba(139,92,246,0.1) 0%, transparent 60%)',
          }}
          className="absolute inset-0"
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Nav */}
      <header
        className="sticky top-0 z-50 flex items-center justify-between px-8 py-3.5"
        style={{
          background: 'rgba(6,6,8,0.85)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight" style={{ color: '#00c8ff' }}>
              &lt;epam&gt;
            </span>
            <span className="font-semibold text-base tracking-tight text-white">InnovatEPAM</span>
          </Link>
          <span className="text-sm font-medium" style={{ color: '#ff3b5c' }}>
            Admin
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
        >
          ← Dashboard
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-6 py-12 space-y-10">
        {/* Header */}
        <div>
          <div
            className="inline-flex items-center gap-2 mb-4 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(255,59,92,0.1)',
              border: '1px solid rgba(255,59,92,0.25)',
              color: '#ff3b5c',
            }}
          >
            🛡️ {dbUser.role}
          </div>
          <h1
            className="font-bold text-white"
            style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', letterSpacing: '-0.03em' }}
          >
            Admin{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #ff3b5c, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Dashboard
            </span>
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {dbUser.displayName ?? dbUser.email}
          </p>
        </div>

        {/* Stats */}
        <DashboardStats stats={stats} />

        {/* Pending queue */}
        <PendingQueue
          ideas={pendingIdeas.map((idea) => ({
            id: idea.id,
            title: idea.title,
            category: idea.category,
            createdAt: idea.createdAt.toISOString(),
            author: { displayName: idea.author.displayName },
          }))}
        />

        {/* SuperAdmin actions */}
        {isSuperAdmin && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {[
              {
                href: '/admin/users',
                icon: '👥',
                label: 'User Management',
                desc: 'Manage user roles and platform access.',
                glow: '#00c8ff',
              },
              {
                href: '/admin/analytics',
                icon: '📊',
                label: 'Analytics',
                desc: 'Submission trends and category insights.',
                glow: '#a855f7',
              },
            ].map(({ href, icon, label, desc, glow }) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl p-6 transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = 'rgba(255,255,255,0.05)'
                  el.style.border = `1px solid ${glow}40`
                  el.style.boxShadow = `0 4px 24px ${glow}15`
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement
                  el.style.background = 'rgba(255,255,255,0.03)'
                  el.style.border = '1px solid rgba(255,255,255,0.07)'
                  el.style.boxShadow = ''
                }}
              >
                <div className="mb-3 text-2xl">{icon}</div>
                <h2 className="mb-1 text-sm font-semibold text-white">{label}</h2>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {desc}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
