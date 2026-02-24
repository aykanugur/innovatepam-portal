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
    <div className="flex items-center gap-2">
      <label htmlFor="category-filter" className="text-sm font-medium text-foreground">
        Category
      </label>
      <select
        id="category-filter"
        value={currentCategory ?? ''}
        onChange={handleChange}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">All categories</option>
        {CATEGORIES.map(({ slug, label }) => (
          <option key={slug} value={slug}>
            {label}
          </option>
        ))}
      </select>
    </div>
  )
}
