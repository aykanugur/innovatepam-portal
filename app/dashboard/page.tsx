import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { logoutAction } from '@/lib/actions/logout'

export const metadata = {
  title: 'Dashboard — InnovatEPAM',
}

/**
 * Protected landing page for all authenticated users.
 * proxy.ts redirects unauthenticated requests here → /login before this
 * component renders. This defensive check handles direct RSC invocations.
 */
export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const { displayName, email, role } = {
    displayName: session.user.name ?? session.user.email ?? 'User',
    email: session.user.email ?? '',
    role: session.user.role ?? 'SUBMITTER',
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Top nav */}
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <span className="font-semibold text-foreground">InnovatEPAM</span>
        <form action={logoutAction}>
          <button
            type="submit"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
          >
            Sign out
          </button>
        </form>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-1 text-2xl font-bold">Welcome, {displayName}</h1>
        <p className="mb-8 text-sm text-muted-foreground">
          {email} &middot;{' '}
          <span className="capitalize">{role.toLowerCase().replace('_', ' ')}</span>
        </p>

        <div className="rounded-xl border border-border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            The innovation portal is open. Idea submission and review features are coming soon.
          </p>
        </div>

        {(role === 'ADMIN' || role === 'SUPERADMIN') && (
          <div className="mt-4 rounded-xl border border-border bg-card p-6">
            <h2 className="mb-2 text-sm font-semibold">Admin</h2>
            <a href="/admin" className="text-sm font-medium text-primary hover:underline">
              Go to admin dashboard →
            </a>
          </div>
        )}
      </div>
    </main>
  )
}
