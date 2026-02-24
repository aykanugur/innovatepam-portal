import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { logoutAction } from '@/lib/actions/logout'

interface MainLayoutProps {
  children: ReactNode
}

/**
 * T031 — Authenticated route group layout for idea pages.
 * Wraps /ideas, /ideas/new, /ideas/[id], and /my-ideas with a session check.
 * Unauthenticated visitors are redirected to /login with callbackUrl preserved.
 * Renders shared top navigation with links to key idea sections.
 */
export default async function MainLayout({ children }: MainLayoutProps) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background">
      {/* Shared navigation */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold text-foreground hover:text-primary">
              InnovatEPAM
            </Link>
            <Link href="/ideas" className="text-sm text-muted-foreground hover:text-foreground">
              Browse Ideas
            </Link>
            <Link href="/ideas/new" className="text-sm text-muted-foreground hover:text-foreground">
              Submit Idea
            </Link>
            <Link href="/my-ideas" className="text-sm text-muted-foreground hover:text-foreground">
              My Ideas
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              {session.user.name ?? session.user.email}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
