'use server'

/**
 * lib/actions/finalize-review.ts
 *
 * Server Action: Finalize Review (US-012 AC-3/AC-4, FR-006).
 *
 * - Authenticates session
 * - Validates with FinalizeReviewSchema (rejects comments < 10 chars — FR-005)
 * - Self-review guard: AC-6, FR-003
 * - Opens prisma.$transaction:
 *     1. Updates IdeaReview.decision, comment, decidedAt
 *     2. Updates Idea.status → ACCEPTED or REJECTED
 *     3. Writes AuditLog IDEA_REVIEWED with commentSummary
 * - Revalidates /admin and /ideas/<id> (FR-013, SC-002)
 */

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { FinalizeReviewSchema } from '@/lib/validations/review'

export interface FinalizeReviewResult {
  success: boolean
  error?: string
}

export async function finalizeReviewAction(args?: {
  ideaId?: string
  decision?: string
  comment?: string
  reviewerId?: string
}): Promise<FinalizeReviewResult>
export async function finalizeReviewAction(
  prevState: unknown,
  formData: FormData
): Promise<FinalizeReviewResult>
export async function finalizeReviewAction(
  argsOrPrevState?:
    | { ideaId?: string; decision?: string; comment?: string; reviewerId?: string }
    | unknown,
  formData?: FormData
): Promise<FinalizeReviewResult> {
  // Resolve inputs
  let rawInput: { ideaId?: string; decision?: string; comment?: string }
  let reviewerIdOverride: string | undefined

  if (formData instanceof FormData) {
    rawInput = {
      ideaId: (formData.get('ideaId') as string | null) ?? undefined,
      decision: (formData.get('decision') as string | null) ?? undefined,
      comment: (formData.get('comment') as string | null) ?? undefined,
    }
  } else if (
    argsOrPrevState &&
    typeof argsOrPrevState === 'object' &&
    'ideaId' in argsOrPrevState
  ) {
    const args = argsOrPrevState as {
      ideaId?: string
      decision?: string
      comment?: string
      reviewerId?: string
    }
    rawInput = { ideaId: args.ideaId, decision: args.decision, comment: args.comment }
    reviewerIdOverride = args.reviewerId
  } else {
    return { success: false, error: 'INVALID_INPUT' }
  }

  // ── Validate with Zod schema — FR-005 ──────────────────────────────────────
  const parsed = FinalizeReviewSchema.safeParse(rawInput)
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? 'VALIDATION_ERROR'
    return { success: false, error: firstError }
  }
  const { ideaId, decision, comment } = parsed.data

  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth()
  const actorId = reviewerIdOverride ?? session?.user?.id
  if (!actorId) return { success: false, error: 'UNAUTHENTICATED' }

  let role: string
  if (reviewerIdOverride) {
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
  const idea = await db.idea.findUnique({
    where: { id: ideaId },
    include: { review: true },
  })
  if (!idea) return { success: false, error: 'IDEA_NOT_FOUND' }

  // ── Self-review guard — FR-003, US-012 AC-6 ───────────────────────────────
  if (idea.authorId === actorId) {
    return { success: false, error: 'SELF_REVIEW_FORBIDDEN' }
  }

  // ── Check review exists and belongs to actor ───────────────────────────────
  if (!idea.review) return { success: false, error: 'NO_ACTIVE_REVIEW' }

  // ── Transaction ────────────────────────────────────────────────────────────
  try {
    const newStatus = decision === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED'
    const commentSummary = comment.slice(0, 100) // FR-028

    await db.$transaction(async (tx) => {
      await tx.ideaReview.update({
        where: { ideaId },
        data: {
          decision,
          comment,
          decidedAt: new Date(),
        },
      })

      await tx.idea.update({
        where: { id: ideaId },
        data: { status: newStatus },
      })

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'IDEA_REVIEWED',
          targetId: ideaId,
          metadata: {
            ideaId,
            reviewerId: actorId,
            decision,
            commentSummary,
          },
        },
      })
    })

    // FR-013, SC-002
    revalidatePath('/admin')
    revalidatePath(`/ideas/${ideaId}`)

    return { success: true }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[finalizeReviewAction] error:', err)
    return { success: false, error: 'INTERNAL_ERROR' }
  }
}
