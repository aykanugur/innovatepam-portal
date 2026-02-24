'use server'

/**
 * T012 — Server Action: create a new idea.
 * Wraps POST /api/ideas. Handles both:
 *   - JSON path (flag off — no attachment): content-type: application/json
 *   - multipart path (flag on — with optional attachment): form data
 *
 * On success returns { id } for client-side redirect to /ideas/<id>.
 * On error returns { error: string }.
 */

export interface CreateIdeaResult {
  id?: string
  error?: string
}

export async function createIdeaAction(formData: FormData): Promise<CreateIdeaResult> {
  const attachmentEnabled = process.env.FEATURE_FILE_ATTACHMENT_ENABLED === 'true'

  const attachment = formData.get('attachment')
  const hasFile = attachmentEnabled && attachment instanceof File && attachment.size > 0

  let response: Response

  if (hasFile) {
    // Multipart path — let the API route parse FormData directly
    response = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/ideas`, {
      method: 'POST',
      body: formData,
      // No Content-Type header — browser sets multipart boundary automatically
      credentials: 'include',
    })
  } else {
    // JSON path
    const payload = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      visibility: formData.get('visibility'),
    }

    response = await fetch(`${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/ideas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'include',
    })
  }

  const json = await response.json()

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = json.retryAfter as number | undefined
      return {
        error: retryAfter
          ? `Please wait ${retryAfter} seconds before submitting again.`
          : 'Too many submissions. Please wait before trying again.',
      }
    }
    if (response.status === 400 && json.errors) {
      const firstError = Object.values(json.errors as Record<string, string[]>).flat()[0]
      return { error: firstError ?? 'Validation failed.' }
    }
    return { error: json.error ?? 'Failed to submit idea. Please try again.' }
  }

  return { id: json.data.id as string }
}
