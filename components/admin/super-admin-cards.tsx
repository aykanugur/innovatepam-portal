'use client'

import Link from 'next/link'

const SUPER_ADMIN_CARDS = [
  {
    href: '/admin/users',
    icon: '👥',
    label: 'User Management',
    desc: 'Manage user roles and platform access.',
    glow: '#00c8ff',
  },
  {
    href: '/admin/analytics',
    icon: '📊',
    label: 'Analytics',
    desc: 'Submission trends and category insights.',
    glow: '#a855f7',
  },
]

export function SuperAdminCards() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {SUPER_ADMIN_CARDS.map(({ href, icon, label, desc, glow }) => (
        <Link
          key={href}
          href={href}
          className="group rounded-2xl p-6 transition-all duration-300"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.background = 'rgba(255,255,255,0.05)'
            el.style.border = `1px solid ${glow}40`
            el.style.boxShadow = `0 4px 24px ${glow}15`
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget as HTMLAnchorElement
            el.style.background = 'rgba(255,255,255,0.03)'
            el.style.border = '1px solid rgba(255,255,255,0.07)'
            el.style.boxShadow = ''
          }}
        >
          <div className="mb-3 text-2xl">{icon}</div>
          <h2 className="mb-1 text-sm font-semibold text-white">{label}</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {desc}
          </p>
        </Link>
      ))}
    </div>
  )
}
