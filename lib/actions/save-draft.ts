'use server'

/**
 * lib/actions/save-draft.ts
 *
 * T001 — Draft Management: Server Action to create or update a draft idea.
 *
 * Pre-conditions (checked in order):
 *  1. Authentication via auth()
 *  2. Feature flag FEATURE_DRAFT_ENABLED
 *  3. Rate limit: 30 saves per 15 min per userId (FR-016)
 *  4. Zod validation (length caps only — no required-field check)
 *  5. 10-draft limit check on create (FR-003)
 *  6. Ownership + status=DRAFT check on update
 *
 * On success returns { draftId: string }.
 * On error returns { error: string, code: DraftErrorCode }.
 * contracts/save-draft.md §1–§6
 */

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { draftSaveLimiter } from '@/lib/rate-limit'
import { SaveDraftSchema, type SaveDraftInput, type DraftErrorCode } from '@/lib/validations/draft'
import type { DynamicFields } from '@/types/field-template'

/** 90 days in milliseconds */
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

function ninetyDaysFromNow(): Date {
  return new Date(Date.now() + NINETY_DAYS_MS)
}

type SaveDraftResult = { draftId: string } | { error: string; code: DraftErrorCode }

export async function saveDraft(input: SaveDraftInput): Promise<SaveDraftResult> {
  // ── 1. Auth ──────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return { error: 'You must be signed in to save a draft.', code: 'UNAUTHENTICATED' }
  }
  const userId = session.user.id

  // ── 2. Feature flag ──────────────────────────────────────────────────────
  if (env.FEATURE_DRAFT_ENABLED !== 'true') {
    return { error: 'Draft feature is not enabled.', code: 'FEATURE_DISABLED' }
  }

  // ── 3. Rate limit ────────────────────────────────────────────────────────
  const rl = await draftSaveLimiter.limit(userId)
  if (!rl.success) {
    return {
      error: 'Too many save requests, please slow down.',
      code: 'RATE_LIMITED',
    }
  }

  // ── 4. Validation ────────────────────────────────────────────────────────
  const parsed = SaveDraftSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0]
    return { error: firstError ?? 'Validation failed.', code: 'VALIDATION_ERROR' }
  }
  const data = parsed.data

  // ── 5+6. Route: create vs update ─────────────────────────────────────────
  try {
    if (!data.id) {
      // ── CREATE: enforce 10-draft limit ───────────────────────────────────
      const activeCount = await db.idea.count({
        where: {
          authorId: userId,
          status: 'DRAFT',
          isExpiredDraft: false,
          draftExpiresAt: { gt: new Date() },
        },
      })

      if (activeCount >= 10) {
        return {
          error:
            'You have reached the maximum of 10 drafts. Please submit or delete a draft to continue.',
          code: 'DRAFT_LIMIT_EXCEEDED',
        }
      }

      const draft = await db.idea.create({
        data: {
          title: data.title ?? null,
          description: data.description ?? null,
          category: data.category ?? null,
          visibility: data.visibility ?? 'PUBLIC',
          isAnonymous: data.isAnonymous ?? false,
          ...(data.dynamicFields != null
            ? { dynamicFields: data.dynamicFields as DynamicFields }
            : {}),
          status: 'DRAFT',
          authorId: userId,
          draftExpiresAt: ninetyDaysFromNow(),
          isExpiredDraft: false,
          softDeletedAt: null,
        },
      })

      await db.auditLog.create({
        data: { action: 'DRAFT_SAVED', actorId: userId, targetId: draft.id },
      })

      return { draftId: draft.id }
    } else {
      // ── UPDATE: verify ownership, status, and non-expiry ─────────────────
      const existing = await db.idea.findUnique({
        where: { id: data.id },
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

      // Lazy expiry check (FR-011 edge case — race condition)
      if (
        existing.isExpiredDraft ||
        (existing.draftExpiresAt && existing.draftExpiresAt < new Date())
      ) {
        return { error: 'This draft has expired and can no longer be saved.', code: 'EXPIRED' }
      }

      const draft = await db.idea.update({
        where: { id: data.id },
        data: {
          title: data.title ?? null,
          description: data.description ?? null,
          category: data.category ?? null,
          ...(data.visibility !== undefined ? { visibility: data.visibility } : {}),
          ...(data.isAnonymous !== undefined ? { isAnonymous: data.isAnonymous } : {}),
          ...(data.dynamicFields != null
            ? { dynamicFields: data.dynamicFields as DynamicFields }
            : {}),
          draftExpiresAt: ninetyDaysFromNow(), // reset expiry clock on every explicit save (FR-002)
        },
      })

      await db.auditLog.create({
        data: { action: 'DRAFT_SAVED', actorId: userId, targetId: draft.id },
      })

      return { draftId: draft.id }
    }
  } catch (err) {
    console.error('[saveDraft] Unexpected error:', err)
    return { error: 'An unexpected error occurred. Please try again.', code: 'INTERNAL_ERROR' }
  }
}
