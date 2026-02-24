'use client'

/**
 * T016 — Category filter component.
 * Renders a <select> populated from CATEGORIES constants.
 * On change, updates ?category=slug in the URL via useRouter (client component).
 * An empty selection clears the filter (removes the param).
 * FR-013 / R-007.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { CATEGORIES } from '@/constants/categories'

interface CategoryFilterProps {
  currentCategory?: string
}

export default function CategoryFilter({ currentCategory }: CategoryFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', '1') // reset to page 1 on filter change

      if (e.target.value) {
        params.set('category', e.target.value)
      } else {
        params.delete('category')
      }

      router.push(`/ideas?${params.toString()}`)
    },
    [router, searchParams]
  )

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="category-filter" className="text-sm font-medium" style={{ color: '#A0A0BC' }}>
        Category
      </label>
      <select
        id="category-filter"
        value={currentCategory ?? ''}
        onChange={handleChange}
        className="rounded-full px-4 py-1.5 text-sm outline-none transition"
        style={{
          background: '#1A1A2A',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#F0F0FA',
        }}
      >
        <option value="" style={{ background: '#1A1A2A' }}>
          All categories
        </option>
        {CATEGORIES.map(({ slug, label }) => (
          <option key={slug} value={slug} style={{ background: '#1A1A2A' }}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
