'use server'

/**
 * T025 — Server Action: delete an idea.
 *
 * Directly writes to the DB (no internal HTTP round-trip) so that the
 * authenticated session is always available via auth().
 * On success redirects to /my-ideas.
 * R-005, FR-019, FR-020, FR-026.
 */
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { db } from '@/lib/db'

export interface DeleteIdeaResult {
  error?: string
}

export async function deleteIdeaAction(ideaId: string): Promise<DeleteIdeaResult | never> {
  const session = await auth()
  if (!session?.user?.id) return { error: 'You must be signed in.' }

  const userId = session.user.id
  const role = session.user.role ?? 'SUBMITTER'

  const idea = await db.idea.findUnique({ where: { id: ideaId } })
  if (!idea) return { error: 'Idea not found.' }

  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN'

  if (!isAdmin) {
    if (idea.authorId !== userId) return { error: 'You are not allowed to delete this idea.' }
    if (idea.status !== 'SUBMITTED') return { error: 'You are not allowed to delete this idea.' }
  }

  await db.idea.delete({ where: { id: ideaId } })

  await db.auditLog.create({
    data: {
      actorId: userId,
      action: 'IDEA_DELETED',
      targetId: ideaId,
      metadata: { ideaTitle: idea.title, deletedByRole: role },
    },
  })

  redirect('/my-ideas')
}
