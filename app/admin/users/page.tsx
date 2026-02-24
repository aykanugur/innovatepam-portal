/**
 * T023: Admin users page — SUPERADMIN only, feature-flagged.
 * Shows user table with RoleSelector for each non-self user.
 */
import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { RoleSelector } from '@/components/auth/role-selector'
import Link from 'next/link'

export default async function AdminUsersPage() {
  // Feature flag guard
  if (process.env.FEATURE_USER_MANAGEMENT_ENABLED !== 'true') {
    notFound()
  }

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
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="mt-1 text-sm text-gray-500">{users.length} users total</p>
          </div>
          <Link href="/admin" className="text-sm text-blue-600 hover:underline">
            ← Back to Admin
          </Link>
        </header>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">ID</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Display Name</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Verified</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Created</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Change Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => {
                const isSelf = user.id === session.user?.id
                return (
                  <tr key={user.id} className={isSelf ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-400 max-w-[120px] truncate">
                      {user.id}
                    </td>
                    <td className="px-4 py-3 text-gray-800">{user.email}</td>
                    <td className="px-4 py-3 text-gray-700">{user.displayName}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          user.role === 'SUPERADMIN'
                            ? 'bg-purple-100 text-purple-700'
                            : user.role === 'ADMIN'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.emailVerified ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {user.createdAt.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {isSelf || user.role === 'SUPERADMIN' ? (
                        <span className="text-xs text-gray-400 italic">
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
      </div>
    </main>
  )
}
