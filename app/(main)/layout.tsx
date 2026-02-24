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
    <div
      className="min-h-screen text-white"
      style={{ background: '#060608', fontFamily: 'var(--font-sora), sans-serif' }}
    >
      {/* Ambient grid */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 85% 5%, rgba(139,92,246,0.15) 0%, transparent 65%)',
          }}
          className="absolute inset-0"
        />
        <div
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 5% 85%, rgba(0,200,255,0.08) 0%, transparent 60%)',
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

      {/* Shared navigation */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-3.5"
        style={{
          background: 'rgba(6,6,8,0.85)',
          backdropFilter: 'blur(18px)',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <nav className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="font-bold text-base tracking-tight" style={{ color: '#FF6B00' }}>
              &lt;epam&gt;
            </span>
            <span className="font-semibold text-base tracking-tight text-white">InnovatEPAM</span>
          </Link>
          <Link href="/ideas" className="text-sm text-gray-400 hover:text-white transition-colors">
            Browse Ideas
          </Link>
          <Link
            href="/ideas/new"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Submit Idea
          </Link>
          <Link
            href="/my-ideas"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            My Ideas
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{session.user.name ?? session.user.email}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-full px-3.5 py-1.5 text-xs font-medium text-gray-400 transition hover:text-white"
              style={{ border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      {/* Page content */}
      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-24 pb-12">{children}</main>
    </div>
  )
}
