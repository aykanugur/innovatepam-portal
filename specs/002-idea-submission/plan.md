# Implementation Plan: Idea Submission & Discovery

**Branch**: `002-idea-submission` | **Date**: 2026-02-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/002-idea-submission/spec.md` (EPIC-03, US-008/009/010/011)

## Summary

Authenticated employees can submit ideas (title, description, category, visibility, optional file), browse a paginated/filtered public idea feed, view full idea details (including review outcomes), and track their own submissions. Delete is self-service only for `status=SUBMITTED` ideas via a name-match safety modal. Admins can delete any idea. All mutations are audit-logged. File attachments are gated behind `FEATURE_FILE_ATTACHMENT_ENABLED`.

Technical approach: Next.js 16 Route Handlers for API + Server Actions for mutations + Prisma v7/Postgres for persistence + Upstash Redis for rate limiting + Vercel Blob for optional file storage + Zod for shared validation + shadcn/Radix UI for components.

## Technical Context

**Language/Version**: TypeScript 5.x — Node.js 22  
**Primary Dependencies**: Next.js 16 (App Router), React 19, Auth.js v5, Prisma v7, Zod 3, Radix UI, Tailwind v4, `@upstash/ratelimit`, `@upstash/redis`, `@vercel/blob` (new)  
**Storage**: PostgreSQL via Neon (Prisma v7 + `@prisma/adapter-pg`); Vercel Blob for file attachments  
**Testing**: Vitest (unit + integration) · Playwright (E2E)  
**Target Platform**: Vercel (server-rendered Next.js deployment)  
**Project Type**: Full-stack web application  
**Performance Goals**: Idea list < 3 s load (SC-002); idea form submission < 2 min end-to-end (SC-001)  
**Constraints**: Rate limit 1 submission / 60 s per user (FR-029); file attachment max 5 MB; no unauthenticated access (FR-027)  
**Scale/Scope**: Alpha — estimated < 500 ideas at launch; single feature adds 4 pages + 3 API routes + 1 Prisma model migration

## Constitution Check

_Constitution is a placeholder template (no project-specific rules ratified). Standard quality bars applied: TypeScript strict, Zod validation at all boundaries, Vitest unit tests required, Playwright E2E required for happy paths._

| Gate                             | Status | Notes                                                             |
| -------------------------------- | ------ | ----------------------------------------------------------------- |
| No unauthenticated access        | PASS   | Session check in every API handler                                |
| Input validation at API boundary | PASS   | Zod `CreateIdeaSchema` on POST before DB write                    |
| Rate limiting on mutation        | PASS   | `ideaSubmitRateLimiter` (Upstash Redis / in-memory fallback)      |
| Audit logging on mutations       | PASS   | `AuditLog` entry written on IDEA_CREATED + IDEA_DELETED           |
| Feature flag isolation           | PASS   | `FEATURE_FILE_ATTACHMENT_ENABLED` gates all attachment code paths |

## Project Structure

### Documentation (this feature)

```text
specs/002-idea-submission/
├── spec.md          ✅ Feature specification
├── plan.md          ✅ This file
├── research.md      ✅ Phase 0 output
├── data-model.md    ✅ Phase 1 output
├── quickstart.md    ✅ Phase 1 output
├── contracts/
│   └── ideas.md     ✅ Phase 1 output — API contract for all idea endpoints
└── tasks.md         🔲 Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
app/
├── (main)/                          # authenticated layout group
│   ├── ideas/
│   │   ├── page.tsx                 # US-009 — Idea list page
│   │   ├── new/
│   │   │   └── page.tsx             # US-008 — Submit idea form
│   │   └── [id]/
│   │       └── page.tsx             # US-010 — Idea detail page
│   └── my-ideas/
│       └── page.tsx                 # US-011 — My ideas page
└── api/
    └── ideas/
        ├── route.ts                 # GET /api/ideas + POST /api/ideas
        ├── [id]/
        │   └── route.ts             # GET /api/ideas/[id] + DELETE /api/ideas/[id]
        └── mine/
            └── route.ts             # GET /api/ideas/mine

lib/
├── actions/
│   ├── create-idea.ts               # Server action: create idea + audit log
│   └── delete-idea.ts               # Server action: delete idea + audit log
├── validations/
│   └── idea.ts                      # Zod: CreateIdeaSchema, IdeaListQuerySchema
├── rate-limit.ts                    # + ideaSubmitRateLimiter (extend existing)
└── db.ts                            # existing Prisma client (no change)

components/
└── ideas/
    ├── idea-form.tsx                # US-008 — submission form component
    ├── idea-card.tsx                # summary card used in list + my-ideas
    ├── idea-list.tsx                # paginated list + category filter
    ├── idea-detail.tsx              # full detail view + review card
    ├── delete-idea-modal.tsx        # name-match safety modal (FR-019)
    ├── admin-delete-button.tsx      # lighter alert-dialog for admin delete
    └── category-filter.tsx          # category select component

constants/
└── categories.ts                    # Category slugs ↔ display labels

prisma/
└── schema.prisma                    # + AuditLog model, AuditAction enum
```

**Structure Decision**: Stays within the existing Next.js App Router layout. No new package or project is required. API routes colocated under `app/api/ideas/`. Server Actions used for form mutations. Components isolated under `components/ideas/`. New `constants/categories.ts` and `lib/validations/idea.ts` follow existing project conventions.

## Complexity Tracking

No constitution violations. No added complexity beyond linear feature scope.

## Open Decisions (resolved in research.md)

| Item                      | Research ref | Decision                                                |
| ------------------------- | ------------ | ------------------------------------------------------- |
| "Profile name" field      | R-001        | `User.displayName`                                      |
| Blob storage provider     | R-002        | Vercel Blob (`@vercel/blob`)                            |
| Rate limit implementation | R-003        | Extend `lib/rate-limit.ts` — `slidingWindow(1, '60 s')` |
| Audit log sink            | R-004        | PostgreSQL `AuditLog` model                             |
| Admin delete confirmation | R-005        | Lightweight alert-dialog (no name-match)                |
| Pagination mechanism      | R-006        | Offset-based, `?page=N&category=slug`                   |
| Category URL format       | R-007        | Kebab-case slugs in `constants/categories.ts`           |
