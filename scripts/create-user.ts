import { PrismaClient } from '../lib/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

async function main() {
  const hash = await bcrypt.hash('ae1177ae', 12)
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  const prisma = new PrismaClient({ adapter })

  const existing = await prisma.user.findUnique({ where: { email: 'aykanugur@epam.com' } })
  if (existing) {
    console.log('User already exists:', existing.email)
  } else {
    const user = await prisma.user.create({
      data: {
        email: 'aykanugur@epam.com',
        displayName: 'Aykan Ugur',
        passwordHash: hash,
        emailVerified: true,
        role: 'SUBMITTER',
      },
    })
    console.log('Created user:', user.email, user.id)
  }
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
