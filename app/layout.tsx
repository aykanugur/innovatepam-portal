import type { Metadata } from 'next'
import { Inter, Sora } from 'next/font/google'
import './globals.css'
// Side-effect import: runs Zod env validation on every server start.
// If any required variable is missing, Next.js fails fast with a clear error.
import '@/lib/env'
import { TooltipProvider } from '@/components/ui/tooltip'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
  weight: ['300', '400', '600', '700', '800'],
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
    <html lang="en" className={`${inter.variable} ${sora.variable}`}>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  )
}
