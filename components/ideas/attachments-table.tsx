'use client'

/**
 * components/ideas/attachments-table.tsx
 *
 * T011/T015 — Attachment list component.
 *
 * Renders a list of IdeaAttachment records with:
 * - File name as a proxied download link (/api/attachments/{id})
 * - Human-readable file size (from formatFileSize; "—" for V1-migrated rows with size 0)
 * - Formatted upload date
 * - Truncated long filenames with full name on hover
 * - Delete button per row when canDelete=true (T015: AlertDialog + DELETE request)
 *
 * Renders nothing (null) when attachments array is empty — no empty state is shown.
 *
 * US-023 (attachment list), US-025 (admin delete affordance)
 */

import { useState } from 'react'
import { Trash2, FileIcon, Download } from 'lucide-react'
import { formatFileSize } from '@/constants/allowed-mime-types'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimal shape expected from Prisma's IdeaAttachment model */
export interface AttachmentRow {
  id: string
  fileName: string
  fileSize: number // 0 = V1-migrated, display as "—"
  mimeType: string
  createdAt: Date | string
}

interface AttachmentsTableProps {
  attachments: AttachmentRow[]
  /** When true, shows a delete button per row (admin use) */
  canDelete?: boolean
  /** Called after a row is successfully deleted (so parent can refresh if needed) */
  onDeleted?: (id: string) => void
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AttachmentsTable({
  attachments,
  canDelete = false,
  onDeleted,
}: AttachmentsTableProps) {
  const [rows, setRows] = useState<AttachmentRow[]>(attachments)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [storageWarning, setStorageWarning] = useState<string | null>(null)

  if (rows.length === 0) return null

  // ── Delete handler ─────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setDeletingId(id)
    setDeleteError(null)
    setStorageWarning(null)

    try {
      const resp = await fetch(`/api/attachments/${id}`, { method: 'DELETE' })

      if (resp.status === 204 || resp.status === 200) {
        if (resp.status === 200) {
          // storageError warning — blob could not be deleted but record IS removed
          setStorageWarning(
            'Attachment record removed, but the file could not be deleted from storage.'
          )
        }
        // Remove the row from local state
        setRows((prev) => prev.filter((r) => r.id !== id))
        onDeleted?.(id)
      } else {
        const body = await resp.json().catch(() => ({}))
        setDeleteError((body as { error?: string }).error ?? `Delete failed (${resp.status})`)
      }
    } catch {
      setDeleteError('Network error — please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section aria-label="Attachments" className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: '#C0C0D8' }}>
        Attachments
      </h3>

      {/* Storage warning toast */}
      {storageWarning && (
        <div
          role="alert"
          className="rounded-md border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400"
        >
          {storageWarning}
        </div>
      )}

      {/* Delete error */}
      {deleteError && (
        <div
          role="alert"
          className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
        >
          {deleteError}
        </div>
      )}

      <ul
        className="divide-y rounded-xl overflow-hidden"
        style={{
          background: '#1A1A2A',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 px-3.5 py-2.5 text-sm"
            aria-busy={deletingId === row.id}
            style={{ opacity: deletingId === row.id ? 0.5 : 1, transition: 'opacity 0.15s' }}
          >
            {/* File icon */}
            <FileIcon
              className="h-4 w-4 shrink-0"
              style={{ color: '#00c8ff' }}
              aria-hidden="true"
            />

            {/* Download link — proxied through API route */}
            <a
              href={`/api/attachments/${row.id}`}
              download={row.fileName}
              className="min-w-0 flex-1 truncate font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              style={{ color: '#F0F0FA' }}
              title={row.fileName}
            >
              {row.fileName}
            </a>

            {/* Download icon as visual cue */}
            <Download
              className="h-3.5 w-3.5 shrink-0"
              style={{ color: '#60607A' }}
              aria-hidden="true"
            />

            {/* File size */}
            <span className="shrink-0 text-xs tabular-nums" style={{ color: '#8888A8' }}>
              {row.fileSize === 0 ? '—' : formatFileSize(row.fileSize)}
            </span>

            {/* Upload date */}
            <span className="hidden shrink-0 text-xs sm:block" style={{ color: '#60607A' }}>
              {formatDate(row.createdAt)}
            </span>

            {/* Delete button — admin only (canDelete=true) */}
            {canDelete && (
              <button
                type="button"
                disabled={deletingId === row.id}
                onClick={async () => {
                  if (!window.confirm(`Delete "${row.fileName}"? This cannot be undone.`)) return
                  handleDelete(row.id)
                }}
                className="ml-1 shrink-0 rounded p-1 text-muted-foreground hover:text-red-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
                aria-label={`Delete ${row.fileName}`}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
