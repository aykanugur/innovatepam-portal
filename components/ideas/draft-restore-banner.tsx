'use client'

/**
 * T014 — Draft Management: client-side localStorage restore banner.
 *
 * Shown when a newer auto-save snapshot exists in localStorage than the
 * server's draft. User can choose to restore (apply snapshot) or dismiss.
 * Rendered as an inline banner — NOT a toast (per spec).
 */

import { useState, useEffect, startTransition } from 'react'

interface DraftSnapshot {
  title?: string
  description?: string
  category?: string
  visibility?: 'PUBLIC' | 'PRIVATE'
  timestamp: number
}

interface DraftRestoreBannerProps {
  userId: string
  draftId: string
  /** ISO string of the server draft's last updatedAt */
  serverUpdatedAt: string
  onRestore: (snapshot: {
    title?: string
    description?: string
    category?: string
    visibility?: string
  }) => void
}

export function DraftRestoreBanner({
  userId,
  draftId,
  serverUpdatedAt,
  onRestore,
}: DraftRestoreBannerProps) {
  const [snapshot, setSnapshot] = useState<DraftSnapshot | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try {
      const key = `draft_autosave_${userId}_${draftId}`
      const raw = localStorage.getItem(key)
      if (!raw) return
      const parsed: DraftSnapshot = JSON.parse(raw)
      const serverTs = new Date(serverUpdatedAt).getTime()
      if (parsed.timestamp > serverTs) {
        startTransition(() => setSnapshot(parsed))
      }
    } catch {
      // malformed JSON or no localStorage — silently ignore
    }
  }, [userId, draftId, serverUpdatedAt])

  if (!snapshot || dismissed) return null

  function handleRestore() {
    if (!snapshot) return
    const { timestamp: _, ...fields } = snapshot
    onRestore(fields)
    setDismissed(true)
  }

  function handleDiscard() {
    try {
      localStorage.removeItem(`draft_autosave_${userId}_${draftId}`)
    } catch {}
    setDismissed(true)
  }

  return (
    <div
      role="alert"
      className="flex flex-col gap-3 rounded-xl px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
      style={{
        background: 'rgba(0,200,255,0.08)',
        border: '1px solid rgba(0,200,255,0.2)',
      }}
    >
      <p className="text-sm" style={{ color: '#C0C0D8' }}>
        We found unsaved changes from{' '}
        <span style={{ color: '#00c8ff' }}>
          {new Date(snapshot.timestamp).toLocaleTimeString()}
        </span>
        . Restore them?
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={handleRestore}
          className="rounded-full px-4 py-1.5 text-xs font-semibold transition"
          style={{
            background: 'rgba(0,200,255,0.15)',
            border: '1px solid rgba(0,200,255,0.3)',
            color: '#00c8ff',
          }}
        >
          Yes, restore
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          className="rounded-full px-4 py-1.5 text-xs font-semibold transition"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#8888A8',
          }}
        >
          No, discard
        </button>
      </div>
    </div>
  )
}
