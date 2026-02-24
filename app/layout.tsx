import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
// Side-effect import: runs Zod env validation on every server start.
// If any required variable is missing, Next.js fails fast with a clear error.
import '@/lib/env'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'InnovateEPAM Portal',
  description: 'Employee innovation submission portal',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  )
}
