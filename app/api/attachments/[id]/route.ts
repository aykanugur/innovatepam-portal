/**
 * app/api/attachments/[id]/route.ts
 *
 * T013 — GET /api/attachments/[id] — Secure proxied download
 * T014 — DELETE /api/attachments/[id] — Admin delete attachment
 *
 * Raw Vercel Blob URLs are never sent to the client; all downloads are proxied
 * through this route after access-control checks (FR-006, US-024, US-025).
 */
import { type NextRequest, NextResponse } from 'next/server'
import { storageDel, storageServe } from '@/lib/storage'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { apiError } from '@/lib/api-error'
import { DeleteAttachmentSchema } from '@/lib/validations/attachment'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET — Download proxy (US-024) ────────────────────────────────────────────

export async function GET(_request: NextRequest, { params }: RouteContext) {
  // ── Feature gate ───────────────────────────────────────────────────────────
  if (process.env.FEATURE_MULTI_ATTACHMENT_ENABLED !== 'true') {
    return apiError(404, 'Not found.')
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) return apiError(401, 'Unauthorized.')

  const { id } = await params

  // ── Load attachment + parent idea ─────────────────────────────────────────
  const attachment = await db.ideaAttachment.findUnique({
    where: { id },
    include: {
      idea: { select: { visibility: true, authorId: true } },
    },
  })

  if (!attachment) return apiError(404, 'Attachment not found.')

  // ── Access control ─────────────────────────────────────────────────────────
  const role = session.user.role ?? 'SUBMITTER'
  const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN'
  const isAuthor = attachment.idea.authorId === session.user.id
  const isPublicIdea = attachment.idea.visibility === 'PUBLIC'

  if (!isAdmin && !isAuthor && !isPublicIdea) {
    return apiError(403, 'Access denied.')
  }

  // ── Serve file (local fs or Vercel Blob proxy) ───────────────────────────
  try {
    const served = await storageServe(attachment.blobUrl)
    const contentType = attachment.mimeType || 'application/octet-stream'
    const safeFilename = encodeURIComponent(attachment.fileName).replace(/%20/g, ' ')
    const headers = {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    }

    if ('buffer' in served) {
      return new NextResponse(new Uint8Array(served.buffer), { status: 200, headers })
    }

    if (!served.response.ok || !served.response.body) {
      return apiError(502, 'File is no longer available.')
    }
    return new NextResponse(served.response.body, { status: 200, headers })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[attachments/GET] Fetch failed:', err)
    return apiError(502, 'File is no longer available.')
  }
}

// ─── DELETE — Admin remove attachment (US-025) ────────────────────────────────

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  // ── Feature gate ───────────────────────────────────────────────────────────
  if (process.env.FEATURE_MULTI_ATTACHMENT_ENABLED !== 'true') {
    return apiError(404, 'Not found.')
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  const session = await auth()
  if (!session?.user?.id) return apiError(401, 'Unauthorized.')

  // ── Role check ─────────────────────────────────────────────────────────────
  const role = session.user.role ?? 'SUBMITTER'
  if (role !== 'ADMIN' && role !== 'SUPERADMIN') {
    return apiError(403, 'Insufficient permissions.')
  }

  // ── Validate path param ────────────────────────────────────────────────────
  const { id } = await params
  const validation = DeleteAttachmentSchema.safeParse({ id })
  if (!validation.success) return apiError(400, 'Invalid attachment ID.')

  // ── Load attachment ────────────────────────────────────────────────────────
  const attachment = await db.ideaAttachment.findUnique({
    where: { id: validation.data.id },
    include: {
      idea: { select: { id: true, title: true } },
    },
  })

  if (!attachment) return apiError(404, 'Attachment not found.')

  // ── Delete from storage (non-fatal) ─────────────────────────────────────
  let storageError = false
  try {
    await storageDel(attachment.blobUrl)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[attachments/DELETE] Storage del failed (non-fatal):', err)
    storageError = true
  }

  // ── Delete DB record + audit log (atomic) ─────────────────────────────────
  try {
    await db.$transaction([
      db.ideaAttachment.delete({ where: { id: attachment.id } }),
      db.auditLog.create({
        data: {
          actorId: session.user.id,
          action: 'ATTACHMENT_DELETED',
          targetId: attachment.idea.id,
          metadata: {
            ideaId: attachment.idea.id,
            ideaTitle: attachment.idea.title,
            attachmentId: attachment.id,
            fileName: attachment.fileName,
            blobUrl: attachment.blobUrl,
            deletedByRole: role,
            storageError,
          },
        },
      }),
    ])
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[attachments/DELETE] DB transaction failed:', err)
    return apiError(500, 'Failed to delete attachment. Please try again.')
  }

  // ── Response ───────────────────────────────────────────────────────────────
  if (storageError) {
    // 200 with storageError flag: DB record removed but blob persists
    return NextResponse.json({ storageError: true }, { status: 200 })
  }

  // 204: clean delete — no body
  return new NextResponse(null, { status: 204 })
}
