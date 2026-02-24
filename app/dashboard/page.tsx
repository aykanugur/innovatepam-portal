import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { logoutAction } from '@/lib/actions/logout'
import { GlowCard } from '@/components/ui/glow-card'

export const metadata = {
  title: 'Dashboard — InnovatEPAM',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const { displayName, email, role } = {
    displayName: session.user.name ?? session.user.email ?? 'User',
    email: session.user.email ?? '',
    role: session.user.role ?? 'SUBMITTER',
  }

  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN'

  const cards = [
    {
      href: '/ideas/new',
      icon: '💡',
      label: 'Submit an Idea',
      desc: 'Share your innovation with the team.',
      glow: '#00c8ff',
    },
    {
      href: '/ideas',
      icon: '🔍',
      label: 'Browse Ideas',
      desc: 'Explore ideas submitted by the community.',
      glow: '#a855f7',
    },
    {
      href: '/my-ideas',
      icon: '📋',
      label: 'My Ideas',
      desc: 'Track the status of your submissions.',
      glow: '#10b981',
    },
    {
      href: '/settings',
      icon: '⚙️',
      label: 'Settings',
      desc: 'Update your display name and password.',
      glow: '#f59e0b',
    },
    ...(isAdmin
      ? [
          {
            href: '/admin',
            icon: '🛡️',
            label: 'Admin Dashboard',
            desc: 'Review ideas and manage the portal.',
            glow: '#ff3b5c',
          },
        ]
      : []),
  ]

  return (
    <div
      className="min-h-screen text-white"
      style={{ background: '#060608', fontFamily: 'var(--font-sora), sans-serif' }}
    >
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden>
        <div
          style={{
            background:
              'radial-gradient(ellipse 70% 50% at 80% 10%, rgba(139,92,246,0.18) 0%, transparent 65%)',
          }}
          className="absolute inset-0"
        />
        <div
          style={{
            background:
              'radial-gradient(ellipse 50% 40% at 10% 80%, rgba(0,200,255,0.1) 0%, transparent 60%)',
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
            Browse
          </Link>
          <Link
            href="/ideas/new"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Submit
          </Link>
          <Link
            href="/my-ideas"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            My Ideas
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className="text-sm text-gray-400 hover:text-white transition-colors"
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/settings"
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {displayName}
          </Link>
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

      {/* Content */}
      <main className="relative z-10 mx-auto max-w-4xl px-6 pt-32 pb-16">
        {/* Welcome */}
        <div className="mb-12">
          <div
            className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(255,107,0,0.1)',
              border: '1px solid rgba(255,107,0,0.25)',
              color: '#FF6B00',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] animate-pulse" />
            <span className="capitalize">{role.toLowerCase().replace('_', ' ')}</span>
          </div>
          <h1
            className="mb-2 font-bold text-white"
            style={{
              fontSize: 'clamp(1.8rem, 3vw, 2.6rem)',
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            Welcome back,{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #FF6B00, #FF8C38)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              {displayName}
            </span>
          </h1>
          <p className="text-sm" style={{ color: '#8888A8' }}>
            {email}
          </p>
        </div>

        {/* Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ href, icon, label, desc, glow }) => (
            <GlowCard key={href} href={href} icon={icon} label={label} desc={desc} glow={glow} />
          ))}
        </div>
      </main>
    </div>
  )
}
