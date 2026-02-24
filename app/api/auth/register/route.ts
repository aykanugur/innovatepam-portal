import { NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, generateToken } from '@/lib/auth-utils'
import { sendVerificationEmail } from '@/lib/email'

// ─── Server-side validation schema ───────────────────────────────────────────

const bodySchema = z.object({
  email: z
    .string()
    .min(1)
    .max(255)
    .email()
    .refine((v) => v.toLowerCase().endsWith('@epam.com')),
  password: z
    .string()
    .min(8)
    .max(72)
    .refine((v) => /[A-Z]/.test(v))
    .refine((v) => /[a-z]/.test(v))
    .refine((v) => /[0-9]/.test(v)),
  displayName: z.string().max(100).optional(),
})

// ─── Structured logging helper (FR-019) ──────────────────────────────────────

function logEvent(event: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...event }))
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    // Return the first validation error with a readable message
    const issue = parsed.error.issues[0]
    const field = String(issue?.path[0] ?? 'input')

    let message = 'Invalid input'
    if (field === 'email') message = 'Email must be an @epam.com address'
    if (field === 'password') message = 'Password must be at least 8 characters'

    logEvent({ event: 'register.fail', reason: 'validation', field, message })
    return NextResponse.json({ error: message }, { status: 400 })
  }

  const { email: rawEmail, password, displayName: rawDisplayName } = parsed.data
  const email = rawEmail.toLowerCase().trim()

  // FR-001: domain check (belt-and-suspenders after Zod)
  if (!email.endsWith('@epam.com')) {
    logEvent({ event: 'register.fail', email, reason: 'invalid_domain' })
    return NextResponse.json({ error: 'Only @epam.com addresses are permitted.' }, { status: 400 })
  }

  // FR-002: duplicate email
  const existing = await db.user.findUnique({ where: { email } })
  if (existing) {
    logEvent({ event: 'register.fail', email, reason: 'duplicate_email' })
    return NextResponse.json(
      { error: 'An account with this email already exists' },
      { status: 409 }
    )
  }

  // Derive displayName from email local-part if not provided (FR-001 clarification)
  const displayName = rawDisplayName?.trim() || email.split('@')[0]

  const passwordHash = await hashPassword(password)

  const emailVerificationEnabled = process.env.FEATURE_EMAIL_VERIFICATION_ENABLED === 'true'

  try {
    // Create user — immediately verified when flag is off (FR-006)
    await db.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role: 'SUBMITTER',
        emailVerified: !emailVerificationEnabled,
      },
    })

    // FR-004: create verification token and send email when flag is on
    if (emailVerificationEnabled) {
      const token = generateToken()
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      await db.verificationToken.create({
        data: { email, token, expires },
      })

      // Best-effort: don't fail registration if email delivery fails
      try {
        await sendVerificationEmail(email, token)
      } catch (emailErr) {
        logEvent({
          event: 'register.email_send_failed',
          email,
          error: String(emailErr),
        })
      }
    }

    logEvent({ event: 'register.success', email })

    return NextResponse.json(
      {
        message: emailVerificationEnabled
          ? 'Registration successful. Please check your email to verify your account.'
          : 'Registration successful.',
      },
      { status: 201 }
    )
  } catch (err) {
    logEvent({ event: 'register.fail', email, reason: 'db_error', error: String(err) })
    return NextResponse.json({ error: 'Registration failed. Please try again.' }, { status: 500 })
  }
}
