import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { env } from '@/lib/env'
import { DraftEditClient } from '@/components/ideas/draft-edit-client'
import type { Metadata } from 'next'
import type { CategorySlug } from '@/constants/categories'
import type { FieldDefinition } from '@/types/field-template'

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: 'Edit Draft — InnovatEPAM',
}

/**
 * T014 — Draft Management: Edit / resume a saved draft.
 *
 * Access rules:
 *   - Must be authenticated (redirects to /login)
 *   - idea.authorId must match session user
 *   - idea.status must be 'DRAFT'
 *   - Otherwise calls notFound()
 *
 * Expired drafts (draftExpiresAt < now OR isExpiredDraft) are shown in
 * read-only mode — no form rendered.
 *
 * T018 — The "Submit Idea" button lives inside IdeaForm; when draftId is
 * provided, IdeaForm routes the submit to submitDraft() automatically.
 */
export default async function EditDraftPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login?callbackUrl=/my-ideas')

  const { id } = await params
  const userId = session.user.id

  const idea = await db.idea.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      status: true,
      title: true,
      description: true,
      category: true,
      visibility: true,
      draftExpiresAt: true,
      isExpiredDraft: true,
      updatedAt: true,
    },
  })

  // Not found or not this user's draft
  if (!idea || idea.authorId !== userId || idea.status !== 'DRAFT') {
    notFound()
  }

  // Lazy expiry check — redirect flag off path to my-ideas
  const draftEnabled = env.FEATURE_DRAFT_ENABLED === 'true'
  if (!draftEnabled) redirect('/my-ideas')

  const isExpired =
    idea.isExpiredDraft || (idea.draftExpiresAt !== null && idea.draftExpiresAt < new Date())

  // Smart Forms templates
  const smartFormsEnabled = process.env.FEATURE_SMART_FORMS_ENABLED === 'true'
  let templates: Record<CategorySlug, FieldDefinition[]> | null = null
  if (smartFormsEnabled) {
    const rows = await db.categoryFieldTemplate.findMany()
    if (rows.length > 0) {
      templates = {} as Record<CategorySlug, FieldDefinition[]>
      for (const row of rows) {
        templates[row.category as CategorySlug] = row.fields as unknown as FieldDefinition[]
      }
    }
  }

  const attachmentEnabled = process.env.FEATURE_FILE_ATTACHMENT_ENABLED === 'true'
  const multiAttachmentEnabled = process.env.FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'

  // T022 — active draft count for limit enforcement
  const activeDraftCount = await db.idea.count({
    where: {
      authorId: userId,
      status: 'DRAFT',
      isExpiredDraft: false,
      draftExpiresAt: { gt: new Date() },
    },
  })

  const initialValues = {
    title: idea.title ?? '',
    description: idea.description ?? '',
    category: (idea.category ?? '') as CategorySlug | '',
    visibility: (idea.visibility as 'PUBLIC' | 'PRIVATE') ?? 'PUBLIC',
  }

  // eslint-disable-next-line react-hooks/purity -- server component; Date.now() runs at request time, not during client render
  const now = Date.now()
  const daysLeft =
    !isExpired && idea.draftExpiresAt
      ? Math.ceil((idea.draftExpiresAt.getTime() - now) / (1000 * 60 * 60 * 24))
      : null
  const showExpiryWarning = daysLeft !== null && daysLeft <= 7

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      {/* Back */}
      <Link
        href="/my-ideas"
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-[#8888A8] bg-white/[0.04] border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200"
      >
        ← My Ideas
      </Link>

      <div>
        <h1 className="text-2xl font-bold" style={{ color: '#F0F0FA' }}>
          Edit Draft
        </h1>
        <p className="mt-0.5 text-sm" style={{ color: '#8888A8' }}>
          {isExpired
            ? 'This draft has expired and can no longer be edited.'
            : 'Resume editing your draft. Changes are auto-saved every 60 seconds.'}
        </p>
      </div>

      {/* T023 — Expiry warning banner: shown when expiring within 7 days */}
      {showExpiryWarning && (
        <div
          role="alert"
          className="rounded-xl px-4 py-3 text-sm"
          style={{
            background: 'rgba(234,179,8,0.1)',
            border: '1px solid rgba(234,179,8,0.25)',
            color: '#fbbf24',
          }}
        >
          ⚠ This draft expires in <strong>{daysLeft === 1 ? '1 day' : `${daysLeft} days`}</strong>.
          Submit or save it to reset the 90-day timer.
        </div>
      )}

      {isExpired ? (
        <div
          className="rounded-2xl px-6 py-12 text-center"
          style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="mb-4 text-sm" style={{ color: '#8888A8' }}>
            This draft expired and has been removed. Start a new idea to continue.
          </p>
          <Link
            href="/ideas/new"
            className="rounded-full px-5 py-2 text-sm font-semibold text-white transition"
            style={{
              background: 'linear-gradient(135deg, #00c8ff, #0070f3)',
              boxShadow: '0 2px 12px rgba(0,200,255,0.2)',
            }}
          >
            New Idea
          </Link>
        </div>
      ) : (
        <DraftEditClient
          draftId={idea.id}
          userId={userId}
          serverUpdatedAt={idea.updatedAt.toISOString()}
          initialValues={initialValues}
          attachmentEnabled={attachmentEnabled}
          templates={templates}
          multiAttachmentEnabled={multiAttachmentEnabled}
          draftEnabled={draftEnabled}
          draftCount={activeDraftCount}
        />
      )}
    </div>
  )
}
