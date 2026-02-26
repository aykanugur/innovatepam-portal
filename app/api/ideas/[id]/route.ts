/**
 * T021 — GET /api/ideas/[id] — fetch a single idea's full detail.
 * T024 — DELETE /api/ideas/[id] — delete an idea (author or admin).
 *
 * Visibility rules:
 *   SUBMITTER: PUBLIC always; PRIVATE only if authorId === session.userId → else 404
 *   ADMIN/SUPERADMIN: always visible
 *
 * FR-021, FR-022, FR-028 (blob NOT deleted), contracts/ideas.md.
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { maskAuthorIfBlind } from '@/lib/blind-review'
import { apiError } from '@/lib/api-error'

// ─── GET /api/ideas/[id] ─────────────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return apiError(401, 'Unauthorized')

  const { id } = await params
  const userId = session.user.id
  const role = session.user.role ?? 'SUBMITTER'

  const idea = await db.idea.findUnique({
    where: { id },
    include: {
      author: { select: { displayName: true } },
      review: {
        include: { reviewer: { select: { displayName: true } } },
      },
    },
  })

  if (!idea) return apiError(404, 'Not found')

  // Visibility: PRIVATE idea only visible to author or admins
  const canAccess =
    role === 'ADMIN' ||
    role === 'SUPERADMIN' ||
    idea.visibility === 'PUBLIC' ||
    idea.authorId === userId

  if (!canAccess) return apiError(404, 'Not found')

  // EPIC-V2-05: Blind Review — mask author identity from ADMINs during active review
  const blindReviewPipeline = await db.reviewPipeline.findFirst({
    where: { categorySlug: idea.category ?? '' },
    select: { blindReview: true },
  })
  const maskedAuthorName = maskAuthorIfBlind({
    authorId: idea.authorId,
    authorDisplayName: idea.author.displayName,
    requesterId: userId,
    requesterRole: role,
    pipelineBlindReview: blindReviewPipeline?.blindReview ?? false,
    ideaStatus: idea.status,
    featureFlagEnabled: env.FEATURE_BLIND_REVIEW_ENABLED === 'true',
  })

  let finalAuthorName = maskedAuthorName
  if (idea.isAnonymous) {
    finalAuthorName = idea.authorId === userId ? `${maskedAuthorName} (Anonymous)` : 'Anonymous'
  }

  return NextResponse.json({
    data: {
      id: idea.id,
      title: idea.title,
      description: idea.description,
      category: idea.category,
      status: idea.status,
      visibility: idea.visibility,
      authorName: finalAuthorName,
      authorId: idea.authorId,
      attachmentUrl: idea.attachmentPath,
      createdAt: idea.createdAt.toISOString(),
      review: idea.review
        ? {
            decision: idea.review.decision,
            comment: idea.review.comment,
            reviewerName: idea.review.reviewer.displayName,
            reviewedAt: idea.review.createdAt.toISOString(),
          }
        : null,
    },
  })
}

// ─── DELETE /api/ideas/[id] ──────────────────────────────────────────────────

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) return apiError(401, 'Unauthorized')

  const { id } = await params
  const userId = session.user.id
  const role = session.user.role ?? 'SUBMITTER'

  const idea = await db.idea.findUnique({ where: { id } })
  if (!idea) return apiError(404, 'Not found')

  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN'

  // Authorization
  if (!isAdmin) {
    if (idea.authorId !== userId) return apiError(403, 'Forbidden')
    if (idea.status !== 'SUBMITTED') return apiError(403, 'Forbidden')
  }

  // Hard delete (cascades IdeaReview via onDelete: Cascade in schema)
  // Note: onDelete cascade is implicit — Prisma will handle it; if not, delete review first
  await db.idea.delete({ where: { id } })

  // Write AuditLog (IDEA_DELETED) — FR-026
  // Blind review masking not applied — audit writes record actor identity, not idea author. (EPIC-V2-05 FR-011)
  await db.auditLog.create({
    data: {
      actorId: userId,
      action: 'IDEA_DELETED',
      targetId: id,
      metadata: {
        ideaTitle: idea.title,
        deletedByRole: role,
      },
    },
  })

  // Blob is NOT deleted — FR-028

  return NextResponse.json({ data: { deleted: true, id } })
}
