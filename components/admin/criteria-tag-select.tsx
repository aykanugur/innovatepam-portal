'use client'

/**
 * components/admin/criteria-tag-select.tsx
 *
 * EPIC-V2-06 — Scoring System
 * US-042: Optional multi-select tag group for scoring criteria.
 *
 * Renders 5 toggleable Badge buttons from SCORING_CRITERIA constant.
 * Selection is managed via useState — no server state needed.
 */

import { SCORING_CRITERIA, type ScoringCriterion } from '@/constants/scoring-criteria'

interface CriteriaTagSelectProps {
  /** Currently selected criteria */
  value: ScoringCriterion[]
  /** Called when selection changes */
  onChange: (value: ScoringCriterion[]) => void
}

export default function CriteriaTagSelect({ value, onChange }: CriteriaTagSelectProps) {
  function toggle(criterion: ScoringCriterion) {
    if (value.includes(criterion)) {
      onChange(value.filter((c) => c !== criterion))
    } else {
      onChange([...value, criterion])
    }
  }

  return (
    <div>
      <label className="block text-xs font-medium mb-2" style={{ color: '#8888A8' }}>
        Evaluation criteria <span style={{ color: '#555577' }}>(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {SCORING_CRITERIA.map((criterion) => {
          const isSelected = value.includes(criterion)
          return (
            <button
              key={criterion}
              type="button"
              onClick={() => toggle(criterion)}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-all"
              style={{
                background: isSelected ? 'rgba(0,200,255,0.15)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isSelected ? 'rgba(0,200,255,0.4)' : 'rgba(255,255,255,0.1)'}`,
                color: isSelected ? '#00c8ff' : '#8888A8',
              }}
              aria-pressed={isSelected}
            >
              {criterion}
            </button>
          )
        })}
      </div>
    </div>
  )
}
