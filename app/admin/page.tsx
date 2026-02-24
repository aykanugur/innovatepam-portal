/**
 * T022: Admin dashboard page — ADMIN+ protected.
 * Re-reads role from DB to prevent stale JWT role (research.md R-007).
 */
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import Link from 'next/link'

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

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Signed in as <span className="font-medium">{dbUser.displayName ?? dbUser.email}</span> —{' '}
            <span className="font-medium">{dbUser.role}</span>
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800">Idea Review Queue</h2>
            <p className="mt-2 text-sm text-gray-500">
              Review submitted ideas, accept or reject with feedback.
            </p>
            <p className="mt-4 text-xs text-gray-400 italic">
              Ideas review content — out of scope for this epic.
            </p>
          </div>

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
        </div>

        <div className="mt-8">
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </main>
  )
}
