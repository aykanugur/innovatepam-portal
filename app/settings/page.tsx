/**
 * app/settings/page.tsx — T036
 *
 * Settings page — US-015
 * - Any authenticated role (SUBMITTER, ADMIN, SUPERADMIN)
 * - Redirects to /login if unauthenticated
 * - Two sections: Update Display Name + Change Password
 */

import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { DisplayNameForm } from '@/components/settings/display-name-form'
import { PasswordChangeForm } from '@/components/settings/password-change-form'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings — InnovatEPAM',
}

export default async function SettingsPage() {
  const session = await auth()

  // Redirect unauthenticated users to login
  if (!session?.user?.id) {
    redirect('/login')
  }

  // Re-read the user from DB to get fresh displayName (JWT may be stale)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { displayName: true },
  })

  const currentDisplayName = user?.displayName ?? ''

  return (
    <main className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Settings sections */}
        <div className="space-y-8">
          {/* Display Name */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <DisplayNameForm currentDisplayName={currentDisplayName} />
          </div>

          {/* Password Change */}
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <PasswordChangeForm />
          </div>
        </div>
      </div>
    </main>
  )
}
