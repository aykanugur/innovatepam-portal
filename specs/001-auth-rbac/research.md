# Research: Authentication & Role Management

**Phase**: 0 | **Feature**: 001-auth-rbac | **Date**: 2026-02-24

---

## R-001 — Auth.js v5 CredentialsProvider with Next.js 16

**Decision**: Use `next-auth@beta` (Auth.js v5) with a CredentialsProvider, JWT session strategy, and `auth.ts` at the repo root.

**Implementation pattern**:

```typescript
// auth.ts
import NextAuth, { type NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/auth-utils'

export const config: NextAuthConfig = {
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null
        if (!user.emailVerified) return null
        const ok = await comparePassword(credentials.password as string, user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, displayName: user.displayName, role: user.role }
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 3600 }, // 1 hour, non-persistent
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(config)
```

**Rationale**: CredentialsProvider is the correct choice for email+password auth where users are pre-onboarded via corporate email. JWT strategy avoids a DB round-trip on every request (session cookie, not HTTP-only DB session). `maxAge: 3600` implements FR-013 (1-hour expiry). Non-persistent session is the JWT `strategy` default (cookie without `maxAge` on the cookie — set in `cookies` option or rely on default session cookie behaviour).

**Alternatives considered**:

- PrismaAdapter + database sessions: rejected — adds a `Session` table and DB round-trip per request. Not needed at this scale, and auth reads should be fast (SC-003).
- Clerk: rejected per user's explicit preference for Auth.js v5.
- Passport.js: rejected — incompatible with Next.js 16 App Router server components.

---

## R-002 — Auth Middleware in Next.js 16 (`proxy.ts`)

**Decision**: Extend the existing `proxy.ts` (the middleware file in Next.js 16) to compose portal-enabled check with Auth.js session guard. Auth.js `auth()` is called as a middleware wrapper inside `proxy.ts`.

**Implementation pattern**:

```typescript
// proxy.ts (extended)
import { auth } from '@/auth'
import { NextResponse, type NextRequest } from 'next/server'

const PROTECTED_PREFIXES = ['/dashboard', '/admin', '/api/admin']
const AUTH_PATHS = ['/login', '/register', '/verify-email']

async function handleRequest(req: NextRequest) {
  // Portal gate (existing behaviour)
  if (process.env.PORTAL_ENABLED === 'false') {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
  }

  const { pathname } = req.nextUrl
  const session = await auth() // Auth.js v5: session from JWT cookie

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  if (isProtected && !session) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export default handleRequest

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

**Rationale**: Next.js 16 uses a single middleware file named `proxy.ts`. The `auth()` helper from Auth.js v5 can be invoked in Edge runtime for session reads (JWT decode only — no DB). `bcryptjs` is NOT called in middleware; it runs only in the `authorize` callback inside `auth.ts` which executes in the Node.js runtime (Route Handler / API route).

**Alternatives considered**:

- `auth` as middleware export: `export { auth as default } from '@/auth'` — simpler but loses portal-enabled check composability.
- Separate edge-compatible DB calls in proxy.ts: rejected — Prisma + Neon adapter not guaranteed Edge-compatible; session role from JWT sufficient for routing decisions.

---

## R-003 — Verification Token Strategy

**Decision**: Use a 32-byte cryptographically random hex string stored as `verificationToken` on the `User` row. Expiry stored as `verificationTokenExpiry DateTime?`. Token cleared on successful verification.

**Implementation pattern**:

```typescript
// lib/auth-utils.ts
import { randomBytes } from 'node:crypto'

export function generateToken(): string {
  return randomBytes(32).toString('hex') // 64-char hex string
}
```

**Verification flow**:

1. `POST /api/auth/register` → hash password, derive displayName, generate token, set `verificationTokenExpiry = now + 24h`, save user.
2. Send email via Resend: `https://…/api/auth/verify-email?token=<hex>`
3. `GET /api/auth/verify-email?token=<hex>`:
   - Find user by `verificationToken`
   - Check `verificationTokenExpiry > now`
   - If valid: set `emailVerified = true`, clear token+expiry, redirect to `/login?verified=1`
   - If expired: return 400 with "Token expired. Please re-register."

**Rationale**: Storing token directly on User avoids a separate `VerificationToken` table. `@unique` index enables fast lookup. 24-hour window is industry standard for email verification. Token cleared post-use prevents replay.

**Alternatives considered**:

- Separate `VerificationToken` table: rejected — adds schema complexity; not needed at this scale.
- JWT as verification token: rejected — requires `AUTH_SECRET` rotation to invalidate, harder to revoke.
- UUID v4: rejected — `crypto.randomBytes` preferred for security-sensitive tokens.

---

## R-004 — Rate Limiting with Upstash + In-Memory Fallback

**Decision**: Use `@upstash/ratelimit` with `Ratelimit.slidingWindow(5, '15 m')`. When `UPSTASH_REDIS_REST_URL` is not set, fall back to in-memory store (Map-based, process-scoped).

