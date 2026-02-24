/**
 * T021: Prisma seed script — promotes SUPERADMIN_EMAIL to SUPERADMIN role.
 * Run via: npm run db:seed
 */
import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashPassword, generateToken } from '../lib/auth-utils'

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
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
