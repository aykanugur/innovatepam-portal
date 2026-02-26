import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { env } from '@/lib/env'

/**
 * T024 — Draft Management: Cron job to expire and clean up old drafts.
 *
 * Two-phase cleanup per spec FR-007:
 *   Phase 1 — Soft-expire: mark drafts past draftExpiresAt as isExpiredDraft=true.
 *   Phase 2 — Hard-delete: permanently delete drafts that have been expired
 *              for more than 7 days (grace period).
 *
 * Authorization: Bearer token must match CRON_SECRET env var.
 * Scheduled by vercel.json cron: runs daily at 02:00 UTC.
 *
 * contracts/expire-cron.md §1–§5
 */
export async function GET(request: NextRequest): Promise<Response> {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '').trim()

  if (!token || token !== env.CRON_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  // Grace period: hard-delete drafts expired more than 7 days ago
  const hardDeleteBefore = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  try {
    // Phase 1 — Soft-expire: mark newly-expired active drafts
    const softExpired = await db.idea.updateMany({
      where: {
        status: 'DRAFT',
        isExpiredDraft: false,
        draftExpiresAt: { lte: now },
      },
      data: { isExpiredDraft: true },
    })

    // Phase 2 — Hard-delete: remove drafts in grace-period-exceeded expired state
    const hardDeleted = await db.idea.deleteMany({
      where: {
        status: 'DRAFT',
        isExpiredDraft: true,
        draftExpiresAt: { lte: hardDeleteBefore },
      },
    })

    console.log(
      `[expire-drafts] soft-expired=${softExpired.count} hard-deleted=${hardDeleted.count}`
    )

    return Response.json({
      ok: true,
      softExpired: softExpired.count,
      hardDeleted: hardDeleted.count,
    })
  } catch (err) {
    console.error('[expire-drafts] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
