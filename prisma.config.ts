import { config } from 'dotenv'
import path from 'path'
import { defineConfig } from 'prisma/config'

// Next.js uses .env.local for local secrets; load it explicitly for Prisma CLI
config({ path: '.env.local' })
config({ path: '.env' }) // fallback

export default defineConfig({
  schema: path.join(import.meta.dirname, 'prisma/schema.prisma'),
  datasource: {
    // DIRECT_URL (non-pooled) is required for Prisma CLI migrations
    url: process.env.DIRECT_URL!,
  },
})
