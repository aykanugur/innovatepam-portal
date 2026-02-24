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
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <span
            className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-medium ${badge.bg} ${badge.text}`}
            aria-label={`Status: ${badge.label}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
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
      <div className="rounded-xl border border-border bg-card p-6">
        <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{description}</p>
      </div>

      {/* Attachment (FR-018 / FR-030) */}
      {attachmentUrl && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Attachment</h2>
          {attachmentEnabled ? (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-primary hover:underline"
            >
              Download Attachment →
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Attachment unavailable</p>
          )}
        </div>
      )}

      {/* Review card (FR-017) — only rendered when decision is finalized (not during UNDER_REVIEW state) */}
      {review && review.decision !== null && review.comment !== null && (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Review Decision</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  review.decision === 'ACCEPTED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {review.decision === 'ACCEPTED' ? 'Accepted' : 'Rejected'}
              </span>
            </div>
            <p className="text-sm text-foreground">{review.comment}</p>
            <p className="text-xs text-muted-foreground">
              Reviewed by {review.reviewerName} on{' '}
              {new Date(review.reviewedAt).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Delete affordances (T027) */}
      {/* Author can delete only when status = SUBMITTED (FR-019) */}
      {isAuthor && status === 'SUBMITTED' && (
        <DeleteIdeaModal ideaId={id} userDisplayName={currentUser.displayName} />
      )}

      {/* Admin/Superadmin can delete any idea (FR-020) */}
      {isAdmin && <AdminDeleteButton ideaId={id} />}
    </div>
  )
}
