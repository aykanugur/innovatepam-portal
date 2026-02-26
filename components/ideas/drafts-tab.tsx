'use client'

/**
 * T015 — Draft Management: Drafts tab content for /my-ideas page.
 *
 * Shows active drafts (resume/delete) and expired drafts (read-only).
 * Delete opens an AlertDialog confirmation modal.
 * Clears localStorage key on confirmed delete.
 * Handles empty states per spec US2 scenario 3.
 */

import { useState, useTransition, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { deleteDraft } from '@/lib/actions/delete-draft'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DraftRow {
  id: string
  title: string | null
  category: string | null
  updatedAt: string // ISO string
  draftExpiresAt: string | null // ISO or null
  isExpiredDraft: boolean
}

interface DraftsTabProps {
  drafts: DraftRow[]
  expiredDrafts: DraftRow[]
  userId: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  return new Date(iso).toLocaleDateString()
}

function daysUntilExpiry(isoExpiry: string): number {
  return Math.ceil((new Date(isoExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

// ─── AlertDialog (inline, no radix dependency for dialog) ────────────────────

interface ConfirmDialogProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

function ConfirmDeleteDialog({ open, onConfirm, onCancel, isPending }: ConfirmDialogProps) {
  // Close on Escape key
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 shadow-xl"
        style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        <h2
          id="confirm-dialog-title"
          className="text-base font-semibold"
          style={{ color: '#F0F0FA' }}
        >
          Delete Draft?
        </h2>
        <p id="confirm-dialog-desc" className="mt-2 text-sm" style={{ color: '#8888A8' }}>
          This action cannot be undone.
        </p>
        <div className="mt-5 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
             
            autoFocus
            className="rounded-full px-4 py-2 text-sm font-semibold transition"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: '#C0C0D8',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-60"
            style={{
              background: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.3)',
              color: '#F87171',
            }}
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Draft Row ────────────────────────────────────────────────────────────────

function DraftItem({
  draft,
  userId,
  onDeleted,
}: {
  draft: DraftRow
  userId: string
  onDeleted: (id: string) => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [deleteError, setDeleteError] = useState<string | null>(null)
  // Keep a ref to the delete trigger so we can return focus after dialog closes
  const deleteBtnRef = useRef<HTMLButtonElement>(null)

  const handleCancel = useCallback(() => {
    setConfirmOpen(false)
    // Return focus to the button that opened the dialog
    requestAnimationFrame(() => deleteBtnRef.current?.focus())
  }, [])

  function handleConfirmDelete() {
    startTransition(async () => {
      const result = await deleteDraft(draft.id)
      if ('error' in result) {
        setDeleteError(result.error)
        setConfirmOpen(false)
        requestAnimationFrame(() => deleteBtnRef.current?.focus())
        return
      }
      // Clear localStorage key
      try {
        localStorage.removeItem(`draft_autosave_${userId}_${draft.id}`)
      } catch {}
      setConfirmOpen(false)
      onDeleted(draft.id)
    })
  }

  const daysLeft =
    !draft.isExpiredDraft && draft.draftExpiresAt ? daysUntilExpiry(draft.draftExpiresAt) : null

  return (
    <>
      <ConfirmDeleteDialog
        open={confirmOpen}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancel}
        isPending={isPending}
      />
      <li
        className="flex flex-col gap-2 rounded-xl px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
        style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold" style={{ color: '#F0F0FA' }}>
            {draft.title?.trim() || 'Untitled Draft'}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: '#60607A' }}>
            {draft.category || 'No category'} · saved {formatRelativeTime(draft.updatedAt)}
            {daysLeft !== null && daysLeft <= 14 && (
              <span style={{ color: daysLeft <= 3 ? '#F87171' : '#fbbf24' }}>
                {' '}
                · expires in {daysLeft}d
              </span>
            )}
          </p>
          {deleteError && (
            <p className="mt-1 text-xs" style={{ color: '#F87171' }}>
              {deleteError}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/ideas/${draft.id}/edit`}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition"
            style={{
              background: 'rgba(0,200,255,0.1)',
              border: '1px solid rgba(0,200,255,0.2)',
              color: '#00c8ff',
            }}
          >
            Resume
          </Link>
          <button
            ref={deleteBtnRef}
            type="button"
            onClick={() => setConfirmOpen(true)}
            aria-label={`Delete draft: ${draft.title?.trim() || 'Untitled Draft'}`}
            disabled={isPending}
            className="rounded-full px-3.5 py-1.5 text-xs font-semibold transition disabled:opacity-40"
            style={{
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#F87171',
            }}
          >
            Delete
          </button>
        </div>
      </li>
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DraftsTab({
  drafts: initialDrafts,
  expiredDrafts,
  userId,
}: DraftsTabProps) {
  const [drafts, setDrafts] = useState(initialDrafts)
  const router = useRouter()

  function handleDeleted(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
    // Refresh server data in background to keep counts in sync
    router.refresh()
  }

  const activeDrafts = drafts.filter((d) => !d.isExpiredDraft)
  const count = activeDrafts.length

  return (
    <div className="space-y-6">
      {/* Active Drafts */}
      <section>
        <h2
          className="mb-3 flex items-center gap-2 text-sm font-semibold"
          style={{ color: '#C0C0D8' }}
        >
          Active Drafts
          {count > 0 && (
            <span
              aria-label={`${count} active drafts`}
              className="rounded-full px-2 py-0.5 text-xs font-bold"
              style={{ background: 'rgba(0,200,255,0.15)', color: '#00c8ff' }}
            >
              {count}
            </span>
          )}
        </h2>

        {activeDrafts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl py-12 text-center"
            style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <p className="mb-4 text-sm" style={{ color: '#8888A8' }}>
              You have no saved drafts. Start an idea and save it as a draft to continue later.
            </p>
            <Link
              href="/ideas/new"
              className="rounded-full px-5 py-2 text-sm font-semibold text-white transition"
              style={{
                background: 'linear-gradient(135deg, #00c8ff, #0070f3)',
                boxShadow: '0 2px 12px rgba(0,200,255,0.2)',
              }}
            >
              Start an Idea
            </Link>
          </div>
        ) : (
          <ul className="space-y-2" role="list">
            {activeDrafts.map((draft) => (
              <DraftItem key={draft.id} draft={draft} userId={userId} onDeleted={handleDeleted} />
            ))}
          </ul>
        )}
      </section>

      {/* T022 — Expired Drafts section */}
      {expiredDrafts.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold" style={{ color: '#60607A' }}>
            Expired Drafts
          </h2>
          <ul className="space-y-2 opacity-60" role="list">
            {expiredDrafts.map((draft) => (
              <li
                key={draft.id}
                className="flex items-center justify-between rounded-xl px-4 py-3"
                style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div>
                  <p className="text-sm" style={{ color: '#8888A8' }}>
                    {draft.title?.trim() || 'Untitled Draft'}
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: '#60607A' }}>
                    {draft.category || 'No category'} · expired
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
