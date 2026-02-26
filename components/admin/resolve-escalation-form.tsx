'use client'

/**
 * components/admin/resolve-escalation-form.tsx
 *
 * T032 — US3 (Escalation)
 *
 * Client Component: SUPERADMIN-only form to resolve an escalated stage.
 * - PASS / REJECT radio
 * - Comment textarea (min 10, max 2000)
 * - Calls resolveEscalation() Server Action
 * - Only renders when isSuperAdmin=true
 */

import { useState, useTransition } from 'react'
import { resolveEscalation } from '@/lib/actions/resolve-escalation'

interface ResolveEscalationFormProps {
  stageProgressId: string
  isSuperAdmin: boolean
  ideaTitle: string
}

export default function ResolveEscalationForm({
  stageProgressId,
  isSuperAdmin,
  ideaTitle,
}: ResolveEscalationFormProps) {
  const [action, setAction] = useState<'PASS' | 'REJECT'>('PASS')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [resolved, setResolved] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (!isSuperAdmin) {
    return (
      <div
        className="rounded-xl p-5 text-sm"
        style={{
          background: '#1A1A2A',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#8888A8',
        }}
      >
        Escalation resolution requires SUPERADMIN privileges.
      </div>
    )
  }

  if (resolved) {
    return (
      <div
        className="rounded-xl p-5 text-sm"
        style={{
          background: 'rgba(74,222,128,0.06)',
          border: '1px solid rgba(74,222,128,0.2)',
          color: '#4ade80',
        }}
        role="status"
      >
        ✓ Escalation resolved successfully. The idea review has been updated.
      </div>
    )
  }

  const commentTrimmed = comment.trim()
  const canSubmit = commentTrimmed.length >= 10 && commentTrimmed.length <= 2000 && !isPending

  function handleResolve() {
    if (!canSubmit) return
    setError(null)
    startTransition(async () => {
      const result = await resolveEscalation(stageProgressId, action, commentTrimmed)
      if ('error' in result) {
        setError(result.error)
      } else {
        setResolved(true)
      }
    })
  }

  return (
    <section
      className="rounded-xl p-6 space-y-5"
      style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      aria-label={`Resolve escalation for: ${ideaTitle}`}
    >
      <div className="flex items-center gap-2">
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
          style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}
        >
          Escalated
        </span>
        <h2 className="text-base font-semibold" style={{ color: '#F0F0FA' }}>
          Resolve Escalation
        </h2>
      </div>

      <p className="text-sm" style={{ color: '#8888A8' }}>
        As SUPERADMIN, decide whether to advance this idea or reject it.
      </p>

      {/* Action radio */}
      <fieldset>
        <legend className="text-xs font-medium mb-2" style={{ color: '#8888A8' }}>
          Resolution <span style={{ color: '#ff6b6b' }}>*</span>
        </legend>
        <div className="flex flex-col gap-2">
          {(['PASS', 'REJECT'] as const).map((opt) => {
            const isSelected = action === opt
            const color = opt === 'PASS' ? '#4ade80' : '#ff6b6b'
            return (
              <label
                key={opt}
                className="flex items-center gap-3 cursor-pointer rounded-lg px-3 py-2.5 transition-colors"
                style={{
                  background: isSelected ? 'rgba(0,200,255,0.06)' : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isSelected ? 'rgba(0,200,255,0.25)' : 'rgba(255,255,255,0.06)'}`,
                }}
              >
                <input
                  type="radio"
                  name="resolve-action"
                  value={opt}
                  checked={isSelected}
                  onChange={() => setAction(opt)}
                  className="sr-only"
                />
                <span
                  className="flex-shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ borderColor: isSelected ? color : 'rgba(255,255,255,0.2)' }}
                >
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  )}
                </span>
                <span className="text-sm" style={{ color: isSelected ? '#F0F0FA' : '#8888A8' }}>
                  {opt === 'PASS'
                    ? 'PASS — advance to next stage (or accept idea if last stage)'
                    : 'REJECT — close idea as rejected'}
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      {/* Comment */}
      <div>
        <label
          htmlFor="resolve-comment"
          className="block text-xs font-medium mb-1"
          style={{ color: '#8888A8' }}
        >
          Resolution comment <span style={{ color: '#ff6b6b' }}>*</span>{' '}
          <span style={{ color: '#555577' }}>(min 10 characters)</span>
        </label>
        <textarea
          id="resolve-comment"
          rows={4}
          maxLength={2000}
          value={comment}
          onChange={(e) => {
            setComment(e.target.value)
            setError(null)
          }}
          placeholder="Explain your resolution decision…"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none transition-colors"
          style={{
            background: '#12121E',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#F0F0FA',
          }}
        />
        <div className="mt-1 flex justify-between">
          <span
            className="text-xs"
            style={{ color: commentTrimmed.length < 10 ? '#fbbf24' : '#555577' }}
          >
            {commentTrimmed.length} / 2000
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p
          role="alert"
          className="rounded-lg px-3 py-2 text-sm"
          style={{ background: 'rgba(255,107,107,0.08)', color: '#ff6b6b' }}
        >
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleResolve}
        disabled={!canSubmit}
        className="rounded-lg px-6 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-40"
        style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
      >
        {isPending ? 'Resolving…' : 'Confirm Resolution'}
      </button>
    </section>
  )
}
