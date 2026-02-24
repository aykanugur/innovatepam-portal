# Architecture Overview — InnovatEPAM Portal

**Last Updated**: 2026-02-24  
**Version**: 1.0  
**Status**: Active  
**Owner**: Aykan Uğur

---

## 1. System Architecture

### Pattern: Monolithic Next.js Application (Full-Stack)

InnovatEPAM Portal is a **full-stack monolith deployed as serverless functions** on Vercel. There is no separate backend service — the Next.js App Router serves both the UI (React Server Components) and all API surfaces (Route Handlers + Server Actions).

**Why this pattern?**
- 3-day build timeline makes microservices impractical — a monolith eliminates inter-service latency, devops complexity, and deployment coordination
- Next.js App Router collocates data-fetching, business logic, and rendering; features can be added without crossing service boundaries
- Single deployment unit on Vercel means one config, one CI pipeline, one rollback

---

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel Edge Network                       │
│   (CDN, SSL termination, global routing, instant rollback)       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS (TLS 1.2+)
┌────────────────────────────▼────────────────────────────────────┐
│                 Next.js 15 App (App Router)                      │
│                                                                   │
│  ┌─────────────────────┐    ┌─────────────────────────────────┐  │
│  │  React Server       │    │  Route Handlers                  │  │
│  │  Components (RSC)   │    │  app/api/...                     │  │
│  │                     │    │                                   │  │
│  │  · /login           │    │  · POST /api/auth/register       │  │
│  │  · /register        │    │  · GET  /api/auth/verify-email   │  │
│  │  · /ideas           │    │  · POST /api/ideas               │  │
│  │  · /ideas/[id]      │    │  · PUT  /api/ideas/[id]/review   │  │
│  │  · /ideas/new       │    │  · PUT  /api/users/[id]/role     │  │
│  │  · /ideas/mine      │    │                                   │  │
│  │  · /admin           │    ┌─────────────────────────────────┐  │
│  │  · /admin/review    │    │  Server Actions                  │  │
│  │  · /admin/users     │    │  (form mutations, role changes,  │  │
│  │  · /settings        │    │   idea CRUD, review workflow)    │  │
│  │  · /admin/analytics │    └─────────────────────────────────┘  │
│  └─────────────────────┘                                          │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  NextAuth.js v5 (Auth.js)                                    │  │
│  │  · CredentialsProvider (email + bcrypt)                      │  │
│  │  · JWT sessions (HTTP-only cookie)                           │  │
│  │  · middleware.ts — route protection + RBAC enforcement       │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │  Prisma ORM (database client)                                │  │
│  │  · Type-safe queries generated from schema.prisma            │  │
│  │  · Connection pooling via PgBouncer (Neon URL suffix)        │  │
│  └─────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ TLS connection string
          ┌──────────────────┼──────────────────┐
          ▼                  ▼                  ▼
  ┌───────────────┐  ┌──────────────┐  ┌────────────────┐
  │  Neon Postgres│  │ Vercel Blob  │  │ Resend Email   │
  │  (PostgreSQL) │  │ (file attach)│  │ (verification) │
  └───────────────┘  └──────────────┘  └────────────────┘
```

---

### Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| **React Server Components** | Page rendering, data fetching (direct Prisma calls), layout, SEO |
| **Client Components** | Interactive forms, file upload UI, optimistic updates, toasts |
| **Route Handlers** (`app/api/`) | REST-style endpoints for auth flows; consumed by client components via `fetch` |
| **Server Actions** | Mutations triggered from forms or client components without a separate API call; used for idea CRUD, reviews, role management |
| **NextAuth.js middleware** | Runs on every request; validates session, enforces role-based route access, redirects unauthenticated requests to `/login` |
| **Prisma ORM** | Type-safe database access layer; migrations; connection pooling |
| **Neon PostgreSQL** | Persistent relational data store — users, ideas, reviews |
| **Vercel Blob** | Immutable object storage for idea file attachments (behind `FEATURE_FILE_ATTACHMENT_ENABLED`) |
| **Resend** | Transactional email delivery for email verification tokens (behind `FEATURE_EMAIL_VERIFICATION_ENABLED`) |

---

### Communication Patterns

- **Client → Server**: Server Actions (form submissions, mutations) and Route Handlers (REST for auth)
- **Server → Database**: Prisma ORM queries (parameterized — SQL injection safe)
- **Server → External**: Resend SDK (email), `@vercel/blob` SDK (file storage) — both network calls, handled in try/catch with graceful degradation
- **No client-to-database direct access** — all queries go through Next.js server layer
- **No message queues / event bus** — synchronous request/response only in MVP

---

### Data Flow — Key Paths

**Idea Submission:**
```
Browser form → Server Action (createIdea) → Zod validation
  → [if attachment] Vercel Blob.put() → store URL
  → prisma.idea.create() → DB
  → revalidatePath('/ideas') → redirect to /ideas/<id>
