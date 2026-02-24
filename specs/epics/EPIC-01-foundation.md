# Epic: Foundation & Infrastructure

**Epic ID**: EPIC-01  
**Owner**: Aykan Uğur — Admin  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Target Release**: Day 1 — Morning (Alpha)  
**PRD Reference**: [specs/prd-innovatepam.md](../prd-innovatepam.md)

---

## 1. Summary

Set up the Next.js 15 project, configure the PostgreSQL database, establish the Prisma schema, wire up environment configuration, and deploy a boilerplate shell to Vercel. Everything built in subsequent epics depends on this foundation being correct and stable.

---

## 2. Business Context

### 2.1 Strategic Alignment
- **Company Goal**: Deliver the InnovatEPAM Portal in 3 days.
- **Product Vision Fit**: No feature can be built safely without a correctly configured foundation. This epic is the prerequisite for all others.

### 2.2 Business Value
| Value Driver | Description | Estimated Impact |
|-------------|-------------|-----------------|
| Speed | Correct scaffold prevents rework in subsequent epics | Saves ~4h of debugging across 3 days |
| Reliability | Verified DB connection & deployment pipeline catches infra issues on Day 1, not Day 3 | Reduces GA rollback risk |

### 2.3 Cost of Delay
If this epic is incomplete or misconfigured, every subsequent epic is blocked. A broken schema migration or missing env variable on Day 1 can cascade into lost hours on Day 2.

---

## 3. Scope

### 3.1 In Scope
- Initialize Next.js 15 (App Router) project with TypeScript strict mode
- Configure Tailwind CSS v4 + shadcn/ui component library
- Set up PostgreSQL database (Neon or Vercel Postgres)
- Define initial Prisma schema: `User`, `Idea`, `IdeaStatus`, `Role` models
- Configure environment variables (`.env.local`, `.env.example`)
- Deploy blank shell to Vercel (verify build succeeds)
- Configure ESLint + Prettier
- Initialize git with Conventional Commits convention

### 3.2 Out of Scope
- Authentication logic (EPIC-02)
- Any page UI beyond a placeholder home route
- Feature flags (configured during relevant epics)

### 3.3 Assumptions
- Neon or Vercel Postgres free tier is accessible
- Vercel account and GitHub repo are ready before Day 1 starts
- Node.js 20+ is installed locally

---

## 4. User Personas

| Persona | Role / Description | Primary Need |
|---------|-------------------|-------------|
| Developer (Aykan) | Solo developer setting up the project | A working, deployable scaffold with verified DB connectivity before writing any feature code |

---

## 5. Feature Breakdown

### Feature 1: Next.js Project Scaffold — Must Have
**Description**: Initialize a production-ready Next.js 15 App Router project with TypeScript, Tailwind v4, shadcn/ui, ESLint, and Prettier.

**User Stories**:
- [ ] `npx create-next-app@latest` with TypeScript + App Router + Tailwind
- [ ] Install and configure shadcn/ui
- [ ] Configure ESLint (Next.js preset) + Prettier

**Acceptance Criteria**:
1. `npm run build` succeeds with zero errors or TypeScript complaints
2. `npm run lint` passes with zero warnings

**Estimated Effort**: XS (< 30 min)

---

### Feature 2: Database & Prisma Setup — Must Have
**Description**: Connect to a managed PostgreSQL instance, define the Prisma schema, and run the initial migration.

**User Stories**:
- [ ] Install `prisma` and `@prisma/client`
- [ ] Define schema: `User` (id, email, passwordHash, displayName, role, emailVerified, createdAt), `Idea` (id, title, description, category, status, visibility, attachmentPath, authorId, createdAt, updatedAt), `IdeaReview` (id, ideaId, reviewerId, decision, comment, createdAt)
- [ ] Run `prisma migrate dev --name init`
- [ ] Verify connection with `prisma studio`

**Acceptance Criteria**:
1. `prisma migrate dev` runs without errors
2. All three tables visible in Prisma Studio

**Estimated Effort**: S (45 min)

---

### Feature 3: Environment Configuration — Must Have
**Description**: Configure all required environment variables with a documented `.env.example`.

**User Stories**:
- [ ] Add `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`, `PORTAL_ENABLED` to `.env.local`
- [ ] Create `.env.example` with all keys (no values) and add `.env.local` to `.gitignore`

**Acceptance Criteria**:
1. `.env.example` lists all required variables with descriptions
2. `.env.local` is absent from git history

**Estimated Effort**: XS (15 min)

---

### Feature 4: Vercel Deployment — Must Have
**Description**: Deploy the scaffold to Vercel and verify the build pipeline works end-to-end.

**User Stories**:
- [ ] Connect GitHub repo to Vercel project
- [ ] Set environment variables in Vercel dashboard
- [ ] Trigger first deployment; verify it passes

**Acceptance Criteria**:
1. Vercel deployment URL is live and returns HTTP 200 on `/`
2. Build logs show zero errors

**Estimated Effort**: XS (20 min)

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)
| Dependency | Type | Status | Risk |
|-----------|------|--------|------|
| GitHub repository created | Internal | Must be done before Day 1 | Low |
| Vercel account + linked GitHub | External | Must be done before Day 1 | Low |
| Neon / Vercel Postgres instance | External | Must be provisioned | Low |

### 6.2 Blocking (Downstream)
| Dependent | Impact if Delayed |
|----------|------------------|
| EPIC-02 (Auth) | Cannot implement NextAuth without `DATABASE_URL` and `User` model |
| EPIC-03 (Ideas) | Cannot implement idea submission without `Idea` model |
| EPIC-04 (Evaluation) | Cannot implement workflow without `IdeaReview` model |

---

## 7. UX / Design
- N/A — no user-facing UI in this epic beyond a placeholder `/` route returning HTTP 200.

---

## 8. Technical Notes
- Prisma schema should use `enum Role { SUBMITTER ADMIN SUPERADMIN }` and `enum IdeaStatus { SUBMITTED UNDER_REVIEW ACCEPTED REJECTED }`
- `attachmentPath` is nullable (attachment is optional)
- Use `cuid()` for all primary keys for URL-safe IDs

---

## 9. Milestones & Timeline

| Milestone | Features Included | Target | Exit Criteria |
|-----------|------------------|--------|---------------|
| M1 — Scaffold | Features 1-4 | Day 1, 10:00 | `npm run build` passes locally + Vercel deployment live |

---

## 10. Success Metrics

| Metric | Target |
|--------|--------|
| Build passes locally | Zero TS/lint errors |
| Vercel deployment live | HTTP 200 on production URL |
| DB migration applied | 3 tables present in Prisma Studio |
| Time spent | ≤ 2 hours |

---

## 11. Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|------------|
| 1 | Neon free tier connection limits | Low | Med | Use `?pgbouncer=true&connection_limit=1` in `DATABASE_URL` for Vercel serverless |
| 2 | shadcn/ui incompatibility with Tailwind v4 | Low | Med | Pin shadcn/ui to latest stable; check release notes before install |

---

## 12. Open Questions

| # | Question | Owner | Status |
|---|---------|-------|--------|
| 1 | Neon or Vercel Postgres for managed DB? | Aykan Uğur | Open |

---

## Appendix: Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-02-24 | Aykan Uğur | Initial draft |
