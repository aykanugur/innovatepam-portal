'use client'

import Link from 'next/link'
import { useState } from 'react'

interface GlowCardProps {
  href: string
  icon: string
  label: string
  desc: string
  glow: string
}

export function GlowCard({ href, icon, label, desc, glow }: GlowCardProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <Link
      href={href}
      className="block rounded-2xl p-6 transition-all duration-300"
      style={{
        background: hovered ? 'rgba(255,255,255,0.055)' : 'rgba(255,255,255,0.03)',
        border: hovered ? `1px solid ${glow}44` : '1px solid rgba(255,255,255,0.07)',
        boxShadow: hovered ? `0 4px 24px ${glow}18` : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="mb-3 text-2xl">{icon}</div>
      <h2 className="mb-1 text-sm font-semibold text-white">{label}</h2>
      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
        {desc}
      </p>
    </Link>
  )
}
