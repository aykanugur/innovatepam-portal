/**
 * T011 — POST /api/ideas — create a new idea.
 * T017 — GET /api/ideas — paginated idea list (added in Phase 4).
 *
 * All endpoints require an authenticated session (FR-027).
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { ideaSubmitRateLimiter } from '@/lib/rate-limit'
import { apiError } from '@/lib/api-error'
import { CreateIdeaSchema, IdeaListQuerySchema } from '@/lib/validations/idea'
import { put } from '@vercel/blob'

// ─── Allowed file types for attachment uploads ───────────────────────────────

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/markdown',
  'text/plain', // .md files often served as text/plain
])

const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

// ─── GET /api/ideas ──────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return apiError(401, 'Unauthorized')

  const { searchParams } = request.nextUrl
  const queryResult = IdeaListQuerySchema.safeParse({
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
    category: searchParams.get('category') ?? undefined,
  })

  if (!queryResult.success) {
    return apiError(400, 'Invalid query parameters', {
      errors: queryResult.error.flatten().fieldErrors,
    })
  }

  const { page, pageSize, category } = queryResult.data
  const skip = (page - 1) * pageSize
  const userId = session.user.id
  const role = session.user.role ?? 'SUBMITTER'

  // Visibility filter: SUBMITTER sees PUBLIC + own PRIVATE; ADMIN/SUPERADMIN see all
  const visibilityFilter =
    role === 'ADMIN' || role === 'SUPERADMIN'
      ? {}
      : {
          OR: [
            { visibility: 'PUBLIC' as const },
            { authorId: userId, visibility: 'PRIVATE' as const },
          ],
        }

  const categoryFilter = category ? { category } : {}

  const where = { ...visibilityFilter, ...categoryFilter }

  const [ideas, totalItems] = await Promise.all([
    db.idea.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
      include: { author: { select: { displayName: true } } },
    }),
    db.idea.count({ where }),
  ])

  const totalPages = Math.ceil(totalItems / pageSize)

  const data = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    category: idea.category,
    status: idea.status,
    visibility: idea.visibility,
    authorName: idea.author.displayName,
    createdAt: idea.createdAt.toISOString(),
  }))

  return NextResponse.json({
    data,
    meta: { page, pageSize, totalItems, totalPages },
  })
}

// ─── POST /api/ideas ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return apiError(401, 'Unauthorized')

  const userId = session.user.id

  // FR-029: Rate limit — 1 submission per 60 s
  const rl = await ideaSubmitRateLimiter.limit(userId)
  if (!rl.success) {
    const retryAfter = Math.ceil((rl.reset - Date.now()) / 1000)
    return apiError(429, 'Too many submissions', { retryAfter })
  }

  const attachmentEnabled = process.env.FEATURE_FILE_ATTACHMENT_ENABLED === 'true'

  let body: Record<string, unknown>
  let attachmentFile: File | null = null

  const contentType = request.headers.get('content-type') ?? ''

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData()
    body = {
      title: formData.get('title'),
      description: formData.get('description'),
      category: formData.get('category'),
      visibility: formData.get('visibility'),
    }
    const fileEntry = formData.get('attachment')
    if (fileEntry instanceof File && fileEntry.size > 0) {
      attachmentFile = fileEntry
    }
  } else {
    body = await request.json()
  }

  // Validate payload
  const parsed = CreateIdeaSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(400, 'Validation failed', {
      errors: parsed.error.flatten().fieldErrors,
    })
  }

  // Validate file attachment if present
  if (attachmentFile) {
    if (!attachmentEnabled) {
      // Ignore attachment when flag is off
      attachmentFile = null
    } else {
      const isAllowed =
        ALLOWED_MIME_TYPES.has(attachmentFile.type) ||
        attachmentFile.name.endsWith('.md') ||
        attachmentFile.name.endsWith('.markdown')

      if (!isAllowed) {
        return apiError(415, 'Only PDF, PNG, JPG, DOCX, and MD files are accepted')
      }
      if (attachmentFile.size > MAX_FILE_BYTES) {
        return apiError(413, 'File must be under 5 MB')
      }
    }
  }

  // Upload blob (T014) — if flag on and attachment present
  let attachmentPath: string | null = null
  let attachmentWarning: string | undefined

  if (attachmentEnabled && attachmentFile) {
    try {
      const { url } = await put(attachmentFile.name, attachmentFile, {
        access: 'public',
      })
      attachmentPath = url
    } catch {
      // Edge case: blob upload fails — save idea without attachment, include warning
      attachmentWarning = 'File upload failed; your idea was saved without the attachment.'
    }
  }

  // Persist idea record
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
    include: { author: { select: { displayName: true } } },
  })

  // Write AuditLog (IDEA_CREATED)
  // Blind review masking not applied — audit writes record actor identity, not idea author. (EPIC-V2-05 FR-011)
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

  return NextResponse.json(
    {
      data: {
        id: idea.id,
        title: idea.title,
        category: idea.category,
        status: idea.status,
        visibility: idea.visibility,
        authorName: idea.author.displayName,
        authorId: idea.authorId,
        description: idea.description,
        attachmentUrl: idea.attachmentPath,
        review: null,
        createdAt: idea.createdAt.toISOString(),
        ...(attachmentWarning ? { warning: attachmentWarning } : {}),
      },
    },
    { status: 201 }
  )
}
