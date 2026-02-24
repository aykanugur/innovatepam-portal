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
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center">
      <p className="mb-2 text-5xl font-bold text-muted-foreground/50" aria-hidden="true">
        403
      </p>
      <h1 className="mb-2 text-2xl font-semibold">Access denied</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        You don&apos;t have permission to access this page.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Back to dashboard
      </Link>
    </main>
  )
}
