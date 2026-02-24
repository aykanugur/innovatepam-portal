/**
 * app/settings/page.tsx — T036
 *
 * Settings page — US-015
 * - Any authenticated role (SUBMITTER, ADMIN, SUPERADMIN)
 * - Redirects to /login if unauthenticated
 * - Two sections: Update Display Name + Change Password
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
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
    <main className="min-h-screen py-10" style={{ background: '#060608' }}>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
        {/* Back */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#8888A8] bg-white/[0.04] border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#F0F0FA' }}>
            Settings
          </h1>
          <p className="mt-2 text-sm" style={{ color: '#8888A8' }}>
            Manage your account settings and preferences.
          </p>
        </div>

        {/* Settings sections */}
        <div className="space-y-8">
          {/* Display Name */}
          <div
            className="rounded-xl p-6"
            style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <DisplayNameForm currentDisplayName={currentDisplayName} />
          </div>

          {/* Password Change */}
          <div
            className="rounded-xl p-6"
            style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <PasswordChangeForm />
          </div>
        </div>
      </div>
    </main>
  )
}
