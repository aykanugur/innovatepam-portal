/**
 * T021: Prisma seed script — promotes SUPERADMIN_EMAIL to SUPERADMIN role.
 * T030: Seeds sample ideas with varied statuses, categories, and visibilities
 *       for local development and testing.
 * T041: Seeds IdeaReview rows for UNDER_REVIEW, ACCEPTED, and REJECTED ideas
 *       so the admin dashboard and review pages show realistic data locally.
 * Run via: npm run db:seed
 */
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword, generateToken } from '../lib/auth-utils'
import { CATEGORY_FIELD_TEMPLATES } from '../constants/field-templates'

// ─── Seed data constants ────────────────────────────────────────────────

// EPIC-V2-04: default 2-stage pipelines — one per category, all isDefault=true
const DEFAULT_PIPELINES: Array<{ name: string; categorySlug: string }> = [
  { name: 'Default Review', categorySlug: 'process-improvement' },
  { name: 'Default Review', categorySlug: 'new-product-service' },
  { name: 'Default Review', categorySlug: 'cost-reduction' },
  { name: 'Default Review', categorySlug: 'employee-experience' },
  { name: 'Default Review', categorySlug: 'technical-innovation' },
]

const SEED_IDEAS = [
  {
    title: 'Automated onboarding checklist for new joiners',
    description:
      'Create a self-service onboarding portal that walks new employees through mandatory compliance, tool setup, and team introductions — reducing manual overhead for HR.',
    category: 'employee-experience',
    status: 'SUBMITTED' as const,
    visibility: 'PUBLIC' as const,
  },
  {
    title: 'Reduce cloud infra costs with right-sizing analysis',
    description:
      'Run a quarterly right-sizing report on all cloud resources and auto-stop idle dev environments after business hours. Estimated savings: 25% on dev account spend.',
    category: 'cost-reduction',
    status: 'UNDER_REVIEW' as const,
    visibility: 'PUBLIC' as const,
  },
  {
    title: 'Internal AI code review assistant',
    description:
      'Integrate an LLM-powered code reviewer into our GitHub Actions pipeline that flags security anti-patterns, missing tests, and style violations before human review begins.',
    category: 'technical-innovation',
    status: 'ACCEPTED' as const,
    visibility: 'PUBLIC' as const,
  },
  {
    title: 'Lunch & learn speaker series',
    description:
      'Monthly 45-minute sessions where team members share expertise on a topic of their choosing. Build internal knowledge-sharing culture and reduce silo behaviour.',
    category: 'employee-experience',
    status: 'REJECTED' as const,
    visibility: 'PUBLIC' as const,
  },
  {
    title: 'Open-source our internal design system',
    description:
      'Publish our component library under MIT licence. Gain community feedback, attract developer talent, and reduce maintenance burden by leveraging external contributions.',
    category: 'new-product-service',
    status: 'SUBMITTED' as const,
    visibility: 'PRIVATE' as const,
  },
  {
    title: 'Streamline quarterly review process',
    description:
      'Replace the current 5-form PDF review cycle with a single web-based form connected to our HR system. Reduce completion time from 2 hours to 30 minutes per manager.',
    category: 'process-improvement',
    status: 'SUBMITTED' as const,
    visibility: 'PUBLIC' as const,
  },
]

