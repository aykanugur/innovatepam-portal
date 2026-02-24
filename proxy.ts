import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * proxy.ts — Next.js 16 network boundary layer (replaces middleware.ts).
 *
 * FR-015: When PORTAL_ENABLED is "false", respond to all non-static routes
 * with HTTP 503 HTML indicating the portal is offline for maintenance.
 */
export function proxy(request: NextRequest) {
  if (process.env.PORTAL_ENABLED === 'false') {
    return new NextResponse(
      `<html><body><h1>Service Unavailable</h1><p>InnovateEPAM Portal is temporarily offline for maintenance.</p></body></html>`,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      }
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
