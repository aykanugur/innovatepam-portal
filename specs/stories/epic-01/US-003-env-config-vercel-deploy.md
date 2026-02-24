# User Story: Environment Configuration & Vercel Deployment

**Story ID**: US-003  
**Epic**: EPIC-01 — Foundation & Infrastructure  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: XS  
**Sprint**: Day 1 — AM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As a** developer,  
**I want to** configure all environment variables with a documented `.env.example` and deploy the scaffold to Vercel,  
**so that** the CI/CD pipeline is verified on Day 1 and every subsequent deployment is a one-click action.

---

## Context & Motivation

Discovering a broken deployment pipeline on Day 3 is a project killer. Verifying Vercel works with the scaffold on Day 1 morning eliminates this risk entirely. It also ensures environment variables are documented so no key is forgotten.

---

## Acceptance Criteria

1. **Given** `.env.local` is populated with all required variables,  
   **When** `npm run dev` is executed locally,  
   **Then** the app starts without errors and `/` returns HTTP 200.

2. **Given** environment variables are set in the Vercel dashboard,  
   **When** a push to `main` triggers a Vercel deployment,  
   **Then** the deployment completes without errors and the production URL returns HTTP 200.

3. **Given** `.env.example` exists in the repository root,  
   **When** it is opened,  
   **Then** it lists all required variable names (with no values) and a comment describing each.

4. **Given** `.env.local` exists locally,  
   **When** `git status` is checked,  
   **Then** `.env.local` is NOT tracked by git (present in `.gitignore`).

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | Missing `NEXTAUTH_SECRET` in Vercel | Build succeeds but runtime auth throws; document as required in `.env.example` |
| 2 | `DATABASE_URL` points to wrong DB | `prisma migrate` fails; clear error message guides fix |

---

## Technical Notes

Required environment variables:

```bash
# .env.example

# Database
DATABASE_URL=                  # PostgreSQL connection string (Neon or Vercel Postgres)

# NextAuth
NEXTAUTH_SECRET=               # 32+ char random string: `openssl rand -base64 32`
NEXTAUTH_URL=                  # e.g., http://localhost:3000 (dev) or https://your-app.vercel.app (prod)

# Email (Resend)
RESEND_API_KEY=                # From https://resend.com/api-keys

# Feature Flags
PORTAL_ENABLED=true
FEATURE_FILE_ATTACHMENT_ENABLED=true
FEATURE_EMAIL_VERIFICATION_ENABLED=true
FEATURE_ANALYTICS_ENABLED=false
FEATURE_USER_MANAGEMENT_ENABLED=true

# Superadmin bootstrap
SUPERADMIN_EMAIL=              # Email of the account to promote to SUPERADMIN on first seed
```

- **Feature Flag**: `PORTAL_ENABLED` — global kill switch configured here

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-001 — Project scaffold | Story | Must be done first | Yes |
| US-002 — Prisma schema | Story | Must be done first | Yes |
| Vercel account + GitHub repo connected | External | Required | Yes |

---

## Test Plan

### Manual Testing
- [ ] `npm run dev` starts without errors
- [ ] Production Vercel URL returns HTTP 200
- [ ] `.env.local` absent from `git status`
- [ ] `.env.example` present and lists all 10 variables

### Automated Testing
- [ ] None — verified by CI deployment passing

---

## Definition of Done

- [ ] `.env.example` committed with all variables documented
- [ ] `.env.local` in `.gitignore`
- [ ] Vercel production deployment live (HTTP 200)
- [ ] All env vars set in Vercel dashboard
- [ ] `git commit: chore: add env config and vercel deployment`
