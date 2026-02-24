import Link from 'next/link'

export const metadata = {
  title: '403 Forbidden — InnovatEPAM',
}

/**
 * FR-012: Shown when an authenticated user attempts to access a route
 * that requires a higher role (e.g., SUBMITTER accessing /admin).
 * proxy.ts redirects here; the page returns via the normal RSC render path.
 */
export default function ForbiddenPage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center"
      style={{ background: '#060608' }}
    >
      <p
        className="mb-2 text-6xl font-bold"
        aria-hidden="true"
        style={{ color: 'rgba(0,200,255,0.25)', fontFamily: 'var(--font-sora, sans-serif)' }}
      >
        403
      </p>
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: '#F0F0FA' }}>
        Access denied
      </h1>
      <p className="mb-8 text-sm" style={{ color: '#8888A8' }}>
        You don&apos;t have permission to access this page.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
      >
        Back to dashboard
      </Link>
    </main>
  )
}
