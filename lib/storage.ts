/**
 * lib/storage.ts
 *
 * Thin storage adapter — uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise falls back to local filesystem (public/uploads/attachments/).
 *
 * This lets the feature work in local dev without a Vercel account.
 */
import { mkdir, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

// ── Helpers ────────────────────────────────────────────────────────────────────

const LOCAL_UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'attachments')

const USE_LOCAL = !process.env.BLOB_READ_WRITE_TOKEN

async function streamToBuffer(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}

// ── storagePut ─────────────────────────────────────────────────────────────────

interface PutOptions {
  contentType: string
}

interface PutResult {
  url: string
}

/**
 * Upload a file. Returns `{ url }` — either a local path or a Vercel Blob URL.
 */
export async function storagePut(
  filename: string,
  body: ReadableStream<Uint8Array>,
  options: PutOptions
): Promise<PutResult> {
  if (USE_LOCAL) {
    const uid = randomUUID()
    // Sanitise filename: keep alphanumeric, dots, hyphens, underscores only
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_{2,}/g, '_')
    const storedName = `${uid}-${safe}`

    await mkdir(LOCAL_UPLOAD_DIR, { recursive: true })
    const buffer = await streamToBuffer(body)
    await writeFile(join(LOCAL_UPLOAD_DIR, storedName), buffer)

    return { url: `/uploads/attachments/${storedName}` }
  }

  // Vercel Blob path — dynamic import keeps the bundle clean in local-only builds
  const { put } = await import('@vercel/blob')
  const blob = await put(filename, body, {
    access: 'private',
    addRandomSuffix: true,
    contentType: options.contentType,
  })
  return { url: blob.url }
}

// ── storageDel ─────────────────────────────────────────────────────────────────

/**
 * Delete one or more files by URL. Silently ignores missing local files.
 */
export async function storageDel(urls: string | string[]): Promise<void> {
  const list = Array.isArray(urls) ? urls : [urls]

  if (USE_LOCAL) {
    for (const url of list) {
      if (!url.startsWith('/uploads/')) continue
      const filename = url.split('/').pop()
      if (!filename) continue
      await unlink(join(LOCAL_UPLOAD_DIR, filename)).catch(() => {
        // File already gone — not an error
      })
    }
    return
  }

  const { del } = await import('@vercel/blob')
  await del(list)
}

// ── storageServe ───────────────────────────────────────────────────────────────

/**
 * Fetch file bytes for streaming to the client.
 * Returns Buffer (local) or a Response body (Vercel Blob).
 */
export async function storageServe(
  url: string
): Promise<{ buffer: Buffer; contentType?: string } | { response: Response }> {
  if (url.startsWith('/uploads/')) {
    // Local file — read from filesystem
    const { readFile } = await import('fs/promises')
    const filename = url.split('/').pop()
    if (!filename) throw new Error('Invalid local URL')
    const buffer = await readFile(join(LOCAL_UPLOAD_DIR, filename))
    return { buffer }
  }

  // Vercel Blob — proxy with Authorization token
  const fetchHeaders: HeadersInit = {}
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    fetchHeaders['Authorization'] = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`
  }
  const response = await fetch(url, { headers: fetchHeaders })
  return { response }
}
