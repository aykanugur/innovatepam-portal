/**
 * T025: Server Action — update a user's role.
 * SUPERADMIN only. Prevents self-change and SUPERADMIN assignment.
 */
'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { db } from '@/lib/db'

type AllowedRole = 'SUBMITTER' | 'ADMIN'

interface UpdateUserRoleResult {
  error?: string
  userId?: string
  newRole?: AllowedRole
}

export async function updateUserRole(
  targetId: string,
  newRole: AllowedRole
): Promise<UpdateUserRoleResult> {
  const session = await auth()

  if (!session?.user?.id) {
    return { error: 'Not authenticated.' }
  }

  // Re-read caller role from DB to prevent stale JWT (R-007)
  const caller = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true },
  })

  if (!caller || caller.role !== 'SUPERADMIN') {
    return { error: 'Insufficient permissions. Only SUPERADMIN can change user roles.' }
  }

  // Prevent self-role-change
  if (targetId === caller.id) {
    return { error: 'You cannot change your own role.' }
  }

  // Guard: never allow assigning SUPERADMIN via this action
  if ((newRole as string) === 'SUPERADMIN') {
    return { error: 'Only SUPERADMIN can assign the SUPERADMIN role.' }
  }

  // Verify target user exists
  const target = await db.user.findUnique({
    where: { id: targetId },
    select: { id: true, email: true, role: true },
  })

  if (!target) {
    return { error: 'User not found.' }
  }

  await db.user.update({
    where: { id: targetId },
    data: { role: newRole },
  })

  revalidatePath('/admin/users')

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({
      event: 'role.changed',
      ts: new Date().toISOString(),
      callerId: caller.id,
      targetId,
      targetEmail: target.email,
      oldRole: target.role,
      newRole,
    })
  )

  return { userId: targetId, newRole }
}
