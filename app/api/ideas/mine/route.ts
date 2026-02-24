/**
 * T028 — GET /api/ideas/mine — returns only the authenticated user's own ideas.
 * Both PUBLIC and PRIVATE, ordered newest-first. No pagination (alpha scope).
 * FR-023, FR-027, contracts/ideas.md §GET /api/ideas/mine.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { apiError } from '@/lib/api-error'

export async function GET(_request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return apiError(401, 'Unauthorized')

  const userId = session.user.id

  const ideas = await db.idea.findMany({
    where: { authorId: userId },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { displayName: true } } },
  })

  const data = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    category: idea.category,
    status: idea.status,
    visibility: idea.visibility,
    authorName: idea.author.displayName,
    createdAt: idea.createdAt.toISOString(),
  }))

  return NextResponse.json({ data })
}
