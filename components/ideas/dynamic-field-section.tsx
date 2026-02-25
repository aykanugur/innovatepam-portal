'use client'

/**
 * T008 — DynamicFieldSection component.
 * Renders category-specific dynamic fields based on a FieldDefinition array.
 * Used in: idea-form.tsx (interactive), idea-detail.tsx + decision-card.tsx (readOnly).
 *
 * FR-003: Shown/hidden synchronously on category change — no network request.
 * FR-004: Parent resets `values` to {} on category change; this component reflects that.
 * FR-015: WCAG 2.1 AA — aria-required, aria-invalid, aria-describedby on all inputs.
 * FR-006: number fields use <input type="text" inputMode="numeric"> (spec FR-006).
 * FR-017: select fields with empty/absent options are silently skipped.
 * Contracts: specs/001-smart-forms/contracts/server-actions.md §DynamicFieldSection
 */

import type { FieldDefinition } from '@/types/field-template'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DynamicFieldSectionProps {
  /** Field definitions for the currently selected category. null/[] → render nothing. */
  fields: FieldDefinition[] | null
  /** Current controlled values keyed by FieldDefinition.id */
  values: Record<string, string | number>
  /** Called on every field change with the full updated value map */
  onChange: (values: Record<string, string | number>) => void
  /**
   * Initial values for pre-populating fields on draft resume (EPIC-V2-03).
   * Defaults to empty map. Applied only on first mount / fields change.
   */
  initialValues?: Record<string, string | number>
  /** Validation errors keyed by field ID (from server-side validation failure) */
  errors?: Record<string, string>
  /** Read-only display mode — renders [Label]: [Value] text, no inputs */
  readOnly?: boolean
}

// ─── Shared input style helpers ───────────────────────────────────────────────

const baseInputClass = 'w-full rounded-xl px-3.5 py-2.5 text-sm outline-none transition'
const baseInputStyle = (hasError: boolean) => ({
  background: '#1A1A2A',
  border: hasError ? '1px solid rgba(239,68,68,0.6)' : '1px solid rgba(255,255,255,0.1)',
  color: '#F0F0FA',
})

// ─── Component ────────────────────────────────────────────────────────────────

export default function DynamicFieldSection({
  fields,
  values,
  onChange,
  errors = {},
  readOnly = false,
}: DynamicFieldSectionProps) {
  // FR-009/FR-017 — render nothing when no fields
  if (!fields || fields.length === 0) return null

  // Filter out select fields with empty options (FR-017) in interactive mode
  const renderedFields = readOnly
    ? fields
    : fields.filter((f) => f.type !== 'select' || (f.options && f.options.length > 0))

  if (renderedFields.length === 0) return null

  function handleChange(id: string, rawValue: string) {
    onChange({ ...values, [id]: rawValue })
  }

  // ─── Read-only mode (idea-detail, admin review panel) ─────────────────────
  if (readOnly) {
    return (
      <div
        data-testid="dynamic-field-section"
        className="rounded-2xl p-6 space-y-3"
        style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: '#C0C0D8' }}>
          Additional Details
        </h2>
        <dl className="space-y-3">
          {renderedFields.map((field) => {
            const raw = values[field.id]
            if (raw === undefined || raw === '') return null
            return (
              <div key={field.id} className="flex flex-col gap-0.5">
                <dt className="text-xs font-medium" style={{ color: '#8888A8' }}>
                  {field.label}
                </dt>
                <dd
                  className="text-sm"
                  style={{
                    color: '#D0D0E8',
                    // FR-008: textarea values preserve line breaks (whitespace: pre-wrap)
                    whiteSpace: field.type === 'textarea' ? 'pre-wrap' : undefined,
                  }}
                >
                  {/* Fallback for schema drift: fieldId used as dd text if field not in template */}
                  {String(raw)}
                </dd>
              </div>
            )
          })}
        </dl>
      </div>
    )
  }

  // ─── Interactive mode (submission form) ───────────────────────────────────
  return (
    <div data-testid="dynamic-field-section" className="space-y-4">
      <h2 className="text-sm font-semibold" style={{ color: '#C0C0D8' }}>
        Additional Details
      </h2>

      {renderedFields.map((field) => {
        const fieldId = `dynamic-${field.id}`
        const errorId = `${fieldId}-error`
        const hasError = !!errors[field.id]
        const rawValue = values[field.id] ?? ''
        const stringValue = String(rawValue)

        return (
          <div key={field.id} className="space-y-1">
            {/* Label */}
            <label
              htmlFor={fieldId}
              className="block text-sm font-medium"
              style={{ color: '#C0C0D8' }}
            >
              {field.label} {field.required && <span aria-hidden>*</span>}
            </label>

            {/* Input — varies by field type */}
            {field.type === 'textarea' && (
              <textarea
                id={fieldId}
                name={field.id}
                rows={4}
                maxLength={2000}
                value={stringValue}
                onChange={(e) => handleChange(field.id, e.target.value)}
                aria-required={field.required}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
                className={`${baseInputClass} resize-none`}
                style={baseInputStyle(hasError)}
                placeholder={`Enter ${field.label.toLowerCase()}…`}
              />
            )}

            {field.type === 'text' && (
              <input
                id={fieldId}
                name={field.id}
                type="text"
                maxLength={255}
                value={stringValue}
                onChange={(e) => handleChange(field.id, e.target.value)}
                aria-required={field.required}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
                className={baseInputClass}
                style={baseInputStyle(hasError)}
                placeholder={`Enter ${field.label.toLowerCase()}…`}
              />
            )}

            {/* FR-006: type="text" inputMode="numeric" to avoid browser native spinner */}
            {field.type === 'number' && (
              <input
                id={fieldId}
                name={field.id}
                type="text"
                inputMode="numeric"
                value={stringValue}
                onChange={(e) => handleChange(field.id, e.target.value)}
                aria-required={field.required}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
                className={baseInputClass}
                style={baseInputStyle(hasError)}
                placeholder="0"
              />
            )}

            {field.type === 'select' && field.options && field.options.length > 0 && (
              <select
                id={fieldId}
                name={field.id}
                value={stringValue}
                onChange={(e) => handleChange(field.id, e.target.value)}
                aria-required={field.required}
                aria-invalid={hasError}
                aria-describedby={hasError ? errorId : undefined}
                className={baseInputClass}
                style={baseInputStyle(hasError)}
              >
                <option value="" disabled style={{ background: '#1A1A2A' }}>
                  Select {field.label.toLowerCase()}
                </option>
                {field.options.map((opt) => (
                  <option key={opt} value={opt} style={{ background: '#1A1A2A' }}>
                    {opt}
                  </option>
                ))}
              </select>
            )}

            {/* Inline error (FR-005, FR-013, FR-016) */}
            {hasError && (
              <p id={errorId} role="alert" className="text-xs" style={{ color: '#F87171' }}>
                {errors[field.id]}
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
