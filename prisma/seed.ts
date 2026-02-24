/**
 * T021: Prisma seed script — promotes SUPERADMIN_EMAIL to SUPERADMIN role.
 * T030: Seeds sample ideas with varied statuses, categories, and visibilities
 *       for local development and testing.
 * Run via: npm run db:seed
 */
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword, generateToken } from '../lib/auth-utils'

// ─── Seed data constants ──────────────────────────────────────────────────────

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
        await prisma.idea.create({
          data: {
            ...ideaData,
            authorId: user.id,
          },
        })
      }
      console.log(`\nSeeded ${SEED_IDEAS.length} sample ideas for local development.`)
    } else {
      console.log(`\nSkipping idea seed — ${existingIdeaCount} ideas already exist.`)
    }
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
