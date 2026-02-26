/**
 * app/api/ideas/upload/route.ts
 *
 * T007 — POST /api/ideas/upload
 *
 * Uploads a single file to Vercel Blob storage and returns the resulting blobUrl.
 * Client sends the raw file body; filename is passed as a query parameter.
 * Up to MAX_FILE_COUNT calls per idea creation are expected.
 *
 * Security model:
 * - Feature-gated (FEATURE_MULTI_ATTACHMENT_ENABLED): returns 404 when off
 * - Requires authenticated session: returns 401 when unauthenticated
 * - Validates filename extension + Content-Type MIME against allowlist
 * - Validates Content-Length > 0 (non-empty) and ≤ MAX_FILE_SIZE_BYTES
 * - Access is 'private'; raw Vercel Blob URLs are never shown to the client
 *   (downloads are proxied through /api/attachments/[id])
 *
 * FR-003 (server-side MIME/extension allowlist)
 * FR-005 (per-file size limit: 25 MB)
 * FR-006 (non-public blob storage)
 */
import { NextRequest, NextResponse } from 'next/server'
import { storagePut } from '@/lib/storage'
import { auth } from '@/auth'
import { apiError } from '@/lib/api-error'
import { UploadRequestSchema } from '@/lib/validations/attachment'

export async function POST(request: NextRequest) {
  // ── Feature gate ─────────────────────────────────────────────────────────
  if (process.env.FEATURE_MULTI_ATTACHMENT_ENABLED !== 'true') {
    return apiError(404, 'Not found.')
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) {
    return apiError(401, 'Unauthorized.')
  }

  // ── Validate request parameters ───────────────────────────────────────────
  const { searchParams } = request.nextUrl
  const rawFilename = searchParams.get('filename') ?? ''
  const mimeType = request.headers.get('content-type') ?? ''
  const contentLength = request.headers.get('content-length')
  const fileSize = contentLength !== null ? Number(contentLength) : NaN

  const validation = UploadRequestSchema.safeParse({
    filename: rawFilename,
    mimeType,
    fileSize: Number.isFinite(fileSize) ? fileSize : 0,
  })

  if (!validation.success) {
    const firstIssue = validation.error.issues[0]
    // Map Zod refinement messages to HTTP status codes
    const msg = firstIssue.message
    if (msg.includes('empty')) return apiError(400, msg)
    if (msg.includes('MB limit') || msg.includes('exceeds')) return apiError(413, msg)
    return apiError(400, msg)
  }

  const { filename, fileSize: validatedSize } = validation.data

  // Guard against zero/missing Content-Length (file is empty)
  if (validatedSize <= 0) {
    return apiError(400, 'File is empty.')
  }

  // ── Upload to Vercel Blob ──────────────────────────────────────────────────
  if (!request.body) {
    return apiError(400, 'Request body is missing.')
  }

  try {
    const blob = await storagePut(filename, request.body, {
      contentType: validation.data.mimeType,
    })

    return NextResponse.json({ blobUrl: blob.url }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed.'
    // eslint-disable-next-line no-console
    console.error('[upload/route] Blob put failed:', message)
    return apiError(500, 'Failed to upload file. Please try again.')
  }
}
