'use server'

/**
 * T012 — Server Action: create a new idea.
 *
 * Directly writes to the DB (no internal HTTP round-trip) so that the
 * authenticated session is always available via auth().
 * Handles optional file attachment when FEATURE_FILE_ATTACHMENT_ENABLED=true.
 *
 * File storage strategy:
 *  - If BLOB_READ_WRITE_TOKEN is set  → use @vercel/blob (production)
 *  - Otherwise                        → save to public/uploads/ (local dev)
 *
 * On success returns { id } for client-side redirect to /ideas/<id>.
 * On error returns { error: string }.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import { storageDel } from '@/lib/storage'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { ideaSubmitRateLimiter } from '@/lib/rate-limit'
import { CreateIdeaSchema, buildDynamicFieldsSchema } from '@/lib/validations/idea'
import { AttachmentUrlsSchema } from '@/lib/validations/attachment'
import type { DynamicFields } from '@/types/field-template'

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
    isAnonymous: formData.get('isAnonymous') === 'true',
  })

  if (!parsed.success) {
    const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0]
    return { error: firstError ?? 'Validation failed.' }
  }

  // ── Dynamic fields (FR-010, FR-002) ──────────────────────────────────────
  const smartFormsEnabled = process.env.FEATURE_SMART_FORMS_ENABLED === 'true'
  let validatedDynamicFields: DynamicFields | null = null

  if (smartFormsEnabled) {
    const rawDynamic = formData.get('dynamicFields')

    if (rawDynamic && typeof rawDynamic === 'string' && rawDynamic !== '{}' && rawDynamic !== '') {
      // Parse the JSON payload (FR-018: unknown keys stripped by Zod .strip())
      let parsedDynamic: unknown
      try {
        parsedDynamic = JSON.parse(rawDynamic)
      } catch {
        return { error: 'Invalid dynamic fields format.' }
      }

      // Fetch template for the submitted category
      const template = await db.categoryFieldTemplate.findUnique({
        where: { category: parsed.data.category },
      })

      if (template && Array.isArray(template.fields) && template.fields.length > 0) {
        // Build and apply the dynamic Zod schema (FR-005, FR-006, FR-013, FR-016, FR-018)
        const dynamicSchema = buildDynamicFieldsSchema(
          template.fields as unknown as Parameters<typeof buildDynamicFieldsSchema>[0]
        )
        const dynamicResult = dynamicSchema.safeParse(parsedDynamic)

        if (!dynamicResult.success) {
          const firstDynamicError = Object.values(
            dynamicResult.error.flatten().fieldErrors
          ).flat()[0]
          return { error: firstDynamicError ?? 'Dynamic field validation failed.' }
        }

        // Only include fields that have actual values (optional blank fields are excluded)
        const nonEmptyFields: DynamicFields = {}
        for (const [k, v] of Object.entries(dynamicResult.data as Record<string, unknown>)) {
          if (v !== undefined && v !== '' && v !== null) {
            nonEmptyFields[k] = v as string | number
          }
        }
        validatedDynamicFields = Object.keys(nonEmptyFields).length > 0 ? nonEmptyFields : null
      }
    }
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

  // ── File storage ─────────────────────────────────────────────────────────
  // Production: Vercel Blob (when BLOB_READ_WRITE_TOKEN is set)
  // Local dev:  write to public/uploads/ and return a relative URL
  let attachmentPath: string | null = null

  if (attachmentFile) {
    try {
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        const { put } = await import('@vercel/blob')
        const { url } = await put(attachmentFile.name, attachmentFile, { access: 'public' })
        attachmentPath = url
      } else {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
        await fs.mkdir(uploadsDir, { recursive: true })
        const safeName = attachmentFile.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const filename = `${Date.now()}-${safeName}`
        await fs.writeFile(
          path.join(uploadsDir, filename),
          Buffer.from(await attachmentFile.arrayBuffer())
        )
        attachmentPath = `/uploads/${filename}`
      }
    } catch {
      // Non-fatal: store idea without attachment if write fails
      attachmentPath = null
    }
  }

  // ── Multi-attachment URLs (FR-005 server-side count guard) ─────────────────
  const multiAttachmentEnabled = process.env.FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'
  let attachmentUrls: string[] = []

  if (multiAttachmentEnabled) {
    const rawUrls = formData.get('attachmentUrls')
    const urlsResult = AttachmentUrlsSchema.safeParse(
      rawUrls && typeof rawUrls === 'string' ? JSON.parse(rawUrls) : []
    )
    if (!urlsResult.success) {
      const firstErr = urlsResult.error.issues[0]?.message
      return { error: firstErr ?? 'Invalid attachment URLs.' }
    }
    attachmentUrls = urlsResult.data
  }

  // ── Persist (atomic transaction) ─────────────────────────────────────────
  try {
    const idea = await db.$transaction(async (tx) => {
      const created = await tx.idea.create({
        data: {
          title: parsed.data.title,
          description: parsed.data.description,
          category: parsed.data.category,
          visibility: parsed.data.visibility,
          isAnonymous: parsed.data.isAnonymous,
          status: 'SUBMITTED',
          authorId: userId,
          attachmentPath,
          // T009 — Smart Forms: persist validated dynamic fields (FR-002)
          dynamicFields: validatedDynamicFields ?? undefined,
        },
      })

      // T009 — Multi-attachments: create IdeaAttachment records (FR-001, US-022)
      if (attachmentUrls.length > 0) {
        await tx.ideaAttachment.createMany({
          data: attachmentUrls.map((blobUrl) => ({
            ideaId: created.id,
            blobUrl,
            // Derive a readable filename from the URL path segment
            fileName: decodeURIComponent(blobUrl.split('/').pop()?.split('?')[0] ?? 'attachment'),
            fileSize: 0, // Content-Length came from the upload step; not re-read here
            mimeType: 'application/octet-stream', // stored MIME is in the blob, not re-checked here
            uploadedById: userId,
          })),
        })
      }

      await tx.auditLog.create({
        data: {
          actorId: userId,
          action: 'IDEA_CREATED',
          targetId: created.id,
          metadata: {
            ideaTitle: created.title,
            visibility: created.visibility,
            // FR-012: include dynamic fields in audit log when present
            ...(validatedDynamicFields ? { dynamicFields: validatedDynamicFields } : {}),
            ...(attachmentUrls.length > 0 ? { attachmentCount: attachmentUrls.length } : {}),
          },
        },
      })

      return created
    })

    return { id: idea.id }
  } catch (err) {
    // FR-009: orphaned-blob cleanup — delete already-uploaded blobs if transaction fails
    if (attachmentUrls.length > 0) {
      try {
        await storageDel(attachmentUrls)
      } catch (delErr) {
        // Non-fatal: log but do not mask the original error
        // eslint-disable-next-line no-console
        console.error('[createIdeaAction] Orphaned blob cleanup failed:', delErr)
      }
    }
    // eslint-disable-next-line no-console
    console.error('[createIdeaAction] Transaction failed:', err)
    return { error: 'Failed to save your idea. Please try again.' }
  }
}
