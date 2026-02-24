import type { ReactNode } from 'react'
import Link from 'next/link'

interface AuthLayoutProps {
  children: ReactNode
}

/**
 * Split-panel auth layout.
 * Left: animated video background with branding + feature list (desktop only).
 * Right: white panel with the auth form content.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div
      className="flex min-h-screen"
      style={{ fontFamily: 'var(--font-sora), var(--font-inter), sans-serif' }}
    >
      {/* ── LEFT PANEL — video + branding ─────────────────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-[58%] xl:w-[62%] flex-col overflow-hidden"
        style={{ background: '#060608' }}
      >
        {/* Looping background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: 0.45, filter: 'saturate(1.4) brightness(0.75)' }}
          aria-hidden
        >
          {/* Royalty-free abstract tech loop — replace src with your own video URL */}
          <source
            src="https://cdn.coverr.co/videos/coverr-abstract-purple-blue-waves-4846/1080p.mp4"
            type="video/mp4"
          />
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4" />
        </video>

        {/* Gradient overlays on top of video */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(135deg, rgba(6,6,8,0.88) 0%, rgba(6,6,8,0.45) 50%, rgba(6,6,8,0.78) 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 70% 55% at 25% 35%, rgba(139,92,246,0.32) 0%, transparent 65%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 55% 40% at 75% 70%, rgba(0,200,255,0.14) 0%, transparent 60%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(6,6,8,0.95) 0%, transparent 35%)' }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full px-12 py-10">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <span className="font-bold text-xl tracking-tight" style={{ color: '#00c8ff' }}>
              &lt;epam&gt;
            </span>
            <span className="font-semibold text-xl tracking-tight text-white">InnovatEPAM</span>
          </Link>

          <div className="flex-1 flex flex-col justify-center" style={{ maxWidth: '42ch' }}>
            <div
              className="inline-flex items-center gap-2 mb-8 px-3 py-1.5 rounded-full text-xs font-medium w-fit"
              style={{
                background: 'rgba(0,200,255,0.1)',
                border: '1px solid rgba(0,200,255,0.2)',
                color: '#00c8ff',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#00c8ff] animate-pulse" />
              Internal Innovation Platform
            </div>

            <h1
              style={{
                fontWeight: 800,
                fontSize: 'clamp(2.2rem, 3.2vw, 3.4rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.03em',
                color: '#fff',
                marginBottom: '1.25rem',
              }}
            >
              Where great
              <br />
              <span
                style={{
                  background: 'linear-gradient(90deg, #00c8ff, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                ideas live.
              </span>
            </h1>

            <p className="text-gray-400 text-base mb-12" style={{ lineHeight: 1.72 }}>
              Submit your innovations, track expert reviews, and watch your ideas shape the future
              of EPAM.
            </p>

            <div className="flex flex-col gap-4">
              {[
                { icon: '💡', text: 'Submit ideas in under 2 minutes' },
                { icon: '🔍', text: 'Expert review with structured feedback' },
                { icon: '📊', text: 'Track your idea from spark to launch' },
              ].map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    {icon}
                  </div>
                  <span className="text-sm text-gray-300">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
            © 2026 EPAM Systems. Internal use only.
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — auth form ────────────────────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 bg-white relative">
        {/* Mobile-only logo */}
        <div className="lg:hidden absolute top-6 left-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-bold text-base" style={{ color: '#0070f3' }}>
              &lt;epam&gt;
            </span>
            <span className="font-semibold text-base text-gray-900">InnovatEPAM</span>
          </Link>
        </div>

        <div className="w-full max-w-[400px]">{children}</div>

        <p className="absolute bottom-6 text-xs text-gray-300">© 2026 EPAM Systems, Inc.</p>
      </div>
    </div>
  )
}
