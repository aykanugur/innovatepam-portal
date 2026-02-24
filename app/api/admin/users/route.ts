/**
 * T026: Admin users API routes.
 * GET  /api/admin/users — ADMIN+, paginated user list
 * PATCH /api/admin/users — SUPERADMIN only, update user role (feature-flagged)
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'

// ─── GET /api/admin/users ─────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  // Re-read role from DB (R-007)
  const caller = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  if (!caller || (caller.role !== 'ADMIN' && caller.role !== 'SUPERADMIN')) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  // Feature flag guard
  if (process.env.FEATURE_USER_MANAGEMENT_ENABLED !== 'true') {
    return NextResponse.json({ error: 'User management is not enabled.' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '25', 10)))
  const skip = (page - 1) * limit

  const [users, total] = await Promise.all([
    db.user.findMany({
      select: {
        id: true,
        email: true,
        displayName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    }),
    db.user.count(),
  ])

  return NextResponse.json({ users, total, page, limit })
}

// ─── PATCH /api/admin/users ───────────────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  // Feature flag guard
  if (process.env.FEATURE_USER_MANAGEMENT_ENABLED !== 'true') {
    return NextResponse.json({ error: 'User management is not enabled.' }, { status: 503 })
  }

  const session = await auth()

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  // Re-read caller role from DB (R-007)
  const caller = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  })

  if (!caller || caller.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Forbidden. SUPERADMIN role required.' }, { status: 403 })
  }

  let body: { userId?: string; role?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const { userId: targetId, role: newRole } = body

  if (!targetId || typeof targetId !== 'string') {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 })
  }

  if (!newRole || !['SUBMITTER', 'ADMIN'].includes(newRole)) {
    return NextResponse.json({ error: 'role must be SUBMITTER or ADMIN.' }, { status: 400 })
  }

  // Self-change guard
  if (targetId === caller.id) {
    return NextResponse.json({ error: 'You cannot change your own role.' }, { status: 400 })
  }

  // SUPERADMIN assignment guard
  if (newRole === 'SUPERADMIN') {
    return NextResponse.json(
      { error: 'Only SUPERADMIN can assign the SUPERADMIN role.' },
      { status: 400 }
    )
  }

  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, role: true },
  })

  if (!target) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  const updated = await db.user.update({
    where: { id: targetId },
    data: { role: newRole as 'SUBMITTER' | 'ADMIN' },
    select: { id: true, email: true, role: true },
  })

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: 'role.changed',
      ts: new Date().toISOString(),
      callerId: caller.id,
      targetId,
      targetEmail: target.email,
      oldRole: target.role,
      newRole,
    })
  )

  return NextResponse.json({ user: updated })
}
