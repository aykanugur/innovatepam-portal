'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error)
  }, [error])

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12 text-center"
      style={{ background: '#060608' }}
    >
      <p
        className="mb-2 text-6xl font-bold"
        aria-hidden="true"
        style={{ color: 'rgba(0,200,255,0.25)', fontFamily: 'var(--font-sora, sans-serif)' }}
      >
        500
      </p>
      <h1 className="mb-2 text-2xl font-semibold" style={{ color: '#F0F0FA' }}>
        Something went wrong
      </h1>
      <p className="mb-8 text-sm" style={{ color: '#8888A8' }}>
        An unexpected error occurred. Please try again.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
          style={{ border: '1px solid rgba(255,255,255,0.12)', color: '#C0C0D8' }}
        >
          Go to dashboard
        </Link>
      </div>
    </main>
  )
}