```

**Evaluation Workflow:**
```
Admin clicks Accept/Reject → Server Action (finalizeReview)
  → auth() check (is ADMIN or SUPERADMIN?)
  → guard (idea.authorId !== session.user.id)
  → prisma.$transaction([
      idea.update(status → ACCEPTED/REJECTED),
      ideaReview.create(decision, comment, reviewerId)
    ])
  → revalidatePath('/admin') + revalidatePath('/ideas/<id>')
```

**Authentication:**
```
POST /api/auth/signin (NextAuth) → CredentialsProvider.authorize()
  → prisma.user.findUnique(email)
  → bcrypt.compare(password, passwordHash)
  → [if FEATURE_EMAIL_VERIFICATION_ENABLED] check emailVerified
  → return user object → NextAuth creates signed JWT
  → Set-Cookie: next-auth.session-token (HTTP-only, Secure, SameSite=Lax)
```

---

## 2. Tech Stack

### Languages & Runtime

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript 5+ (strict mode) | Catches type errors at compile time; `"strict": true` in `tsconfig.json`; no `any` allowed |
| Runtime | Node.js 20 LTS | Vercel serverless function runtime; compatible with Next.js 15 |
| Package manager | npm | Default; pinned via `package-lock.json` |

### Frontend

| Technology | Version | Role |
|-----------|---------|------|
| Next.js | 15+ (App Router) | Full-stack framework; RSC, Server Actions, Route Handlers, Image optimization |
| React | 19+ | UI component model; `use client` for interactive islands only |
| Tailwind CSS | v4 | Utility-first styling; CSS custom properties for design tokens |
| shadcn/ui | Latest stable | Accessible, unstyled component primitives (Button, Input, Form, Dialog, Toast, Badge) |
| Zod | 3+ | Runtime schema validation — used on both client and server; single source of truth for field rules |

### Backend

| Technology | Version | Role |
|-----------|---------|------|
| Next.js Route Handlers | (App Router) | REST-like HTTP endpoints (`app/api/`) for auth flows |
| Next.js Server Actions | (App Router) | Typed server mutations called directly from React; used for CRUD + workflows |
| NextAuth.js (Auth.js) | v5 | Authentication — credentials provider, JWT strategy, session middleware |
| bcrypt | 5+ | Password hashing (cost factor: 12) |
| Prisma ORM | 5+ | Type-safe database client; handles migrations, schema evolution |

### Database

| Technology | Purpose |
|-----------|---------|
| PostgreSQL (Neon) | Primary relational database; hosted managed instance |
| Prisma Migrate | Schema migrations — `prisma migrate dev` (local), `prisma migrate deploy` (CI/CD) |
| PgBouncer | Connection pooler built into Neon; configured via `?pgbouncer=true&connection_limit=1` in `DATABASE_URL` |

**Data Models:**

```
User          — id, email (unique), passwordHash, displayName, role (SUBMITTER|ADMIN|SUPERADMIN),
                emailVerified, verificationToken?, verificationTokenExpiry?, createdAt

Idea          — id, title, description, category, status (SUBMITTED|UNDER_REVIEW|ACCEPTED|REJECTED),
                visibility (PUBLIC|PRIVATE), attachmentPath?, authorId → User, createdAt, updatedAt

IdeaReview    — id, ideaId (unique) → Idea, reviewerId → User,
                decision (ACCEPTED|REJECTED), comment, createdAt
```

**State Machine (IdeaStatus):**
```
SUBMITTED → UNDER_REVIEW → ACCEPTED
                         → REJECTED
(all other transitions rejected server-side)
```

### Infrastructure & External Services

| Service | Purpose | Configuration |
|---------|---------|---------------|
| Vercel | Hosting, serverless functions, CDN, preview deployments | Connected to GitHub `main` branch; auto-deploys on push |
| Neon (PostgreSQL) | Managed database | `DATABASE_URL` env var; serverless driver with PgBouncer |
| Vercel Blob | File attachment storage | `BLOB_READ_WRITE_TOKEN` env var; `FEATURE_FILE_ATTACHMENT_ENABLED` flag |
| Resend | Transactional email (verification) | `RESEND_API_KEY` env var; `FEATURE_EMAIL_VERIFICATION_ENABLED` flag; free tier: 100 emails/day |

---

## 3. Deployment

### Environments

| Environment | URL | Branch | Purpose |
|-------------|-----|--------|---------|
| Local dev | `http://localhost:3000` | any | Feature development; `.env.local` |
| Preview | `https://<hash>-innovatepam.vercel.app` | any PR branch | Per-PR previews; auto-created by Vercel |
| Production | `https://innovatepam.vercel.app` | `main` | Live portal; GA release |

### CI/CD Pipeline

