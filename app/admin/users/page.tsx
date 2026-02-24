/**
 * T023: Admin users page — SUPERADMIN only, feature-flagged.
 * Shows user table with RoleSelector for each non-self user.
 */
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { RoleSelector } from '@/components/auth/role-selector'
import Link from 'next/link'

export default async function AdminUsersPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login?callbackUrl=/admin/users')
  }

  // Re-read role from DB (R-007)
  const caller = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!caller || caller.role !== 'SUPERADMIN') {
    redirect('/forbidden')
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })

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
              'radial-gradient(ellipse 60% 50% at 90% 0%, rgba(0,200,255,0.08) 0%, transparent 60%)',
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
          <Link href="/admin" className="text-sm text-gray-400 hover:text-white transition-colors">
            Admin
          </Link>
          <span className="text-sm font-medium" style={{ color: '#00c8ff' }}>
            Users
          </span>
        </div>
        <Link href="/admin" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to Admin
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="font-bold text-white mb-1"
            style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', letterSpacing: '-0.03em' }}
          >
            User{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #00c8ff, #a855f7)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Management
            </span>
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {users.length} users total
          </p>
        </div>

        {/* Table */}
        <div
          className="overflow-x-auto rounded-2xl"
          style={{ border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <table className="min-w-full text-sm">
            <thead>
              <tr
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                {['ID', 'Email', 'Display Name', 'Role', 'Verified', 'Created', 'Change Role'].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold"
                      style={{ color: 'rgba(255,255,255,0.45)' }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {users.map((user, i) => {
                const isSelf = user.id === session.user?.id
                return (
                  <tr
                    key={user.id}
                    style={{
                      background: isSelf
                        ? 'rgba(0,200,255,0.05)'
                        : i % 2 === 0
                          ? 'rgba(255,255,255,0.015)'
                          : 'transparent',
                      borderBottom: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <td
                      className="px-4 py-3 font-mono text-xs max-w-[120px] truncate"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    >
                      {user.id}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.75)' }}>
                      {user.email}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {user.displayName}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                        style={{
                          background:
                            user.role === 'SUPERADMIN'
                              ? 'rgba(168,85,247,0.15)'
                              : user.role === 'ADMIN'
                                ? 'rgba(0,200,255,0.12)'
                                : 'rgba(255,255,255,0.06)',
                          border:
                            user.role === 'SUPERADMIN'
                              ? '1px solid rgba(168,85,247,0.35)'
                              : user.role === 'ADMIN'
                                ? '1px solid rgba(0,200,255,0.3)'
                                : '1px solid rgba(255,255,255,0.1)',
                          color:
                            user.role === 'SUPERADMIN'
                              ? '#c084fc'
                              : user.role === 'ADMIN'
                                ? '#00c8ff'
                                : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.emailVerified ? (
                        <span style={{ color: '#10b981' }}>✓</span>
                      ) : (
                        <span style={{ color: 'rgba(255,255,255,0.2)' }}>—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {user.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {isSelf || user.role === 'SUPERADMIN' ? (
                        <span
                          className="text-xs italic"
                          style={{ color: 'rgba(255,255,255,0.25)' }}
                        >
                          {isSelf ? 'You' : 'Protected'}
                        </span>
                      ) : (
                        <RoleSelector userId={user.id} currentRole={user.role} />
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