**Implementation pattern**:

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function createRateLimiter() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'innovatepam:login',
    })
  }
  // In-memory fallback for local dev / alpha without Redis
  const store = new Map<string, { count: number; reset: number }>()
  return {
    async limit(identifier: string) {
      const now = Date.now()
      const record = store.get(identifier)
      if (!record || record.reset < now) {
        store.set(identifier, { count: 1, reset: now + 15 * 60 * 1000 })
        return { success: true, remaining: 4, reset: now + 15 * 60 * 1000 }
      }
      record.count++
      if (record.count > 5) {
        return { success: false, remaining: 0, reset: record.reset }
      }
      return { success: true, remaining: 5 - record.count, reset: record.reset }
    },
  }
}

export const loginRateLimiter = createRateLimiter()
```

**Rationale**: Upstash is Edge-compatible and already in the tech stack. Sliding window provides exact 15-minute lockout per FR-018. In-memory fallback prevents CI/local dev from needing a Redis instance. Rate limit key = normalized email (lowercased) to prevent bypass via case variations.

**Alternatives considered**:

- `rate-limiter-flexible` (Redis or memory): rejected — larger bundle, not Edge-native.
- IP-based rate limiting only: rejected — spec FR-018 specifies per-email lockout.
- Fixed window algorithm: rejected — sliding window prevents burst attacks at window boundaries.

---

## R-005 — Superadmin Seed (Idempotent)

**Decision**: `prisma/seed.ts` reads `SUPERADMIN_EMAIL` from env, uses `upsert` to create-or-update the user with `role: SUPERADMIN`. Password is auto-generated and printed once to stdout; user should change it on first login (future feature).

**Implementation pattern**:

```typescript
// prisma/seed.ts
import { PrismaClient, Role } from '@/lib/generated/prisma'
import { hashPassword, generateToken } from '@/lib/auth-utils'

const prisma = new PrismaClient()

async function main() {
  const email = process.env.SUPERADMIN_EMAIL
  if (!email) throw new Error('SUPERADMIN_EMAIL env var required for seed')

  const tempPassword = generateToken().slice(0, 20) // 20-char temp password
  const hash = await hashPassword(tempPassword)

  await prisma.user.upsert({
    where: { email },
    update: { role: Role.SUPERADMIN },
    create: {
      email,
      passwordHash: hash,
      displayName: email.split('@')[0],
      role: Role.SUPERADMIN,
      emailVerified: true,
    },
  })

  console.log(`Superadmin seeded: ${email}`)
  console.log(`Temporary password: ${tempPassword}  (change immediately)`)
}

main().finally(() => prisma.$disconnect())
```

**Rationale**: `upsert` is idempotent — safe to run in CI/CD pipelines or repeat deployments. `emailVerified: true` bypasses verification flow for the seeded account. Password printed to stdout satisfies FR-016 without storing it in version control.

**Alternatives considered**:

- Separate migration with hardcoded superadmin: rejected — leaks credentials in Git history.
- Manual first-run script: rejected — not idempotent, prone to drift.

---

## R-006 — Email Sending with Resend + Feature Flag

**Decision**: Email verification is controlled by `FEATURE_EMAIL_VERIFICATION_ENABLED` env var (default `true`). When disabled (alpha/local), registration completes with `emailVerified = true` immediately — no token generated, no email sent.

**Implementation pattern**:

```typescript
// lib/email.ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  const url = `${process.env.NEXTAUTH_URL}/api/auth/verify-email?token=${token}`
  await resend.emails.send({
    from: 'InnovatEPAM <noreply@innovatepam.epam.com>',
    to,
    subject: 'Verify your InnovatEPAM account',
    html: `<p>Click the link below to verify your email address:</p>
              <p><a href="${url}">${url}</a></p>
              <p>This link expires in 24 hours.</p>`,
  })
}
```

**Rationale**: Resend is already in the tech stack, simple API, React-Email compatible for future templating. Feature flag allows local development and alpha testing without requiring a live email provider.

**Alternatives considered**:

- Nodemailer + SMTP: rejected — more complex config, not in existing stack.
- Always-on email: rejected — spec clarification: feature-flagged for alpha.
- SendGrid: rejected — Resend preferred (already used in 001-foundation stack).

---

## R-007 — Session Role Staleness

**Decision**: JWT embeds `role` at login. For admin actions (Server Actions, admin API routes), re-read role from DB to prevent stale JWT privilege escalation.

**Implementation pattern**:

```typescript
// In admin Server Action / Route Handler:
const session = await auth()
if (!session?.user?.id) return { error: 'Unauthorized' }

// Re-read role from DB to prevent JWT staleness
const user = await prisma.user.findUnique({
  where: { id: session.user.id },
  select: { role: true },
})
if (user?.role !== 'SUPERADMIN') return { error: 'Forbidden' }
```

**Rationale**: JWT role is valid for 1 hour. If a user's role is downgraded mid-session, their JWT still claims the old role. For destructive operations (role changes), DB verification is required. For read operations (dashboard access), JWT role is sufficient.

**Alternatives considered**:

- Force session refresh on role change: rejected — complex, requires custom token rotation.
- Database sessions: rejected — already decided against in R-001.
- Always DB-verify role: rejected — overkill for non-admin routes; adds latency.
