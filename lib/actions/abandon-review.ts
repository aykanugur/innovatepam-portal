'use server'

/**
 * lib/actions/abandon-review.ts
 *
 * Server Action: Abandon Review (FR-030).
 * SUPERADMIN-only — resets UNDER_REVIEW → SUBMITTED.
 *
 * - Opens prisma.$transaction:
 *     1. Deletes IdeaReview row
 *     2. Updates Idea.status → SUBMITTED
 *     3. Writes AuditLog IDEA_REVIEW_ABANDONED
 * - Revalidates /admin and /ideas/<id> (FR-013)
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export interface AbandonReviewResult {
  success: boolean
  error?: string
}

export async function abandonReviewAction(args?: {
  ideaId?: string
  superadminId?: string
}): Promise<AbandonReviewResult>
export async function abandonReviewAction(
  prevState: unknown,
  formData: FormData
): Promise<AbandonReviewResult>
export async function abandonReviewAction(
  argsOrPrevState?: { ideaId?: string; superadminId?: string } | unknown,
  formData?: FormData
): Promise<AbandonReviewResult> {
  let ideaId: string | undefined
  let superadminIdOverride: string | undefined

  if (formData instanceof FormData) {
    ideaId = (formData.get('ideaId') as string | null) ?? undefined
  } else if (
    argsOrPrevState &&
    typeof argsOrPrevState === 'object' &&
    'ideaId' in argsOrPrevState
  ) {
    const args = argsOrPrevState as { ideaId?: string; superadminId?: string }
    ideaId = args.ideaId
    superadminIdOverride = args.superadminId
  }

  if (!ideaId) return { success: false, error: 'INVALID_INPUT' }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth()
  const actorId = superadminIdOverride ?? session?.user?.id
  if (!actorId) return { success: false, error: 'UNAUTHENTICATED' }

  let role: string
  if (superadminIdOverride) {
    const superAdminUser = await db.user.findUnique({
      where: { id: superadminIdOverride },
      select: { role: true },
    })
    role = superAdminUser?.role ?? 'SUBMITTER'
  } else {
    role = session?.user?.role ?? 'SUBMITTER'
  }

  // SUPERADMIN-only — FR-030
  if (role !== 'SUPERADMIN') {
    return { success: false, error: 'FORBIDDEN_ROLE' }
  }

  // ── Fetch idea with review ─────────────────────────────────────────────────
  const idea = await db.idea.findUnique({
    where: { id: ideaId },
    include: { review: true },
  })
  if (!idea) return { success: false, error: 'IDEA_NOT_FOUND' }
  if (!idea.review) return { success: false, error: 'NO_ACTIVE_REVIEW' }

  const originalReviewerId = idea.review.reviewerId

  // ── Transaction: delete review + reset status + audit ─────────────────────
  try {
    await db.$transaction(async (tx) => {
      await tx.ideaReview.delete({ where: { ideaId } })

      await tx.idea.update({
        where: { id: ideaId },
        data: { status: 'SUBMITTED' },
      })

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'IDEA_REVIEW_ABANDONED',
          targetId: ideaId,
          metadata: {
            ideaId,
            originalReviewerId,
            abandonedByAdminId: actorId,
          },
        },
      })
    })

    // FR-013
    revalidatePath('/admin')
    revalidatePath(`/ideas/${ideaId}`)

    return { success: true }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[abandonReviewAction] error:', err)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}
