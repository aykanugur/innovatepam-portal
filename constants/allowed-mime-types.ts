/**
 * T002 — Multi-Media Attachments: strict MIME allowlist (FR-008).
 * Shared between client (DropZoneUploader) and server (upload Route Handler).
 *
 * Resolution policy: MIME type OR extension match is sufficient.
 * Extension is the reliable primary signal for .md files (browsers often
 * report application/octet-stream for .md). Both must fail for rejection.
 */

export const ALLOWED_MIME_TYPES = [
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'text/plain',
  'text/markdown',
  // Word
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  // Excel
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number]

export const ALLOWED_EXTENSIONS = [
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.txt',
  '.md',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
] as const

export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]

/** 25 MB — max size per individual file (FR-006) */
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024

/** 100 MB — max combined size across all files in one submission (FR-007) */
export const MAX_TOTAL_SIZE_BYTES = 100 * 1024 * 1024

/** 10 — max number of attachments per idea (FR-005) */
export const MAX_FILE_COUNT = 10

/**
 * Returns true if the given MIME type is in the allowlist.
 */
export function isAllowedMimeType(mime: string): boolean {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(mime)
}

/**
 * Returns true if the given filename has an allowed extension (case-insensitive).
 */
export function isAllowedExtension(filename: string): boolean {
  const lower = filename.toLowerCase()
  return (ALLOWED_EXTENSIONS as readonly string[]).some((ext) => lower.endsWith(ext))
}

/**
 * Returns true if the file passes MIME or extension check (either is sufficient).
 */
export function isAllowedFile(filename: string, mimeType: string): boolean {
  return isAllowedMimeType(mimeType) || isAllowedExtension(filename)
}

/**
 * Format a file size in bytes to a human-readable string.
 *
 * Rules (per spec Assumptions):
 *   0                    → "—"  (V1-migrated rows with unknown size)
 *   1 – 1,023            → "< 1 KB"
 *   1,024 – 1,048,575    → "X.X KB"
 *   ≥ 1,048,576          → "X.X MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '—'
  if (bytes < 1024) return '< 1 KB'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
