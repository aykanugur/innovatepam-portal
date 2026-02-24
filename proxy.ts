import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/auth'

/**
 * proxy.ts — Next.js 16 network boundary layer (replaces middleware.ts).
 *
 * Responsibilities (evaluated in order):
 *  1. Portal maintenance gate (PORTAL_ENABLED=false → 503)
 *  2. Auth.js v5 session read (JWT decode — Edge-safe, no DB call)
 *  3. Redirect unauthenticated users away from protected routes → /login
 *  4. Redirect authenticated users with insufficient role → /forbidden
 *
 * FR-011: callbackUrl preserved; validated as same-origin relative path only.
 * FR-012: ADMIN/SUPERADMIN pages enforce role check.
 * FR-020: /admin/users restricted to SUPERADMIN; /admin accessible to ADMIN+.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── 1. Portal maintenance gate ─────────────────────────────────────────────
  if (process.env.PORTAL_ENABLED === 'false') {
    return new NextResponse(
      `<html><body><h1>Service Unavailable</h1><p>InnovateEPAM Portal is temporarily offline for maintenance.</p></body></html>`,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }

  // ── 2. Read session (JWT decode only — no DB round-trip) ───────────────────
  const session = await auth()
  const role = session?.user?.role ?? null

  // ── 3. Unauthenticated access to protected routes → /login ────────────────
  const isProtected =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/settings')

  if (isProtected && !session) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'

    // FR-011: validate callbackUrl is same-origin relative path
    const isSafeCallback = pathname.startsWith('/') && !pathname.includes('://')
    if (isSafeCallback) {
      loginUrl.searchParams.set('callbackUrl', pathname)
    }

    return NextResponse.redirect(loginUrl)
  }

  // ── 4. Role-based access control ──────────────────────────────────────────
  if (session) {
    const isSuperAdminOnly =
      pathname.startsWith('/admin/users') || pathname.startsWith('/api/admin/users')

    const isAdminSection = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')

    const forbiddenUrl = request.nextUrl.clone()
    forbiddenUrl.pathname = '/forbidden'

    // FR-020: /admin/users — SUPERADMIN only
    if (isSuperAdminOnly && role !== 'SUPERADMIN') {
      return NextResponse.redirect(forbiddenUrl)
    }

    // FR-012: /admin — ADMIN or SUPERADMIN
    if (isAdminSection && role !== 'ADMIN' && role !== 'SUPERADMIN') {
      return NextResponse.redirect(forbiddenUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