```
git push → GitHub
  ↓
GitHub Actions (.github/workflows/ci.yml)
  ├── npm run lint      (ESLint — must pass)
  ├── npm run test:unit (Vitest + coverage — must be ≥80%)
  └── npm run build     (Next.js build — must pass)
  ↓ (all green)
Vercel deployment triggered (automatic via GitHub integration)
  ├── Preview deployment (PRs)
  └── Production deployment (push to main)
```

### Database Migration Strategy

- **Development**: `npx prisma migrate dev` — creates migration files, applies to local DB
- **Production**: `npx prisma migrate deploy` — runs pending migrations in CI/CD before app deploys
- **No destructive migrations in MVP** — schema grows additive only; ensures clean Vercel rollbacks
- Migrations committed to git under `prisma/migrations/`

### Rollback Strategy

| Method | Speed | When to Use |
|--------|-------|-------------|
| Vercel instant rollback (dashboard) | < 30 sec | Any production issue — reverts to last known good deployment |
| Feature flag disable (`FEATURE_X=false`) | Instant | Isolate a broken feature without full rollback |
| Database rollback | Manual (risky) | Last resort; MVP schema is additive so rarely needed |

### Feature Flag Strategy

All flags are environment variables read at runtime:

| Flag | Default | Controls |
|------|---------|---------|
| `PORTAL_ENABLED` | `true` | Global kill switch → shows maintenance page |
| `FEATURE_EMAIL_VERIFICATION_ENABLED` | `true` | If `false`, auto-verifies on register (for alpha/dev) |
| `FEATURE_FILE_ATTACHMENT_ENABLED` | `true` | If `false`, hides attachment UI entirely |
| `FEATURE_ANALYTICS_ENABLED` | `false` | Analytics page (P3 cut-first candidate) |
| `FEATURE_USER_MANAGEMENT_ENABLED` | `true` | `/admin/users` role management page |
| `SUPERADMIN_EMAIL` | _(required)_ | Email to bootstrap with SUPERADMIN role via `prisma db seed` |

**Flags are checked at the route level** (Server Component or middleware) — not deep inside business logic. If a flag is off, the page returns `notFound()` or redirects. This makes the flag easy to reason about and easy to audit.

---

## 4. Security Architecture

| Concern | Mitigation |
|---------|------------|
| Password storage | bcrypt with cost factor 12; plaintext never stored or logged |
| Session security | HTTP-only, Secure, SameSite=Lax JWT cookie via NextAuth; 24h expiry |
| Transport | HTTPS enforced by Vercel; no HTTP fallback |
| Input validation | Zod schemas on every Route Handler and Server Action input; Prisma parameterized queries prevent SQL injection |
| RBAC enforcement | Next.js `middleware.ts` checks session role on every request to protected paths; Server Actions re-check role (defence-in-depth) |
| Self-review prevention | `finalizeReview` guards `idea.authorId !== session.user.id` |
| File upload safety | Server-side MIME type + size validation before Vercel Blob upload; allowed list: PDF, PNG, JPG, DOCX, MD; max 5 MB |
| XSS | React escapes output by default; shadcn/ui components do not use `dangerouslySetInnerHTML` |

---

## 5. Performance Targets

| Metric | Target |
|--------|--------|
| Page load (P95) | < 2 seconds |
| API response (P95) | < 500 ms |
| File upload (5 MB) | < 5 seconds |
| Concurrent users | 500 |
| Total users | 10,000 |
| Total ideas | 50,000 without degradation |

**Performance approach**: React Server Components reduce client bundle size; Prisma query optimizations (select only needed fields); Vercel CDN for static assets; `cache: 'no-store'` only on pages that must show live data (admin dashboard, idea list).

---

## 6. Key Architectural Decisions (ADRs)

| Decision | Choice | Rejected Alternatives | Rationale |
|----------|--------|-----------------------|-----------|
| Monolith vs microservices | Monolith | Separate Express API + Next.js frontend | 3-day timeline; no team coordination overhead; single deployment |
| App Router vs Pages Router | App Router | Pages Router | RSC reduces bundle; Server Actions eliminate extra API routes; future-proof |
| Session strategy | JWT (stateless) | Database sessions | No extra DB table; Vercel serverless friendly; 24h expiry limits exposure |
| ORM | Prisma | Drizzle, raw SQL, Knex | Best-in-class TypeScript types; migration tooling; team familiarity |
| File storage | Vercel Blob | Local filesystem, S3, Cloudinary | Local filesystem not persistent on Vercel serverless; Blob is native, zero-config |
| Email | Resend | SendGrid, Nodemailer, EPAM SMTP | Free tier sufficient for alpha (100/day); SDK integrates in minutes; no SMTP to configure |
| Component library | shadcn/ui + Tailwind v4 | MUI, Chakra, custom | Copy-to-project model (no dependency lock-in); Tailwind-native; WCAG-compliant primitives |
| Validation | Zod | Yup, Joi, manual | TypeScript-first; same schema used on client and server; integrates with `react-hook-form` |
