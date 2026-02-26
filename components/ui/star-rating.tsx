'use client'

/**
 * components/ui/star-rating.tsx
 *
 * EPIC-V2-06 — Scoring System
 * US-041: Interactive 1–5 star rating input + read-only StarDisplay.
 *
 * Interactive mode: click / hover / keyboard (Arrow Left/Right + Enter).
 * Read-only mode (StarDisplay): static stars for idea detail page.
 */

import { useState, useCallback } from 'react'
import { Star } from 'lucide-react'

// ── Interactive Star Rating ─────────────────────────────────────────────────

interface StarRatingProps {
  /** Currently selected value (0 = none selected) */
  value: number
  /** Called when user selects a star */
  onChange: (value: number) => void
  /** Label rendered above the stars */
  label?: string
  /** Whether the field is required */
  required?: boolean
  /** Error message to display */
  error?: string | null
}

export function StarRating({
  value,
  onChange,
  label = 'Rate this idea',
  required = false,
  error,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
        e.preventDefault()
        onChange(Math.min(value + 1, 5))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
        e.preventDefault()
        onChange(Math.max(value - 1, 1))
      }
    },
    [value, onChange]
  )

  const displayValue = hoverValue || value

  return (
    <div>
      <label className="block text-xs font-medium mb-2" style={{ color: '#8888A8' }}>
        {label}
        {required && <span style={{ color: '#ff6b6b' }}> *</span>}
      </label>
      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label={label}
        onKeyDown={handleKeyDown}
        tabIndex={0}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= displayValue
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} star${star > 1 ? 's' : ''}`}
              className="p-0.5 transition-transform hover:scale-110 focus:outline-none"
              onClick={() => onChange(star)}
              onMouseEnter={() => setHoverValue(star)}
              onMouseLeave={() => setHoverValue(0)}
            >
              <Star
                className={`w-7 h-7 transition-colors ${
                  isFilled ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-[#4a4a6a]'
                }`}
              />
            </button>
          )
        })}
        {value > 0 && (
          <span className="ml-2 text-sm font-medium" style={{ color: '#8888A8' }}>
            {value} / 5
          </span>
        )}
      </div>
      {error && (
        <p className="text-sm mt-1" style={{ color: '#ff6b6b' }} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

// ── Read-Only Star Display ──────────────────────────────────────────────────

interface StarDisplayProps {
  /** Score value (1–5) */
  score: number
  /** Optional size class for the star icons */
  sizeClass?: string
}

/**
 * Static star display (read-only). Used on the idea detail page
 * and in analytics widgets.
 */
export function StarDisplay({ score, sizeClass = 'w-5 h-5' }: StarDisplayProps) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Score: ${score} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${sizeClass} ${
            star <= score ? 'fill-yellow-400 text-yellow-400' : 'fill-transparent text-[#4a4a6a]'
          }`}
          aria-hidden
        />
      ))}
      <span className="ml-1.5 text-sm" style={{ color: '#8888A8' }}>
        {score} / 5
      </span>
    </div>
  )
}
