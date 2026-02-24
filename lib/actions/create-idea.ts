'use server'

/**
 * T012 — Server Action: create a new idea.
 *
 * Directly writes to the DB (no internal HTTP round-trip) so that the
 * authenticated session is always available via auth().
 * Handles optional file attachment when FEATURE_FILE_ATTACHMENT_ENABLED=true.
 *
 * On success returns { id } for client-side redirect to /ideas/<id>.
 * On error returns { error: string }.
 */

import { auth } from '@/auth'
import { db } from '@/lib/db'
import { ideaSubmitRateLimiter } from '@/lib/rate-limit'
import { CreateIdeaSchema } from '@/lib/validations/idea'
import { put } from '@vercel/blob'

export interface CreateIdeaResult {
  id?: string
  error?: string
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain',
])
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

export async function createIdeaAction(formData: FormData): Promise<CreateIdeaResult> {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) return { error: 'You must be signed in to submit an idea.' }

  const userId = session.user.id

  // ── Rate limit ────────────────────────────────────────────────────────────
  const rl = await ideaSubmitRateLimiter.limit(userId)
  if (!rl.success) {
    const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
    return {
      error:
        retryAfter > 0
          ? `Please wait ${retryAfter} seconds before submitting again.`
          : 'Too many submissions. Please wait before trying again.',
    }
  }

  // ── Validate fields ───────────────────────────────────────────────────────
  const parsed = CreateIdeaSchema.safeParse({
    title: formData.get('title'),
    description: formData.get('description'),
    category: formData.get('category'),
    visibility: formData.get('visibility'),
  })

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0]
    return { error: firstError ?? 'Validation failed.' }
  }

  // ── File attachment ───────────────────────────────────────────────────────
  const attachmentEnabled = process.env.FEATURE_FILE_ATTACHMENT_ENABLED === 'true'
  const fileEntry = formData.get('attachment')
  const attachmentFile: File | null =
    attachmentEnabled && fileEntry instanceof File && fileEntry.size > 0 ? fileEntry : null

  if (attachmentFile) {
    const isAllowed =
      ALLOWED_MIME_TYPES.has(attachmentFile.type) ||
      attachmentFile.name.endsWith('.md') ||
      attachmentFile.name.endsWith('.markdown')

    if (!isAllowed) return { error: 'Only PDF, PNG, JPG, DOCX, and MD files are accepted.' }
    if (attachmentFile.size > MAX_FILE_BYTES) return { error: 'File must be under 5 MB.' }
  }

  // ── Blob upload ───────────────────────────────────────────────────────────
  let attachmentPath: string | null = null

  if (attachmentFile) {
    try {
      const { url } = await put(attachmentFile.name, attachmentFile, { access: 'public' })
      attachmentPath = url
    } catch {
      // Non-fatal: save idea without attachment
      attachmentPath = null
    }
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  try {
    const idea = await db.idea.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        category: parsed.data.category,
        visibility: parsed.data.visibility,
        status: 'SUBMITTED',
        authorId: userId,
        attachmentPath,
      },
    })

    await db.auditLog.create({
      data: {
        actorId: userId,
        action: 'IDEA_CREATED',
        targetId: idea.id,
        metadata: {
          ideaTitle: idea.title,
          visibility: idea.visibility,
        },
      },
    })

    return { id: idea.id }
  } catch {
    return { error: 'Failed to save your idea. Please try again.' }
  }
}
