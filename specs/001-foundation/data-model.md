# Data Model: Foundation & Infrastructure

**Phase**: 1 — Design  
**Branch**: `001-foundation`  
**Date**: 2026-02-24  
**Spec references**: FR-005, FR-006, FR-007, FR-008, FR-014, FR-016

---

## Overview

Four entities in a single initial migration (FR-005). All auth-related fields (`passwordHash`, `VerificationToken`) are included from Day 1 so EPIC-02 requires no additional schema migration.

```
User ──< Idea >── IdeaReview
User ──< IdeaReview
User ──< VerificationToken (conceptual — tied by email, not FK)
```

---

## Prisma Schema

Location: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client"
  output   = "../lib/generated/prisma"
}

datasource db {
  provider = "postgresql"
  // url and directUrl are configured in prisma.config.ts (Prisma v7)
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  SUBMITTER    // standard employee (default)
  ADMIN        // can review ideas
  SUPERADMIN   // full platform access; auto-promoted via SUPERADMIN_EMAIL seed
}

enum IdeaStatus {
  SUBMITTED      // initial state on creation
  UNDER_REVIEW   // admin has opened the review
  ACCEPTED       // admin decision: accepted
  REJECTED       // admin decision: rejected
}

enum IdeaVisibility {
  PUBLIC   // visible to all authenticated users
  PRIVATE  // visible only to author and admins
}

// ─── Models ───────────────────────────────────────────────────────────────────

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String    // bcrypt hash; set at registration (EPIC-02)
  displayName   String    // NOT NULL; auto-derived from email local-part at registration (FR-014)
  role          Role      @default(SUBMITTER)
  emailVerified Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  ideas    Idea[]       @relation("UserIdeas")
  reviews  IdeaReview[] @relation("UserReviews")
}

model Idea {
  id             String         @id @default(cuid())
  title          String
  description    String
  category       String         // constrained at app layer to IDEA_CATEGORIES list (FR-016)
  status         IdeaStatus     @default(SUBMITTED)
  visibility     IdeaVisibility @default(PUBLIC)
  attachmentPath String?        // nullable; populated when FEATURE_FILE_ATTACHMENT_ENABLED=true

  authorId  String
  author    User       @relation("UserIdeas", fields: [authorId], references: [id])

  review    IdeaReview? @relation("IdeaReview")

  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model IdeaReview {
  id         String     @id @default(cuid())
  decision   IdeaStatus // ACCEPTED or REJECTED only
  comment    String

  ideaId     String  @unique  // one review per idea (FR-008)
  idea       Idea    @relation("IdeaReview", fields: [ideaId], references: [id])

  reviewerId String
  reviewer   User   @relation("UserReviews", fields: [reviewerId], references: [id])

  createdAt  DateTime @default(now())
}

model VerificationToken {
  id      String   @id @default(cuid())
  email   String
  token   String   @unique
  expires DateTime

  @@index([email])
}
```

---

## Entity Details

### User

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK, `cuid()` | Collision-resistant unique ID |
| `email` | `String` | `@unique` | Work email (`@epam.com`) |
| `passwordHash` | `String` | NOT NULL | bcrypt; never returned to client |
| `displayName` | `String` | NOT NULL | Auto-derived: `"aykan.ugur"` from `"aykan.ugur@epam.com"` (FR-014) |
| `role` | `Role` | `@default(SUBMITTER)` | Elevated via admin action or `SUPERADMIN_EMAIL` seed |
| `emailVerified` | `Boolean` | `@default(false)` | Set to `true` by EPIC-02 verification flow |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | Auto-managed by Prisma |

**`displayName` derivation rule** (app layer, before DB insert):
```ts
const displayName = email.split('@')[0] // "aykan.ugur"
```

### Idea

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK, `cuid()` | |
| `title` | `String` | NOT NULL | |
| `description` | `String` | NOT NULL | Long text |
| `category` | `String` | NOT NULL | Must be in `IDEA_CATEGORIES` (Zod; FR-016) |
| `status` | `IdeaStatus` | `@default(SUBMITTED)` | Lifecycle (FR-007) |
| `visibility` | `IdeaVisibility` | `@default(PUBLIC)` | (FR-007) |
| `attachmentPath` | `String?` | nullable | File path/URL; requires `FEATURE_FILE_ATTACHMENT_ENABLED=true` |
| `authorId` | `String` | FK → `User.id` | |
| `createdAt` | `DateTime` | `@default(now())` | |
| `updatedAt` | `DateTime` | `@updatedAt` | |

**Category validation** (app layer, before DB insert):
```ts
// constants/idea-categories.ts
import { z } from 'zod'

export const IDEA_CATEGORIES = [
  'Process Improvement',
  'Technology & Tools',
  'Culture & Wellbeing',
  'Customer Experience',
  'Cost Reduction',
  'Learning & Development',
  'Other',
] as const

export type IdeaCategory = (typeof IDEA_CATEGORIES)[number]

export const ideaCategorySchema = z.enum(IDEA_CATEGORIES)
```

### IdeaReview

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK, `cuid()` | |
| `decision` | `IdeaStatus` | NOT NULL | Only `ACCEPTED` or `REJECTED` valid (app-layer Zod) |
| `comment` | `String` | NOT NULL | Mandatory reviewer comment |
| `ideaId` | `String` | `@unique`, FK → `Idea.id` | Enforces one-review-per-idea (FR-008) |
| `reviewerId` | `String` | FK → `User.id` | Must have `role = ADMIN | SUPERADMIN` (enforced app-layer) |
| `createdAt` | `DateTime` | `@default(now())` | |

### VerificationToken

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `String` | PK, `cuid()` | |
| `email` | `String` | NOT NULL, `@@index` | Lookup by email before consuming token |
| `token` | `String` | `@unique` | Cryptographically random (EPIC-02 generates) |
| `expires` | `DateTime` | NOT NULL | App layer checks expiry before accepting |

---

## State Transitions

### Idea Lifecycle (`IdeaStatus`)

```
SUBMITTED → UNDER_REVIEW → ACCEPTED
                         → REJECTED
```

Allowed transitions (enforced at app layer in Server Actions):
- `SUBMITTED → UNDER_REVIEW`: admin opens review
- `UNDER_REVIEW → ACCEPTED`: admin submits positive review
- `UNDER_REVIEW → REJECTED`: admin submits negative review
- No other transitions permitted

### Visibility (`IdeaVisibility`)

Author (or admin) can toggle between `PUBLIC` and `PRIVATE` at any status. No state machine constraints.

---

## Indexes

- `User.email` — `@unique` (auto-indexes)
- `VerificationToken.token` — `@unique` (auto-indexes)
- `VerificationToken.email` — `@@index` (explicit; lookup before token check)
- `IdeaReview.ideaId` — `@unique` (auto-indexes; also enforces one-review-per-idea)

---

## Naming Conventions

Follows project coding standards:
- Model: `PascalCase` (`User`, `Idea`, `IdeaReview`, `VerificationToken`)
- Field: `camelCase` (`passwordHash`, `displayName`, `createdAt`)
- Enum: `PascalCase` (`Role`, `IdeaStatus`, `IdeaVisibility`)
- Enum values: `UPPER_SNAKE_CASE` (`SUBMITTER`, `UNDER_REVIEW`, `SUPERADMIN`)

---

## Migration

Single initial migration created with:
```sh
npx prisma migrate dev --name init
```

Creates all four tables in one transaction. Idempotent — running migrate deploy on an already-migrated DB is safe (FR-009).
