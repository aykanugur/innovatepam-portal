/**
 * lib/validations/attachment.ts
 *
 * Zod schemas for attachment upload and delete requests.
 *
 * FR-003: Only explicitly whitelisted MIME types are accepted.
 * FR-005: Per-file size ≤ MAX_FILE_SIZE_BYTES; total size ≤ MAX_TOTAL_SIZE_BYTES; count ≤ MAX_FILE_COUNT.
 */
import { z } from 'zod'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
} from '@/constants/allowed-mime-types'

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Strip directory traversal characters and collapse whitespace. */
const sanitiseFilename = (name: string) =>
  name
    .replace(/^[./\\]+/, '') // remove leading dots/slashes (path traversal)
    .replace(/\.\.([\/\\]|$)/g, '_') // replace ../ and ..\  sequences
    .replace(/[\/\\]+/g, '_') // replace remaining slashes
    .replace(/\s+/g, '_') // no spaces
    .replace(/_{2,}/g, '_') // collapse repeated underscores
    .slice(0, 255) // max 255 chars (ext4/NTFS safe)

const allowedMimesSet = new Set<string>(ALLOWED_MIME_TYPES)
const allowedExtsSet = new Set<string>(ALLOWED_EXTENSIONS)

// ─── Upload request schema ────────────────────────────────────────────────────

/**
 * Validates a single-file upload request coming in via the `?filename` query
 * param and the `Content-Type` / `Content-Length` headers.
 *
 * Usage (server-side, route handler):
 *   const result = UploadRequestSchema.safeParse({
 *     filename: searchParams.get('filename'),
 *     mimeType: request.headers.get('content-type'),
 *     fileSize: Number(request.headers.get('content-length')),
 *   })
 */
export const UploadRequestSchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required.')
    .transform(sanitiseFilename)
    .refine((name) => {
      const ext = name.includes('.') ? `.${name.split('.').pop()!.toLowerCase()}` : ''
      return allowedExtsSet.has(ext)
    }, 'File extension is not allowed.'),

  mimeType: z
    .string()
    .min(1, 'Content-Type is required.')
    .transform((v) => v.split(';')[0].trim().toLowerCase()) // strip charset etc.
    .refine((mime) => allowedMimesSet.has(mime), 'File type is not allowed.'),

  fileSize: z
    .number()
    .int()
    .positive('File is empty.')
    .max(
      MAX_FILE_SIZE_BYTES,
      `File exceeds the ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB limit.`
    ),
})

export type UploadRequestInput = z.infer<typeof UploadRequestSchema>

// ─── Batch upload schema (used by Server Action for count-guard) ──────────────

/**
 * Validates the array of `blobUrl` strings submitted with the idea creation
 * form — guards against clients that bypass the UI's MAX_FILE_COUNT limit.
 *
 * FR-005 server-side count guard.
 */
export const AttachmentUrlsSchema = z
  .array(
    z.string().refine((v) => {
      // Accept local relative paths (e.g. /uploads/attachments/…) or full URLs
      if (v.startsWith('/')) return true
      try {
        new URL(v)
        return true
      } catch {
        return false
      }
    }, 'Each attachment URL must be a valid URL.')
  )
  .max(MAX_FILE_COUNT, `Cannot exceed ${MAX_FILE_COUNT} attachments per idea.`)
  .default([])

export type AttachmentUrlsInput = z.infer<typeof AttachmentUrlsSchema>

// ─── Delete request schema ────────────────────────────────────────────────────

/**
 * Validates a delete request — just an `id` path segment.
 *
 * Usage:
 *   const result = DeleteAttachmentSchema.safeParse({ id: params.id })
 */
export const DeleteAttachmentSchema = z.object({
  id: z.string().min(1, 'Attachment ID is required.'),
})

export type DeleteAttachmentInput = z.infer<typeof DeleteAttachmentSchema>
