'use server'

/**
 * lib/actions/delete-draft.ts
 *
 * T001 — Draft Management: Server Action to permanently delete a draft idea.
 * Allowed even when FEATURE_DRAFT_ENABLED=false (FR-014).
 *
 * Pre-conditions:
 *  1. Authentication
 *  2. Ownership + status=DRAFT check
 *  3. Hard-delete (permanent — no soft-delete on user action)
 *
 * Caller is responsible for clearing the localStorage key:
 *   draft_autosave_{userId}_{draftId}
 * contracts/save-draft.md §8
 */

import { auth } from '@/auth'
import { db } from '@/lib/db'
import type { DraftErrorCode } from '@/lib/validations/draft'

type DeleteDraftResult = { success: true } | { error: string; code: DraftErrorCode }

export async function deleteDraft(draftId: string): Promise<DeleteDraftResult> {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'You must be signed in to delete a draft.', code: 'UNAUTHENTICATED' }
  }
  const userId = session.user.id

  // ── 2. Ownership + DRAFT status check ────────────────────────────────────
  const existing = await db.idea.findUnique({
    where: { id: draftId },
    select: { id: true, authorId: true, status: true },
  })

  if (!existing || existing.authorId !== userId || existing.status !== 'DRAFT') {
    return { error: 'Draft not found.', code: 'NOT_FOUND' }
  }

  // ── 3. Permanent delete + audit ──────────────────────────────────────────
  try {
    await db.idea.delete({ where: { id: draftId } })

    await db.auditLog.create({
      data: { action: 'DRAFT_DELETED', actorId: userId, targetId: draftId },
    })

    return { success: true }
  } catch (err) {
    console.error('[deleteDraft] Unexpected error:', err)
    return { error: 'An unexpected error occurred. Please try again.', code: 'INTERNAL_ERROR' }
  }
}
