import Link from 'next/link'

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[#060608] text-white"
      style={{ fontFamily: 'var(--font-sora), sans-serif' }}
    >
      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4"
        style={{
          background: 'rgba(6,6,8,0.8)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[#00c8ff] font-bold text-lg tracking-tight">&lt;epam&gt;</span>
          <span className="text-white font-semibold text-lg tracking-tight">InnovatEPAM</span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-5 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/register"
            className="px-5 py-2 text-sm font-semibold rounded-full transition-all hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #00c8ff, #0070f3)',
              color: '#fff',
              boxShadow: '0 0 20px rgba(0,200,255,0.3)',
            }}
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        {/* Gradient mesh background */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(139,92,246,0.35) 0%, transparent 65%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 60% 50% at 20% 80%, rgba(220,38,38,0.25) 0%, transparent 60%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 40% 40% at 85% 70%, rgba(0,200,255,0.15) 0%, transparent 55%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse 50% 30% at 10% 30%, rgba(16,185,129,0.1) 0%, transparent 55%)',
            }}
          />
          {/* Grid overlay */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}
          />
          {/* Noise grain */}
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div
            className="inline-flex items-center gap-2 mb-8 px-4 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'rgba(0,200,255,0.1)',
              border: '1px solid rgba(0,200,255,0.25)',
              color: '#00c8ff',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#00c8ff] animate-pulse" />
            Open Innovation Platform for EPAM Employees
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-sora), sans-serif',
              fontWeight: 800,
              fontSize: 'clamp(2.8rem, 6vw, 5rem)',
              lineHeight: 1.08,
              letterSpacing: '-0.03em',
            }}
            className="mb-6 text-white"
          >
            Turn Your Ideas Into
            <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #00c8ff, #a855f7, #ff3b5c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Real Innovation
            </span>
          </h1>

          <p
            className="text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10"
            style={{ lineHeight: 1.65 }}
          >
            Submit, discover, and champion ideas that shape the future of EPAM. Every great product
            starts with a single spark — yours could be next.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-8 py-3.5 text-base font-semibold rounded-full transition-all hover:scale-105 hover:shadow-2xl"
              style={{
                background: 'linear-gradient(135deg, #00c8ff, #0070f3)',
                color: '#fff',
                boxShadow: '0 0 30px rgba(0,200,255,0.35)',
              }}
            >
              Submit Your First Idea →
            </Link>
            <Link
              href="/login"
              className="px-8 py-3.5 text-base font-medium rounded-full transition-all hover:bg-white/10"
              style={{ border: '1px solid rgba(255,255,255,0.15)', color: '#e5e5e5' }}
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <span className="text-xs tracking-widest uppercase text-gray-400">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-gray-400 to-transparent" />
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: '500+', label: 'Ideas Submitted' },
            { value: '12', label: 'Categories' },
            { value: '48h', label: 'Avg. Review Time' },
            { value: '30+', label: 'Ideas Implemented' },
          ].map(({ value, label }) => (
            <div key={label}>
              <div
                className="text-3xl font-bold mb-1"
                style={{
                  fontFamily: 'var(--font-sora)',
                  background: 'linear-gradient(135deg, #00c8ff, #a855f7)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {value}
              </div>
              <div className="text-sm text-gray-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: '#00c8ff' }}
            >
              Why InnovatEPAM
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em' }}
            >
              Built for people who think forward
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: '💡',
                title: 'Submit Ideas',
                desc: 'Share your innovation with a simple form. Add context, category, and visibility settings. Your idea is live in seconds.',
                accent: '#00c8ff',
              },
              {
                icon: '🔍',
                title: 'Expert Review',
                desc: 'Dedicated reviewers evaluate every submission with structured feedback — transparent, fair, and timely.',
                accent: '#a855f7',
              },
              {
                icon: '🚀',
                title: 'See Impact',
                desc: 'Track your idea from submission to implementation. Watch it evolve from a spark into something real.',
                accent: '#ff3b5c',
              },
            ].map(({ icon, title, desc, accent }) => (
              <div
                key={title}
                className="group rounded-2xl p-7 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: `0 0 0 0 ${accent}`,
                }}
              >
                <div className="text-4xl mb-5">{icon}</div>
                <h3
                  className="text-lg font-semibold mb-3 text-white"
                  style={{ fontFamily: 'var(--font-sora)' }}
                >
                  {title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                <div
                  className="mt-4 h-0.5 w-12 rounded-full transition-all duration-300 group-hover:w-20"
                  style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-24 px-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ color: '#a855f7' }}
            >
              Process
            </p>
            <h2
              className="text-3xl md:text-4xl font-bold text-white"
              style={{ fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em' }}
            >
              From idea to impact in 3 steps
            </h2>
          </div>

          <div className="flex flex-col md:flex-row gap-0">
            {[
              {
                step: '01',
                title: 'Register & Sign In',
                desc: 'Create your account in under a minute. Your EPAM identity, your innovation journey.',
              },
              {
                step: '02',
                title: 'Write Your Idea',
                desc: 'Fill in a title, description, and category. Set visibility to public or keep it private.',
              },
              {
                step: '03',
                title: 'Get Reviewed',
                desc: 'An admin reviewer picks it up, evaluates it, and provides structured written feedback.',
              },
            ].map(({ step, title, desc }, i) => (
              <div key={step} className="flex-1 relative">
                {/* Connector line */}
                {i < 2 && (
                  <div
                    className="hidden md:block absolute top-8 left-[calc(50%+2rem)] right-0 h-px"
                    style={{
                      background: 'linear-gradient(90deg, rgba(168,85,247,0.4), transparent)',
                    }}
                  />
                )}
                <div className="text-center px-8 py-6">
                  <div
                    className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5 mx-auto font-mono text-lg font-bold"
                    style={{
                      background: 'rgba(168,85,247,0.12)',
                      border: '1px solid rgba(168,85,247,0.3)',
                      color: '#a855f7',
                    }}
                  >
                    {step}
                  </div>
                  <h3
                    className="text-base font-semibold mb-2 text-white"
                    style={{ fontFamily: 'var(--font-sora)' }}
                  >
                    {title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ───────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center relative">
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background:
                'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,200,255,0.08) 0%, transparent 70%)',
            }}
          />
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: '#00c8ff' }}
          >
            Ready?
          </p>
          <h2
            className="text-3xl md:text-4xl font-bold text-white mb-5"
            style={{ fontFamily: 'var(--font-sora)', letterSpacing: '-0.02em' }}
          >
            Your next idea could change everything
          </h2>
          <p className="text-gray-400 mb-10 text-base max-w-xl mx-auto" style={{ lineHeight: 1.7 }}>
            Join hundreds of EPAM employees already shaping the future. It takes 2 minutes to get
            started.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="px-10 py-4 text-base font-semibold rounded-full transition-all hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #00c8ff, #0070f3)',
                color: '#fff',
                boxShadow: '0 0 40px rgba(0,200,255,0.3)',
              }}
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Already have an account? Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} className="py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#00c8ff] font-bold text-sm">&lt;epam&gt;</span>
            <span className="text-gray-400 text-sm">InnovatEPAM Portal</span>
          </div>
          <p className="text-xs text-gray-600">
            © 2026 EPAM Systems. Internal employee innovation platform.
          </p>
          <div className="flex gap-6">
            <Link
              href="/login"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
