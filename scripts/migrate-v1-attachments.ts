/**
 * scripts/migrate-v1-attachments.ts
 *
 * US-021 / T006: Back-fills IdeaAttachment rows from the legacy Idea.attachmentPath field.
 *
 * Every Idea with attachmentPath IS NOT NULL gets an IdeaAttachment upsert so that
 * the new multi-attachment model contains all historical files from V1.
 *
 * Design:
 * - Idempotent: safe to run multiple times (upsert on unique (ideaId, blobUrl))
 * - fileSize: 0  — V1 path stored no size metadata; 0 is the sentinel for "unknown"
 * - mimeType: 'application/octet-stream' — MIME unknown for legacy blobs
 * - uploadedById: idea.authorId — best-effort attribution
 * - createdAt: idea.createdAt — preserves original submission date
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/migrate-v1-attachments.ts
 *
 * Exit codes:
 *   0 — completed successfully
 *   1 — DB error; migration was not fully applied
 */
import { db } from '../lib/db'

async function main() {
  console.log('→ Scanning ideas with V1 attachmentPath…')

  const ideas = await db.idea.findMany({
    where: {
      attachmentPath: { not: null },
    },
    select: {
      id: true,
      authorId: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attachmentPath: true as any,
      createdAt: true,
    },
  })

  if (ideas.length === 0) {
    console.log('✓ No V1 attachment records found — nothing to migrate.')
    return
  }

  console.log(`  Found ${ideas.length} ideas with V1 attachmentPath.`)

  let processed = 0
  let created = 0
  let skipped = 0
  let errors = 0

  for (const idea of ideas) {
    processed++
    const blobUrl = (idea as unknown as { attachmentPath: string }).attachmentPath

    // Derive a human-readable filename from the blob URL path segment
    const urlSegment = blobUrl.split('/').pop() ?? 'attachment'
    // Strip query params and decode URI components for readability
    const rawName = urlSegment.split('?')[0]
    let fileName: string
    try {
      fileName = decodeURIComponent(rawName)
    } catch {
      fileName = rawName
    }

    try {
      const result = await db.ideaAttachment.upsert({
        where: {
          ideaId_blobUrl: {
            ideaId: idea.id,
            blobUrl,
          },
        },
        create: {
          ideaId: idea.id,
          blobUrl,
          fileName,
          fileSize: 0, // unknown — V1 did not store size
          mimeType: 'application/octet-stream',
          uploadedById: idea.authorId,
          createdAt: idea.createdAt, // preserve original submission date
        },
        update: {}, // no-op on duplicate — idempotent
      })

      // Prisma upsert doesn't distinguish create vs. update directly;
      // rely on createdAt equality as a proxy (created rows have idea.createdAt;
      // existing rows may differ if already set to exact createdAt — both = skip)
      // A simpler proxy: count.
      void result
      // We detect "created" by running the upsert and comparing counts below
      created++
    } catch (err) {
      errors++
      const message = err instanceof Error ? err.message : String(err)
      console.error(`  ✗ [idea:${idea.id}] ${message}`)
    }
  }

  // Recount actual skipped by re-querying (accounts for Prisma upsert no-op)
  // This is a best-effort second pass to give accurate counts.
  const actualCount = await db.ideaAttachment.count({
    where: {
      idea: {
        attachmentPath: { not: null },
      },
    },
  })

  // Rows that existed before this run = total matching - those we just inserted
  // Simple heuristic: if actualCount >= ideas.length, everything is accounted for
  const netCreated = Math.max(0, actualCount - (ideas.length - errors))
  skipped = Math.max(0, created - netCreated)
  created = netCreated

  console.log('\n─ Migration Summary ────────────────────────────────')
  console.log(`  Processed : ${processed}`)
  console.log(`  Created   : ${created}`)
  console.log(`  Skipped   : ${skipped}  (already existed — idempotent)`)
  console.log(`  Errors    : ${errors}`)
  console.log('────────────────────────────────────────────────────')

  if (errors > 0) {
    console.error(`\n✗ ${errors} error(s) encountered — review logs above.`)
    process.exit(1)
  }

  console.log('\n✅ V1 attachment migration complete.')
}

main()
  .catch((err) => {
    console.error('✗ Fatal error:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
