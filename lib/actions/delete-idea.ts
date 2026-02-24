'use server'

/**
 * T025 — Server Action: delete an idea.
 * Wraps DELETE /api/ideas/[id].
 * On success redirects to /my-ideas.
 * On 403/404/other errors propagates the error message to the caller.
 * R-005.
 */
import { redirect } from 'next/navigation'

export interface DeleteIdeaResult {
  error?: string
}

export async function deleteIdeaAction(ideaId: string): Promise<DeleteIdeaResult | never> {
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'

  const response = await fetch(`${baseUrl}/api/ideas/${ideaId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (response.ok) {
    redirect('/my-ideas')
  }

  let message = 'Failed to delete idea.'
  try {
    const json = await response.json()
    message = json.error ?? message
  } catch {
    // ignore parse errors
  }

  if (response.status === 403) {
    return { error: 'You are not allowed to delete this idea.' }
  }
  if (response.status === 404) {
    return { error: 'Idea not found.' }
  }

  return { error: message }
}
