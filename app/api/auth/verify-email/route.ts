import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/auth/verify-email?token=<hex>
 *
 * Programmatic verification endpoint. Returns JSON for API consumers.
 * The primary user-facing flow goes through the page route (T015).
 * US-005, FR-005.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Invalid verification link.' }, { status: 404 })
  }

  const record = await db.verificationToken.findUnique({ where: { token } })

  if (!record) {
    return NextResponse.json({ error: 'Invalid verification link.' }, { status: 404 })
  }

  if (record.expires < new Date()) {
    await db.verificationToken.delete({ where: { token } }).catch(() => null)
    return NextResponse.json(
      { error: 'Verification link has expired. Please register again.' },
      { status: 400 }
    )
  }

  const user = await db.user.findUnique({ where: { email: record.email } })

  if (!user) {
    return NextResponse.json({ error: 'Invalid verification link.' }, { status: 404 })
  }

  if (user.emailVerified) {
    await db.verificationToken.delete({ where: { token } }).catch(() => null)
    return NextResponse.json({ message: 'Email already verified. You can log in.' })
  }

  await Promise.all([
    db.user.update({ where: { email: record.email }, data: { emailVerified: true } }),
    db.verificationToken.delete({ where: { token } }),
  ])

  console.log(
    JSON.stringify({ event: 'verify.success', email: record.email, ts: new Date().toISOString() })
  )

  return NextResponse.json({ message: 'Email verified successfully.' })
}
