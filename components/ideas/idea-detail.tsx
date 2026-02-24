/**
 * T020 — Idea detail component.
 * Renders the full idea: title, description, author, category, visibility,
 * status badge, submission date, optional review card and attachment link.
 * T027: wire in delete affordances (DeleteIdeaModal for author, AdminDeleteButton for admins).
 *
 * FR-016: full fields. FR-017: review card when review !== null.
 * FR-018/FR-030: Download link when flag on + URL present; "Attachment unavailable"
 *   when URL present but flag off.
 * FR-019/FR-020: Delete buttons based on role and status.
 */
import { STATUS_BADGE_CLASSES } from '@/constants/status-badges'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'
import type { IdeaStatus, IdeaVisibility } from '@/lib/generated/prisma/client'
import DeleteIdeaModal from '@/components/ideas/delete-idea-modal'
import AdminDeleteButton from '@/components/ideas/admin-delete-button'

interface IdeaReviewDetail {
  // FR-007, SC-002: nullable — IdeaReview.decision and .comment are null
  // while UNDER_REVIEW; only set when finalized (ACCEPTED or REJECTED)
  decision: 'ACCEPTED' | 'REJECTED' | null
  comment: string | null
  reviewerName: string
  reviewedAt: string
}

interface IdeaDetailProps {
  id: string
  title: string
  description: string
  category: string
  status: IdeaStatus
  visibility: IdeaVisibility
  authorName: string
  authorId: string
  createdAt: string
  attachmentUrl: string | null
  review: IdeaReviewDetail | null
  /** The currently authenticated user's information */
  currentUser: {
    id: string
    displayName: string
    role: string
  }
  /** Whether FEATURE_FILE_ATTACHMENT_ENABLED=true */
  attachmentEnabled: boolean
}

export default function IdeaDetail({
  id,
  title,
  description,
  category,
  status,
  visibility,
  authorName,
  authorId,
  createdAt,
  attachmentUrl,
  review,
  currentUser,
  attachmentEnabled,
}: IdeaDetailProps) {
  const badge = STATUS_BADGE_CLASSES[status]
  const categoryLabel = CATEGORY_LABEL[category as CategorySlug] ?? category

  const isAuthor = currentUser.id === authorId
  const isAdmin = currentUser.role === 'ADMIN' || currentUser.role === 'SUPERADMIN'

  const formattedDate = new Date(createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-bold" style={{ color: '#F0F0FA' }}>
            {title}
          </h1>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ${badge.bg} ${badge.text}`}
            aria-label={`Status: ${badge.label}`}
          >
            {badge.label}
          </span>
        </div>

        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
          style={{ color: '#8888A8' }}
        >
          <span>By {authorName}</span>
          <span aria-hidden>·</span>
          <span>{categoryLabel}</span>
          <span aria-hidden>·</span>
          <span className="capitalize">{visibility === 'PUBLIC' ? 'Public' : 'Private'}</span>
          <span aria-hidden>·</span>
          <time dateTime={createdAt}>{formattedDate}</time>
        </div>
      </div>

      {/* Description */}
      <div
        className="rounded-2xl p-6"
        style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: '#D0D0E8' }}>
          {description}
        </p>
      </div>

      {/* Attachment (FR-018 / FR-030) */}
      {attachmentUrl ? (
        <div
          className="rounded-2xl p-4"
          style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h2 className="mb-2 text-sm font-semibold" style={{ color: '#C0C0D8' }}>
            Attachment
          </h2>
          {attachmentEnabled ? (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium transition hover:opacity-80"
              style={{ color: '#00c8ff' }}
            >
              Download Attachment →
            </a>
          ) : (
            <p className="text-sm" style={{ color: '#60607A' }}>
              Attachment unavailable
            </p>
          )}
        </div>
      ) : null}

      {/* Review card (FR-017) */}
      {review && review.decision !== null && review.comment !== null ? (
        <div
          className="rounded-2xl p-6"
          style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <h2 className="mb-4 text-sm font-semibold" style={{ color: '#C0C0D8' }}>
            Review Decision
          </h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
                style={{
                  background:
                    review.decision === 'ACCEPTED'
                      ? 'rgba(16,185,129,0.15)'
                      : 'rgba(239,68,68,0.15)',
                  color: review.decision === 'ACCEPTED' ? '#34D399' : '#F87171',
                }}
              >
                {review.decision === 'ACCEPTED' ? 'Accepted' : 'Rejected'}
              </span>
            </div>
            <p className="text-sm" style={{ color: '#D0D0E8' }}>
              {review.comment}
            </p>
            <p className="text-xs" style={{ color: '#60607A' }}>
              Reviewed by {review.reviewerName} on{' '}
              {new Date(review.reviewedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      ) : null}

      {/* Delete affordances (T027) */}
      {isAuthor && status === 'SUBMITTED' ? (
        <DeleteIdeaModal ideaId={id} userDisplayName={currentUser.displayName} />
      ) : null}

      {isAdmin ? <AdminDeleteButton ideaId={id} /> : null}
    </div>
  )
}