async function main() {
  const email = process.env.SUPERADMIN_EMAIL
  if (!email) {
    throw new Error('SUPERADMIN_EMAIL environment variable is required for seeding.')
  }

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required for seeding.')
  }

  const adapter = new PrismaPg({ connectionString })
  const prisma = new PrismaClient({ adapter })

  try {
    // Generate a temporary password for the initial seed
    const tempPassword = generateToken().slice(0, 20)
    const passwordHash = await hashPassword(tempPassword)
    const displayName = email.split('@')[0]

    const user = await prisma.user.upsert({
      where: { email },
      update: { role: 'SUPERADMIN' },
      create: {
        email,
        passwordHash,
        displayName,
        role: 'SUPERADMIN',
        emailVerified: true,
      },
    })

    console.log(
      JSON.stringify({
        event: 'seed.superadmin',
        ts: new Date().toISOString(),
        email: user.email,
        userId: user.id,
        action: 'upserted',
      })
    )

    // Print temp password only for new accounts (update preserves existing hash)
    console.log(`\nSuperadmin seeded: ${user.email}`)
    console.log(`Temporary password (save this — shown only once): ${tempPassword}`)
    console.log(`Note: If this account already existed, the password was NOT changed.\n`)

    // ── T030: Seed sample ideas ──────────────────────────────────────────────
    // Only seed if no ideas exist (idempotent)
    const existingIdeaCount = await prisma.idea.count()
    if (existingIdeaCount === 0) {
      for (const ideaData of SEED_IDEAS) {
        const idea = await prisma.idea.create({
          data: {
            ...ideaData,
            authorId: user.id,
          },
        })

        // ── T041: Seed IdeaReview rows for non-SUBMITTED ideas ──────────────
        if (ideaData.status === 'UNDER_REVIEW') {
          await prisma.ideaReview.create({
            data: {
              ideaId: idea.id,
              reviewerId: user.id,
              startedAt: new Date(),
              // decision and decidedAt are null — review in progress
            },
          })
        } else if (ideaData.status === 'ACCEPTED') {
          const startedAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
          const decidedAt = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
          await prisma.ideaReview.create({
            data: {
              ideaId: idea.id,
              reviewerId: user.id,
              startedAt,
              decision: 'ACCEPTED',
              comment:
                'Excellent proposal with clear cost-benefit analysis. Approved for implementation in Q2.',
              decidedAt,
            },
          })
        } else if (ideaData.status === 'REJECTED') {
          const startedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
          const decidedAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000) // 4 days ago
          await prisma.ideaReview.create({
            data: {
              ideaId: idea.id,
              reviewerId: user.id,
              startedAt,
              decision: 'REJECTED',
              comment:
                'While creative, this initiative falls outside our current strategic priorities. Please resubmit in the next planning cycle with a revised scope.',
              decidedAt,
            },
          })
        }
      }
      console.log(`\nSeeded ${SEED_IDEAS.length} sample ideas with matching IdeaReview rows.`)
    } else {
      console.log(`\nSkipping idea seed — ${existingIdeaCount} ideas already exist.`)
    }

    // ── T006: Seed CategoryFieldTemplate rows (Smart Forms) ─────────────────
    // Idempotent: upserts on category slug so re-runs are safe (FR-011).
    for (const [slug, fields] of Object.entries(CATEGORY_FIELD_TEMPLATES)) {
      await prisma.categoryFieldTemplate.upsert({
        where: { category: slug },
        update: { fields: fields as object[], version: 1 },
        create: { category: slug, fields: fields as object[], version: 1 },
      })
    }
    console.log(
      `\nSeeded/updated ${Object.keys(CATEGORY_FIELD_TEMPLATES).length} CategoryFieldTemplate rows.`
    )

    // ── EPIC-V2-04: Seed default ReviewPipeline rows ────────────────────────
    // Idempotent: upsert on categorySlug. Each pipeline gets 2 stages:
    //   Stage 1 — Initial Review (isDecisionStage=false)
    //   Stage 2 — Final Decision (isDecisionStage=true)
    for (const pipeline of DEFAULT_PIPELINES) {
      const existing = await prisma.reviewPipeline.findUnique({
        where: { categorySlug: pipeline.categorySlug },
        include: { stages: true },
      })
      if (!existing) {
        await prisma.reviewPipeline.create({
          data: {
            name: pipeline.name,
            categorySlug: pipeline.categorySlug,
            isDefault: true,
            stages: {
              create: [
                {
                  name: 'Initial Review',
                  description: 'First-pass review by an admin.',
                  order: 1,
                  isDecisionStage: false,
                },
                {
                  name: 'Final Decision',
                  description: 'Final accept or reject decision.',
                  order: 2,
                  isDecisionStage: true,
                },
              ],
            },
          },
        })
      }
    }
    console.log(`\nSeeded/verified ${DEFAULT_PIPELINES.length} default ReviewPipeline rows.`)
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
