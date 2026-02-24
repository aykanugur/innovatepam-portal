import Link from 'next/link'
import { db } from '@/lib/db'

interface VerifyEmailPageProps {
  searchParams: Promise<{ token?: string }>
}

/**
 * US-005: Email verification landing page.
 * Token lookup + account activation happens server-side in this RSC.
 * Renders one of four states: verified, already-verified, expired, or invalid.
 */
export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { token } = await searchParams

  if (!token) {
    return <VerifyResult status="invalid" />
  }

  const record = await db.verificationToken.findUnique({ where: { token } })

  // Token not found — already used or tampered
  if (!record) {
    // Check if a user with this email is already verified (consumed token)
    return <VerifyResult status="invalid" />
  }

  // Token expired
  if (record.expires < new Date()) {
    // Clean up expired token
    await db.verificationToken.delete({ where: { token } }).catch(() => null)
    return <VerifyResult status="expired" />
  }

  // Valid token — activate the account
  const user = await db.user.findUnique({ where: { email: record.email } })

  if (!user) {
    return <VerifyResult status="invalid" />
  }

  // Already verified (token still exists — rare edge case)
  if (user.emailVerified) {
    await db.verificationToken.delete({ where: { token } }).catch(() => null)
    return <VerifyResult status="already-verified" />
  }

  // Activate + clean up (FR-005)
  await Promise.all([
    db.user.update({
      where: { email: record.email },
      data: { emailVerified: true },
    }),
    db.verificationToken.delete({ where: { token } }),
  ])

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify({ event: 'verify.success', email: record.email, ts: new Date().toISOString() })
  )

  return <VerifyResult status="success" />
}

// ─── Result state components ──────────────────────────────────────────────────

type VerifyStatus = 'success' | 'already-verified' | 'expired' | 'invalid'

function VerifyResult({ status }: { status: VerifyStatus }) {
  const configs: Record<
    VerifyStatus,
    { title: string; body: string; cta?: string; ctaHref?: string }
  > = {
    success: {
      title: 'Email verified!',
      body: 'Email verified! You can now sign in.',
      cta: 'Sign in',
      ctaHref: '/login',
    },
    'already-verified': {
      title: 'Already verified',
      body: 'Already verified',
      cta: 'Sign in',
      ctaHref: '/login',
    },
    expired: {
      title: 'Link expired',
      body: 'This verification link is invalid or has expired.',
    },
    invalid: {
      title: 'Invalid link',
      body: 'This verification link is invalid or has expired.',
    },
  }

  const { title, body, cta, ctaHref } = configs[status]
  const isSuccess = status === 'success' || status === 'already-verified'

  return (
    <div
      className="rounded-xl p-8 text-center"
      style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <div className="mb-4 flex justify-center" aria-hidden="true">
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
          style={
            isSuccess
              ? { background: 'rgba(0,200,255,0.1)', color: '#00c8ff' }
              : { background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }
          }
        >
          {isSuccess ? '✓' : '✕'}
        </span>
      </div>

      <h2 className="mb-2 text-xl font-semibold" style={{ color: '#F0F0FA' }}>
        {title}
      </h2>
      <p className="mb-6 text-sm" style={{ color: '#8888A8' }}>
        {body}
      </p>

      {cta && ctaHref ? (
        <Link
          href={ctaHref}
          className="inline-block rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
        >
          {cta}
        </Link>
      ) : (
        <p className="text-sm" style={{ color: '#8888A8' }}>
          <Link
            href="/register"
            className="font-medium hover:underline"
            style={{ color: '#00c8ff' }}
          >
            Register again
          </Link>
        </p>
      )}
    </div>
  )
}
