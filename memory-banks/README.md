# Memory Banks — InnovatEPAM Portal

## Purpose

This memory bank provides persistent context for AI assistants working on the
**InnovatEPAM Portal** — an internal EPAM employee innovation management platform
built with Next.js 15 App Router, TypeScript, Prisma, PostgreSQL, and Vercel.

Load the relevant files below before generating code, writing tests, or making
architectural decisions. Treat the contents as ground truth for this project.

---

## Structure

### `architecture/`
System architecture, technology stack, data model, deployment topology, and
key architectural decisions (e.g. App Router vs Pages Router, JWT sessions,
Vercel Blob for file storage, feature flag strategy).

→ Read this before: creating new routes, adding packages, modifying the Prisma
schema, or planning infrastructure changes.

### `conventions/`
Coding standards, naming conventions, TypeScript strict-mode rules, testing
patterns (Vitest + Playwright), error handling approach, Server Action patterns,
and code review quality criteria.

→ Read this before: writing any new component, Server Action, Route Handler,
or test file.

### `domain/`
Domain-specific terminology, business rules, user personas (SUBMITTER, ADMIN,
SUPERADMIN), idea lifecycle state machine, category taxonomy, and key concepts
unique to the InnovatEPAM Portal.

→ Read this before: writing user-facing copy, designing data models, implementing
role checks, or building evaluation workflows.

### `workflows/`
Development processes, feature branch strategy, code review procedures,
Vercel deployment workflows (preview → production), database migration
checklist, and feature flag rollout patterns.

→ Read this before: starting a new feature, opening a PR, running migrations,
or deploying to production.

### `roles/`
Role-specific context bundles for different team members:
- **developer.md** — full-stack implementation context
- **qa.md** — test coverage targets, E2E path definitions, smoke test checklist
- **pm.md** — PRD link, epic/story index, priority rules, timeline

→ Load the file matching your current role when asking AI for targeted help.

---

## Quick Navigation

| File | When to use |
|------|-------------|
| [Architecture Overview](architecture/overview.md) | Before adding any new technical layer |
| [Coding Standards](conventions/coding-standards.md) | Before writing any code |
| [Domain Glossary](domain/glossary.md) | When dealing with business logic or user roles |
| [Development Workflow](workflows/development-process.md) | Before branching, committing, or deploying |

---

## How to Use

1. **Starting a new task** — load `architecture/overview.md` + `conventions/coding-standards.md`
2. **Building a feature** — also load the relevant epic file from `specs/epics/` and the story from `specs/stories/`
3. **Writing tests** — load `conventions/coding-standards.md` and reference the DoD checklist in the story file
4. **Deploying** — follow `workflows/development-process.md` deployment section step-by-step

Most AI assistants (GitHub Copilot, Claude, Cursor) can load these files
automatically when they are open in the editor or referenced in a prompt.
Prefix any AI prompt with: _"Using the context in memory-banks/, ..."_

---

## Project Quick Reference

| Property | Value |
|----------|-------|
| Project | InnovatEPAM Portal |
| Framework | Next.js 15 App Router + TypeScript strict |
| Database | PostgreSQL via Neon · Prisma ORM |
| Auth | NextAuth.js v5 · credentials provider |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Deployment | Vercel (preview + production) |
| File Storage | Vercel Blob (`FEATURE_FILE_ATTACHMENT_ENABLED`) |
| Testing | Vitest (≥80% line coverage) + Playwright (4 E2E paths) |
| Roles | `SUBMITTER` · `ADMIN` · `SUPERADMIN` |
| PRD | [specs/prd-innovatepam.md](../specs/prd-innovatepam.md) |
| Epics | [specs/epics/](../specs/epics/) |
| Stories | [specs/stories/](../specs/stories/) |

---

## Maintenance

- Review and update when major architectural or process changes occur
- Version-control these files alongside project code — they are first-class
  project artifacts, not throwaway docs
- After any ADR (Architecture Decision Record), update `architecture/overview.md`
- After any new coding pattern is established, update `conventions/coding-standards.md`

**Last Updated:** 2026-02-24
**Version:** 1.0
