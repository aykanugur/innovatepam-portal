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
  const isTestEnv = process.env.NODE_ENV === 'test' || process.env.E2E_ENABLED === 'true'
  if (!isTestEnv) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as { runId?: string }
  const runId = body?.runId
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 })
  }

  const emailSuffix = `${runId}@test.local`

  try {
    // Delete in dependency order to satisfy FK constraints.
    // 1. Find all test users (we need their IDs for AuditLog cleanup)
    const testUsers = await db.user.findMany({
      where: { email: { endsWith: emailSuffix } },
      select: { id: true },
    })
    const testUserIds = testUsers.map((u) => u.id)

    // 2. Delete AuditLog rows created by test users
    if (testUserIds.length > 0) {
      await db.auditLog.deleteMany({ where: { actorId: { in: testUserIds } } })
    }

    // 3. Delete ideas authored by test users (covers dynamically-created ideas too)
    //    IdeaReview rows are deleted first due to cascade or we delete them manually
    if (testUserIds.length > 0) {
      const testIdeas = await db.idea.findMany({
        where: { authorId: { in: testUserIds } },
        select: { id: true },
      })
      const testIdeaIds = testIdeas.map((i) => i.id)

      // Delete IdeaReview for test ideas
      if (testIdeaIds.length > 0) {
        await db.ideaReview.deleteMany({ where: { ideaId: { in: testIdeaIds } } })
        // Also delete AuditLog referencing test ideas (reviewer actions)
        await db.auditLog.deleteMany({ where: { targetId: { in: testIdeaIds } } })
      }

      await db.idea.deleteMany({ where: { authorId: { in: testUserIds } } })
    }

    // 4. Also delete seed ideas by title prefix (in case author relation is different)
    await db.idea.deleteMany({
      where: { title: { startsWith: `[test:${runId}]` } },
    })

    // 5. Delete test users
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
