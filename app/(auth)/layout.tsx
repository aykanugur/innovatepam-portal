import type { ReactNode } from 'react'

interface AuthLayoutProps {
  children: ReactNode
}

/**
 * Centered card layout for all auth pages: /login, /register, /verify-email.
 * No navigation chrome — pure branded centering.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        {/* EPAM brand header */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">InnovatEPAM</h1>
          <p className="mt-1 text-sm text-muted-foreground">Internal innovation platform</p>
        </div>

        {/* Page content (form card rendered by each page) */}
        {children}
      </div>
    </div>
  )
}
