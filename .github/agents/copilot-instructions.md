# innovatepam-portal Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-24

## Active Technologies

- TypeScript 5.x — Node.js 22 + Next.js 16 (App Router), React 19, Auth.js v5, Prisma v7, Zod 3, Radix UI, Tailwind v4, `@upstash/ratelimit`, `@upstash/redis`, `@vercel/blob` (new) (002-idea-submission)
- PostgreSQL via Neon (Prisma v7 + `@prisma/adapter-pg`); Vercel Blob for file attachments (002-idea-submission)

- TypeScript 5.4+ / Node.js 24.13.1 + Next.js 16.1.6, `next-auth@beta` (Auth.js v5), `bcryptjs`, `@resend/node`, `@upstash/ratelimit`, `@upstash/redis`, Prisma 7.4.1, shadcn/ui canary, Zod, Tailwind CSS v4 (001-auth-rbac)
- Neon PostgreSQL via `@prisma/adapter-pg` (existing from 001-foundation); two new nullable fields added to `User` model via migration (001-auth-rbac)

- TypeScript 5.4+ / Node.js 20.9+ (Next.js 16 requirement) + Next.js 16 (App Router), Tailwind CSS v4, shadcn/ui, Prisma v7.4.1, Zod, Vitest v4, Playwrigh (001-foundation)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.4+ / Node.js 20.9+ (Next.js 16 requirement): Follow standard conventions

## Recent Changes

- 002-idea-submission: Added TypeScript 5.x — Node.js 22 + Next.js 16 (App Router), React 19, Auth.js v5, Prisma v7, Zod 3, Radix UI, Tailwind v4, `@upstash/ratelimit`, `@upstash/redis`, `@vercel/blob` (new)
- 002-idea-submission: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]

- 001-auth-rbac: Added TypeScript 5.4+ / Node.js 24.13.1 + Next.js 16.1.6, `next-auth@beta` (Auth.js v5), `bcryptjs`, `@resend/node`, `@upstash/ratelimit`, `@upstash/redis`, Prisma 7.4.1, shadcn/ui canary, Zod, Tailwind CSS v4

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
