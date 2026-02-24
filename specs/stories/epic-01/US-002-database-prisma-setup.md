# User Story: Database & Prisma Schema Setup

**Story ID**: US-002  
**Epic**: EPIC-01 — Foundation & Infrastructure  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: S  
**Sprint**: Day 1 — AM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As a** developer,  
**I want to** connect Prisma to a managed PostgreSQL instance and define the initial schema with `User`, `Idea`, and `IdeaReview` models,  
**so that** all feature epics have a stable data layer to build on.

---

## Context & Motivation

Every feature in the portal reads from or writes to the database. Defining the schema once — correctly — prevents costly migrations mid-sprint. This story is a direct blocker for EPIC-02 (needs `User`) and EPIC-03 (needs `Idea`).

---

## Acceptance Criteria

1. **Given** Prisma is installed and `DATABASE_URL` is set,  
   **When** `npx prisma migrate dev --name init` is run,  
   **Then** the migration completes without errors and creates the `User`, `Idea`, and `IdeaReview` tables in PostgreSQL.

2. **Given** the migration has run,  
   **When** `npx prisma studio` is opened,  
   **Then** all three tables are visible with correct columns and relationships.

3. **Given** the schema is in place,  
   **When** a `PrismaClient` query is executed (e.g., `prisma.user.findMany()`),  
   **Then** it returns an empty array (no error) confirming connectivity.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | `DATABASE_URL` not set | `prisma migrate dev` fails with clear error; `.env.example` documents the required variable |
| 2 | Prisma version mismatch | Pin `prisma` and `@prisma/client` to the same version in `package.json` |
| 3 | Neon connection drops in serverless | Add `?pgbouncer=true&connection_limit=1` to `DATABASE_URL` |

---

## Technical Notes

```prisma
enum Role {
  SUBMITTER
  ADMIN
  SUPERADMIN
}

enum IdeaStatus {
  SUBMITTED
  UNDER_REVIEW
  ACCEPTED
  REJECTED
}

enum IdeaVisibility {
  PUBLIC
  PRIVATE
}

model User {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  displayName     String
  role            Role      @default(SUBMITTER)
  emailVerified   Boolean   @default(false)
  verificationToken String? 
  verificationTokenExpiry DateTime?
  createdAt       DateTime  @default(now())
  ideas           Idea[]
  reviews         IdeaReview[]
}

model Idea {
  id             String         @id @default(cuid())
  title          String
  description    String
  category       String
  status         IdeaStatus     @default(SUBMITTED)
  visibility     IdeaVisibility @default(PUBLIC)
  attachmentPath String?
  authorId       String
  author         User           @relation(fields: [authorId], references: [id])
  review         IdeaReview?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
}

model IdeaReview {
  id          String     @id @default(cuid())
  ideaId      String     @unique
  idea        Idea       @relation(fields: [ideaId], references: [id])
  reviewerId  String
  reviewer    User       @relation(fields: [reviewerId], references: [id])
  decision    IdeaStatus
  comment     String
  createdAt   DateTime   @default(now())
}
```

- **Feature Flag**: None

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-001 — Project scaffold | Story | Must be done first | Yes |
| Neon / Vercel Postgres instance provisioned | External | Required | Yes |

---

## Test Plan

### Manual Testing
- [ ] `npx prisma migrate dev --name init` completes with zero errors
- [ ] Prisma Studio shows `User`, `Idea`, `IdeaReview` tables
- [ ] `prisma.user.findMany()` returns `[]` without error

### Automated Testing
- [ ] Integration test: `prisma.user.create({ data: { ... } })` creates a record and `findUnique` returns it

---

## Definition of Done

- [ ] Migration runs without errors
- [ ] All 3 tables visible in Prisma Studio
- [ ] `schema.prisma` committed with correct enums and relations
- [ ] Connectivity verified with a test query
- [ ] `git commit: feat(db): add initial prisma schema`
