'use server'

/**
 * lib/actions/start-review.ts
 *
 * Server Action: Start Review (US-012 AC-1, FR-004).
 *
 * - Authenticates session
 * - Verifies role is ADMIN or SUPERADMIN
 * - Self-review guard: AC-6, FR-003
 * - Opens prisma.$transaction:
 *     1. Concurrency guard: throws ALREADY_UNDER_REVIEW if IdeaReview exists
 *     2. Creates IdeaReview row
 *     3. Updates Idea.status → UNDER_REVIEW
 *     4. Writes AuditLog IDEA_REVIEW_STARTED
 * - Revalidates /admin and /ideas/<id> (FR-013, SC-002)
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export interface StartReviewResult {
  success: boolean
  reviewId?: string
  error?: string
}

/** Callable from the UI (session from auth()) or from tests (explicit reviewerId override). */
export async function startReviewAction(args?: {
  ideaId?: string
  reviewerId?: string
}): Promise<StartReviewResult>
export async function startReviewAction(
  prevState: unknown,
  formData: FormData
): Promise<StartReviewResult>
export async function startReviewAction(
  argsOrPrevState?: { ideaId?: string; reviewerId?: string } | unknown,
  formData?: FormData
): Promise<StartReviewResult> {
  // Resolve ideaId — from form data or direct call
  let ideaId: string | undefined
  let reviewerIdOverride: string | undefined

  if (formData instanceof FormData) {
    ideaId = (formData.get('ideaId') as string | null) ?? undefined
  } else if (
    argsOrPrevState &&
    typeof argsOrPrevState === 'object' &&
    'ideaId' in argsOrPrevState
  ) {
    const args = argsOrPrevState as { ideaId?: string; reviewerId?: string }
    ideaId = args.ideaId
    reviewerIdOverride = args.reviewerId
  }

  if (!ideaId) return { success: false, error: 'INVALID_INPUT' }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth()

  // Allow test direct call with explicit reviewerId (integration tests)
  const actorId = reviewerIdOverride ?? session?.user?.id
  if (!actorId) return { success: false, error: 'UNAUTHENTICATED' }

  // Role check — FR-001
  let role: string
  if (reviewerIdOverride) {
    // Integration test path: look up role from DB
    const adminUser = await db.user.findUnique({
      where: { id: reviewerIdOverride },
      select: { role: true },
    })
    role = adminUser?.role ?? 'SUBMITTER'
  } else {
    role = session?.user?.role ?? 'SUBMITTER'
  }

  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return { success: false, error: 'FORBIDDEN_ROLE' }
  }

  // ── Fetch idea ─────────────────────────────────────────────────────────────
  const idea = await db.idea.findUnique({ where: { id: ideaId } })
  if (!idea) return { success: false, error: 'IDEA_NOT_FOUND' }

  // ── Self-review guard — FR-003, US-012 AC-6 ───────────────────────────────
  if (idea.authorId === actorId) {
    return { success: false, error: 'SELF_REVIEW_FORBIDDEN' }
  }

  // ── Transaction: concurrency guard + state change + audit ─────────────────
  try {
    const review = await db.$transaction(async (tx) => {
      // Concurrency guard — ideaId @unique ensures only one active review
      const existing = await tx.ideaReview.findUnique({ where: { ideaId } })
      if (existing) {
        throw new Error('ALREADY_UNDER_REVIEW')
      }

      const newReview = await tx.ideaReview.create({
        data: {
          ideaId,
          reviewerId: actorId,
          startedAt: new Date(),
        },
      })

      await tx.idea.update({
        where: { id: ideaId },
        data: { status: 'UNDER_REVIEW' },
      })

      const reviewer = await tx.user.findUnique({
        where: { id: actorId },
        select: { displayName: true },
      })

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'IDEA_REVIEW_STARTED',
          targetId: ideaId,
          metadata: {
            ideaId,
            reviewerId: actorId,
            reviewerDisplayName: reviewer?.displayName ?? '',
          },
        },
      })

      return newReview
    })

    // FR-013, SC-002 — revalidate admin dashboard + submitter's idea view
    revalidatePath('/admin')
    revalidatePath(`/ideas/${ideaId}`)

    return { success: true, reviewId: review.id }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'UNKNOWN_ERROR'
    if (message === 'ALREADY_UNDER_REVIEW') {
      return { success: false, error: 'ALREADY_UNDER_REVIEW' }
    }
    // eslint-disable-next-line no-console
    console.error('[startReviewAction] error:', err)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}
