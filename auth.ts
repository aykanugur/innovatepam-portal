import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { comparePassword } from '@/lib/auth-utils'
import { loginRateLimiter } from '@/lib/rate-limit'

// ─── Custom error codes ───────────────────────────────────────────────────────
// These map to the `error` URL param on /login so the form can show
// a specific message per failure type (FR-018, FR-008, FR-009).

class RateLimitedError extends CredentialsSignin {
  code = 'RateLimited' as const
}

class UnverifiedEmailError extends CredentialsSignin {
  code = 'UnverifiedEmail' as const
}

// ─── Auth.js v5 config ────────────────────────────────────────────────────────

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials) {
        const email = (credentials?.email as string | undefined)?.toLowerCase().trim()
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        // FR-018: rate-limit by email — 5 attempts / 15-min sliding window
        const rl = await loginRateLimiter.limit(email)
        if (!rl.success) {
          throw new RateLimitedError()
        }

        // Look up user
        const user = await db.user.findUnique({ where: { email } })
        if (!user) return null

        // FR-009: do not reveal which field is wrong
        const passwordMatch = await comparePassword(password, user.passwordHash)
        if (!passwordMatch) return null

        // FR-008: block unverified accounts when verification flag is on
        if (process.env.FEATURE_EMAIL_VERIFICATION_ENABLED === 'true' && !user.emailVerified) {
          throw new UnverifiedEmailError()
        }

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          role: user.role,
        }
      },
    }),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 3600, // FR-013: 1-hour session
  },

  callbacks: {
    // Embed id + role into the JWT on login; preserve on subsequent requests
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string
        token.role = (user.role ?? 'SUBMITTER') as string
      }
      return token
    },

    // Expose id + role on session.user (matches types/next-auth.d.ts augmentation)
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
})
