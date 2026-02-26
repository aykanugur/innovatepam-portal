'use server'

/**
 * lib/actions/submit-draft.ts
 *
 * T001 — Draft Management: Server Action to submit a draft idea into the
 * standard review pipeline.
 *
 * Runs full required-field validation (same rules as create-idea).
 * Transitions DRAFT → SUBMITTED via the state machine enforcer.
 * Feature flag NOT required — submission always allowed if draft exists (FR-014).
 *
 * On success returns { ideaId: string }.
 * On error returns { error: string, code: DraftErrorCode }.
 * contracts/save-draft.md §9
 */

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { transition } from '@/lib/state-machine/idea-status'
import { CreateIdeaSchema } from '@/lib/validations/idea'
import type { DraftErrorCode } from '@/lib/validations/draft'

type SubmitDraftResult =
  | { ideaId: string }
  | { error: string; code: DraftErrorCode; fieldErrors?: Record<string, string[]> }

export async function submitDraft(
  draftId: string,
  formData:
    | FormData
    | {
        title: string
        description: string
        category: string
        visibility?: string
        isAnonymous?: boolean
      }
): Promise<SubmitDraftResult> {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'You must be signed in to submit.', code: 'UNAUTHENTICATED' }
  }
  const userId = session.user.id

  // ── 2. Fetch draft + ownership + status check ────────────────────────────
  const existing = await db.idea.findUnique({
    where: { id: draftId },
    select: {
      id: true,
      authorId: true,
      status: true,
      draftExpiresAt: true,
      isExpiredDraft: true,
    },
  })

  if (!existing || existing.authorId !== userId || existing.status !== 'DRAFT') {
    return { error: 'Draft not found.', code: 'NOT_FOUND' }
  }

  // ── 3. Lazy expiry check ─────────────────────────────────────────────────
  if (
    existing.isExpiredDraft ||
    (existing.draftExpiresAt && existing.draftExpiresAt < new Date())
  ) {
    return { error: 'This draft has expired and can no longer be submitted.', code: 'EXPIRED' }
  }

  // ── 4. Full validation ───────────────────────────────────────────────────
  const rawInput =
    formData instanceof FormData
      ? {
          title: formData.get('title'),
          description: formData.get('description'),
          category: formData.get('category'),
          visibility: formData.get('visibility'),
          isAnonymous: formData.get('isAnonymous') === 'true',
        }
      : formData

  const parsed = CreateIdeaSchema.safeParse(rawInput)
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    const firstError = Object.values(fieldErrors).flat()[0] ?? 'Validation failed.'
    return { error: firstError, code: 'VALIDATION_ERROR', fieldErrors }
  }

  // ── 5. State machine transition ──────────────────────────────────────────
  // Role is not relevant for DRAFT → SUBMITTED (author-only action).
  // Passing 'ADMIN' is a safe sentinel — the DRAFT case exits before role guards.
  const nextStatus = transition('DRAFT', 'SUBMIT', 'ADMIN')

  // ── 6. Update idea + audit ───────────────────────────────────────────────
  try {
    await db.idea.update({
      where: { id: draftId },
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        visibility: parsed.data.visibility ?? 'PUBLIC',
        isAnonymous: parsed.data.isAnonymous ?? false,
        status: nextStatus,
        draftExpiresAt: null, // clear expiry on submission
      },
    })

    await db.auditLog.create({
      data: { action: 'DRAFT_SUBMITTED', actorId: userId, targetId: draftId },
    })

    return { ideaId: draftId }
  } catch (err) {
    console.error('[submitDraft] Unexpected error:', err)
    return { error: 'An unexpected error occurred. Please try again.', code: 'INTERNAL_ERROR' }
  }
}
