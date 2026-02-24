/**
 * app/api/test/seed/route.ts — T023
 *
 * E2E seed route — creates test users and ideas for a given runId.
 * ONLY active when NODE_ENV === 'test'. Returns 403 otherwise.
 *
 * Request body: { runId: string }
 * Response: { adminEmail, adminPassword, submitterEmail, submitterPassword, ideaId }
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Shared test password for E2E seed users — not used in production
const E2E_PASSWORD_HASH = '$2b$12$OJ6aXMbEn9qLVOdMjHijZ.LdPfJBK0V9Pb8BQMSH8LdMYZ.EoRqPe' // bcrypt of 'E2eTestPass1'

type TestSeedResult = {
  adminEmail: string
  adminPassword: string
  submitterEmail: string
  submitterPassword: string
  ideaId: string
}

export async function POST(req: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV !== 'test') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = (await req.json()) as { runId?: string }
  const runId = body?.runId
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 })
  }

  const adminEmail = `e2e-admin-${runId}@test.local`
  const submitterEmail = `e2e-submitter-${runId}@test.local`
  const plainPassword = 'E2eTestPass1'

  try {
    // Upsert admin user
    const admin = await db.user.upsert({
      where: { email: adminEmail },
      update: { role: 'ADMIN' },
      create: {
        email: adminEmail,
        passwordHash: E2E_PASSWORD_HASH,
        displayName: `E2E Admin ${runId}`,
        role: 'ADMIN',
        emailVerified: true,
      },
    })

    // Upsert submitter user
    const submitter = await db.user.upsert({
      where: { email: submitterEmail },
      update: { role: 'SUBMITTER' },
      create: {
        email: submitterEmail,
        passwordHash: E2E_PASSWORD_HASH,
        displayName: `E2E Submitter ${runId}`,
        role: 'SUBMITTER',
        emailVerified: true,
      },
    })

    // Create a seed idea (title uses runId prefix for cleanup)
    const idea = await db.idea.create({
      data: {
        title: `[test:${runId}] E2E seed idea`,
        description: 'E2E seed idea — created by /api/test/seed for automated testing.',
        category: 'technical-innovation',
        status: 'SUBMITTED',
        visibility: 'PUBLIC',
        authorId: submitter.id,
      },
    })

    // Suppress unused var lint for admin
    void admin

    const result: TestSeedResult = {
      adminEmail,
      adminPassword: plainPassword,
      submitterEmail,
      submitterPassword: plainPassword,
      ideaId: idea.id,
    }

    return NextResponse.json(result, { status: 201 })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[test/seed]', err)
    return NextResponse.json({ error: 'seed failed' }, { status: 500 })
  }
}
