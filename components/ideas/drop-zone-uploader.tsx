'use client'

/**
 * components/ideas/drop-zone-uploader.tsx
 *
 * T008 — Multi-file drag-and-drop upload component.
 *
 * Features:
 * - Drag-and-drop or click-to-browse (keyboard-accessible: Enter/Space triggers browse)
 * - Validates file type (extension + MIME), non-zero size, count, and total size
 *   against constants from constants/allowed-mime-types.ts
 * - Per-file upload via POST /api/ideas/upload
 * - Shows per-file row: name, human-readable size, remove (×) button
 * - Per-file and batch inline error messages
 * - aria-live region announces file additions and removals for screen readers
 * - Exposes onUploadsChange(blobUrls: string[]) callback for parent form
 *
 * FR-003: client-side MIME/extension allowlist (mirrors server-side)
 * FR-005: MAX_FILE_COUNT and MAX_TOTAL_SIZE_BYTES enforced before upload
 */

import { useCallback, useRef, useState, useId, DragEvent, KeyboardEvent } from 'react'
import { Upload, X, FileIcon, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ALLOWED_EXTENSIONS,
  ALLOWED_MIME_TYPES,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
  formatFileSize,
  isAllowedFile,
  isAllowedExtension,
  isAllowedMimeType,
} from '@/constants/allowed-mime-types'

// ─── Types ────────────────────────────────────────────────────────────────────

interface UploadedFile {
  /** Local id for list key, not the DB id */
  localId: string
  name: string
  size: number
  blobUrl: string
  uploading: boolean
  error?: string
}

