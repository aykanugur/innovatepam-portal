import { Resend } from 'resend'

/**
 * Send an email verification link to the given address.
 *
 * No-ops when FEATURE_EMAIL_VERIFICATION_ENABLED is not 'true' — in that
 * case the register route marks accounts as verified immediately and never
 * calls this function, but having the guard here provides defence-in-depth.
 *
 * FR-004: verification link valid for 24 hours.
 */
export async function sendVerificationEmail(to: string, token: string): Promise<void> {
  if (process.env.FEATURE_EMAIL_VERIFICATION_ENABLED !== 'true') {
    return
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const url = `${baseUrl}/verify-email?token=${token}`

  await resend.emails.send({
    from: 'InnovatEPAM <noreply@innovatepam.epam.com>',
    to,
    subject: 'Verify your InnovatEPAM account',
    html: `
      <p>Welcome to InnovatEPAM!</p>
      <p>Click the link below to verify your email address. This link expires in 24 hours.</p>
      <p><a href="${url}">${url}</a></p>
      <p>If you did not create an account, you can safely ignore this email.</p>
    `,
  })
}
