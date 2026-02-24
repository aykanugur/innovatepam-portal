import { db } from '../lib/db'
import { hashPassword } from '../lib/auth-utils'

async function main() {
  const email = process.argv[2]
  const password = process.argv[3]
  if (!email) {
    console.error('Usage: npx tsx scripts/promote-superadmin.ts <email> [password]')
    process.exit(1)
  }

  const existing = await db.user.findUnique({ where: { email } })

  if (existing) {
    const updates: Record<string, unknown> = { role: 'SUPERADMIN' }
    if (password) updates.passwordHash = await hashPassword(password)
    const user = await db.user.update({ where: { email }, data: updates })
    console.log(`✓ Updated ${user.email} → ${user.role}`)
  } else {
    if (!password) {
      console.error('User not found. Provide a password to create the account.')
      process.exit(1)
    }
    const passwordHash = await hashPassword(password)
    const user = await db.user.create({
      data: {
        email,
        passwordHash,
        displayName: 'Super Admin',
        role: 'SUPERADMIN',
      },
    })
    console.log(`✓ Created ${user.email} → ${user.role}`)
  }

  await db.$disconnect()
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