interface DropZoneUploaderProps {
  /** Called whenever the list of successfully uploaded blobUrls changes */
  onUploadsChange: (blobUrls: string[]) => void
  /** Disable all interactions (e.g. while form is submitting) */
  disabled?: boolean
  className?: string
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DropZoneUploader({ onUploadsChange, disabled, className }: DropZoneUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [batchError, setBatchError] = useState<string | null>(null)
  const [liveAnnouncement, setLiveAnnouncement] = useState('')

  const inputRef = useRef<HTMLInputElement>(null)
  const liveRegionId = useId()
  const fileInputId = useId()

  // ── Announce to screen readers ────────────────────────────────────────────
  const announce = useCallback((msg: string) => {
    setLiveAnnouncement('')
    // Small delay forces re-render so assistive tech picks up the change
    setTimeout(() => setLiveAnnouncement(msg), 50)
  }, [])

  // ── Notify parent of current successful blobUrls ──────────────────────────
  const notify = useCallback(
    (updated: UploadedFile[]) => {
      const urls = updated.filter((f) => !f.uploading && !f.error).map((f) => f.blobUrl)
      onUploadsChange(urls)
    },
    [onUploadsChange]
  )

  // ── Upload a single File to the server ────────────────────────────────────
  const uploadFile = useCallback(async (file: File) => {
    try {
      const url = `/api/ideas/upload?filename=${encodeURIComponent(file.name)}`
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': file.type, 'Content-Length': String(file.size) },
        body: file,
      })

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
        return { error: (body.error as string) || `Upload failed (${resp.status})` }
      }

      const { blobUrl } = await resp.json()
      return { blobUrl: blobUrl as string }
    } catch {
      return { error: 'Network error — please retry.' }
    }
  }, [])

  // ── Process incoming File list ─────────────────────────────────────────────
  const processFiles = useCallback(
    async (incoming: File[]) => {
      setBatchError(null)

      const currentSuccessful = files.filter((f) => !f.error)
      const remaining = MAX_FILE_COUNT - currentSuccessful.length

      if (remaining <= 0) {
        setBatchError(`You can attach at most ${MAX_FILE_COUNT} files per idea.`)
        return
      }

      // Validate each file client-side
      const accepted: File[] = []
      const rejected: string[] = []

      for (const file of incoming) {
        // Validate extension first (faster), then MIME type
        const extOk = isAllowedExtension(file.name)
        const mimeOk = isAllowedMimeType(file.type)
        const typeOk = isAllowedFile(file.name, file.type)
        if (!typeOk) {
          const reason =
            !extOk && !mimeOk
              ? 'File type is not allowed.'
              : !extOk
                ? `Extension ".${file.name.split('.').pop()}" is not allowed.`
                : `MIME type "${file.type}" is not allowed.`
          rejected.push(`${file.name}: ${reason}`)
        } else {
          accepted.push(file)
        }
      }

      // Trim to available slots
      const toUpload = accepted.slice(0, remaining)
      if (accepted.length > remaining) {
        rejected.push(
          `${accepted.length - remaining} file(s) skipped — max ${MAX_FILE_COUNT} attachments reached.`
        )
      }

      // Check total size
      const currentTotalSize = currentSuccessful.reduce((s, f) => s + f.size, 0)
      let runningTotal = currentTotalSize
      const sizeFiltered: File[] = []
      for (const file of toUpload) {
        if (runningTotal + file.size > MAX_TOTAL_SIZE_BYTES) {
          rejected.push(
            `${file.name}: would exceed the ${formatFileSize(MAX_TOTAL_SIZE_BYTES)} total limit.`
          )
        } else {
          runningTotal += file.size
          sizeFiltered.push(file)
        }
      }

      if (rejected.length > 0) {
        setBatchError(rejected.join('\n'))
      }

      if (sizeFiltered.length === 0) return

      // Add placeholder rows immediately (uploading=true)
      const newRows: UploadedFile[] = sizeFiltered.map((file) => ({
        localId: uid(),
        name: file.name,
        size: file.size,
        blobUrl: '',
        uploading: true,
      }))

      setFiles((prev) => {
        const updated = [...prev, ...newRows]
        notify(updated)
        return updated
      })

      announce(`Uploading ${sizeFiltered.length} file(s)…`)

      // Upload in parallel
      await Promise.all(
        sizeFiltered.map(async (file, i) => {
          const localId = newRows[i].localId
          const result = await uploadFile(file)

          setFiles((prev) => {
            const updated = prev.map((row) => {
              if (row.localId !== localId) return row
              if ('error' in result && result.error) {
                return { ...row, uploading: false, error: result.error }
              }
              return { ...row, uploading: false, blobUrl: result.blobUrl ?? '', error: undefined }
            })
            notify(updated)
            return updated
          })

          if ('error' in result && result.error) {
            announce(`Failed to upload ${file.name}: ${result.error}`)
          } else {
            announce(`${file.name} uploaded successfully.`)
          }
        })
      )
    },
    [files, uploadFile, announce, notify]
  )

  // ── Remove a file ─────────────────────────────────────────────────────────
  const removeFile = useCallback(
    (localId: string, name: string) => {
      setFiles((prev) => {
        const updated = prev.filter((f) => f.localId !== localId)
        notify(updated)
        return updated
      })
      announce(`${name} removed.`)
    },
    [announce, notify]
  )

  // ── Drag events ───────────────────────────────────────────────────────────
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) setDragging(true)
  }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    if (disabled) return
    const dropped = Array.from(e.dataTransfer.files)
    processFiles(dropped)
  }

  // ── Keyboard activation (Enter/Space on the label) ─────────────────────
  const onKeyDown = (e: KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (!disabled) inputRef.current?.click()
    }
  }

  // ── Accepted formats helper text ──────────────────────────────────────────
  const acceptedExts = ALLOWED_EXTENSIONS.map((e) => `.${e}`).join(', ')
  const acceptAttr = ALLOWED_MIME_TYPES.join(',')

  return (
    <div className={cn('space-y-3', className)}>
      {/* Drop zone — using <label> so clicking anywhere natively opens the file picker */}
      <label
        htmlFor={fileInputId}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={`Attach files. Drag and drop or press Enter to browse. Accepted formats: ${acceptedExts}. Max ${MAX_FILE_COUNT} files, ${formatFileSize(MAX_FILE_SIZE_BYTES)} each.`}
        onDragOver={onDragOver as unknown as React.DragEventHandler<HTMLLabelElement>}
        onDragLeave={onDragLeave as unknown as React.DragEventHandler<HTMLLabelElement>}
        onDrop={onDrop as unknown as React.DragEventHandler<HTMLLabelElement>}
        onKeyDown={onKeyDown}
        className={cn(
          'flex flex-col items-center justify-center gap-2 rounded-xl p-6 text-center transition-colors cursor-pointer select-none',
          disabled && 'pointer-events-none cursor-not-allowed opacity-50'
        )}
        style={{
          background: dragging ? 'rgba(0,200,255,0.08)' : '#1A1A2A',
          border: dragging ? '2px dashed rgba(0,200,255,0.6)' : '2px dashed rgba(0,200,255,0.25)',
        }}
      >
        <Upload style={{ color: '#00c8ff', width: 28, height: 28 }} aria-hidden="true" />
        <div className="space-y-1">
          <p className="text-sm font-medium" style={{ color: '#F0F0FA' }}>
            Drop files here or{' '}
            <span style={{ color: '#00c8ff', textDecoration: 'underline', textUnderlineOffset: 2 }}>
              browse
            </span>
          </p>
          <p className="text-xs" style={{ color: '#60607A' }}>
            Up to {MAX_FILE_COUNT} files · {formatFileSize(MAX_FILE_SIZE_BYTES)} each ·{' '}
            {formatFileSize(MAX_TOTAL_SIZE_BYTES)} total
          </p>
          <p className="text-xs" style={{ color: '#60607A' }}>
            {acceptedExts}
          </p>
        </div>
      </label>

      {/* Hidden file input — id wired to the label above */}
      <input
        ref={inputRef}
        id={fileInputId}
        type="file"
        multiple
        accept={acceptAttr}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? [])
          e.target.value = '' // reset so same file can be re-selected
          processFiles(picked)
        }}
      />

      {/* Batch error */}
      {batchError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl p-3 text-xs"
          style={{
            background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.2)',
            color: '#F87171',
          }}
        >
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <pre className="whitespace-pre-wrap font-sans">{batchError}</pre>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <ul className="space-y-1.5" aria-label="Attached files">
          {files.map((file) => (
            <li
              key={file.localId}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition"
              style={{
                background: file.error ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
                border: file.error
                  ? '1px solid rgba(239,68,68,0.3)'
                  : '1px solid rgba(255,255,255,0.1)',
                opacity: file.uploading ? 0.6 : 1,
              }}
            >
              <FileIcon
                style={{ color: '#60607A', width: 16, height: 16, flexShrink: 0 }}
                aria-hidden="true"
              />

              {/* Name + size */}
              <span
                className="min-w-0 flex-1 truncate"
                title={file.name}
                aria-label={`${file.name}, ${formatFileSize(file.size)}`}
                style={{ color: '#F0F0FA' }}
              >
                {file.name}
              </span>
              <span className="shrink-0 text-xs" style={{ color: '#60607A' }} aria-hidden="true">
                {formatFileSize(file.size)}
              </span>

              {/* Upload state */}
              {file.uploading && (
                <span
                  className="shrink-0 text-xs"
                  style={{ color: '#00c8ff' }}
                  aria-label="Uploading…"
                >
                  ↑
                </span>
              )}

              {/* Per-file error */}
              {file.error && !file.uploading && (
                <span
                  role="alert"
                  className="shrink-0 max-w-[120px] truncate text-xs"
                  style={{ color: '#F87171' }}
                  title={file.error}
                  aria-label={`Error: ${file.error}`}
                >
                  {file.error}
                </span>
              )}

              {/* Remove button */}
              {!file.uploading && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file.localId, file.name)
                  }}
                  className="ml-1 shrink-0 rounded p-0.5 transition"
                  style={{ color: '#60607A' }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = '#F0F0FA')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = '#60607A')}
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Hidden live region for screen reader announcements */}
      <div id={liveRegionId} aria-live="polite" aria-atomic="true" className="sr-only">
        {liveAnnouncement}
      </div>
    </div>
  )
}
