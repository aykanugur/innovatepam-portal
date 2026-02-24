/**
 * app/api/test/cleanup/route.ts — T023
 *
 * E2E cleanup route — deletes all test rows seeded for a given runId.
 * ONLY active when NODE_ENV === 'test'. Returns 403 otherwise.
 *
 * Request body: { runId: string }
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'test') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as { runId?: string }
  const runId = body?.runId
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 })
  }

  const prefix = `[test:${runId}]`
  const emailSuffix = `${runId}@test.local`

  try {
    // Delete ideas by title prefix (cascade deletes IdeaReview + AuditLog via DB relations)
    await db.idea.deleteMany({
      where: { title: { startsWith: prefix } },
    })

    // Delete test users by email suffix
    await db.user.deleteMany({
      where: { email: { endsWith: emailSuffix } },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[test/cleanup]', err)
    return NextResponse.json({ error: 'cleanup failed' }, { status: 500 })
  }
}
