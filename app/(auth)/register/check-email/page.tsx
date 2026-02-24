import Link from 'next/link'

export const metadata = {
  title: 'Check your email — InnovatEPAM',
}

/**
 * Static confirmation page shown after successful registration
 * when FEATURE_EMAIL_VERIFICATION_ENABLED=true.
 * US-004 AC-1: redirected here instead of /dashboard.
 */
export default function CheckEmailPage() {
  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-sm text-center">
      <div className="mb-4 flex justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-7 w-7 text-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
            />
          </svg>
        </div>
      </div>

      <h2 className="mb-2 text-xl font-semibold">Check your inbox</h2>
      <p className="mb-6 text-sm text-muted-foreground">
        We sent a verification link to your <strong>@epam.com</strong> address. Click the link in
        the email to activate your account.
        <br />
        <span className="mt-1 block">The link expires in 24 hours.</span>
      </p>

      <p className="text-sm text-muted-foreground">
        Already verified?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
