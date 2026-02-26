'use client'

/**
 * components/pipeline/pipeline-config-form.tsx
 *
 * T017 — US1 (Pipeline Config)
 *
 * Client Component: manages the full pipeline edit experience for one category.
 * - Lists stage rows (via StageRow)
 * - Local up/down reorder
 * - Add Stage button
 * - Save button calls createPipeline() or updatePipeline() Server Action
 * - Inline validation: exactly 1 decision stage, ≥ 1 stage,
 *   all stage names non-empty
 */

import { useState, useTransition } from 'react'
import StageRow from '@/components/pipeline/stage-row'
import { createPipeline, updatePipeline } from '@/lib/actions/pipeline-crud'
import { CATEGORY_LABEL, type CategorySlug } from '@/constants/categories'

interface StageData {
  id?: string
  name: string
  description: string
  isDecisionStage: boolean
}

interface PipelineConfigFormProps {
  categorySlug: CategorySlug
  /** Existing pipeline if already persisted */
  existing?: {
    id: string
    name: string
    stages: {
      id: string
      name: string
      description: string | null
      order: number
      isDecisionStage: boolean
    }[]
  } | null
}

export default function PipelineConfigForm({ categorySlug, existing }: PipelineConfigFormProps) {
  const categoryLabel = CATEGORY_LABEL[categorySlug] ?? categorySlug

  const [stages, setStages] = useState<StageData[]>(
    existing?.stages.length
      ? existing.stages
          .sort((a, b) => a.order - b.order)
          .map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description ?? '',
            isDecisionStage: s.isDecisionStage,
          }))
      : [
          { name: '', description: '', isDecisionStage: false },
          { name: '', description: '', isDecisionStage: true },
        ]
  )

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  // ── Local state helpers ──────────────────────────────────────────────────
  function updateStage(index: number, patch: Partial<StageData>) {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
    setSaved(false)
    setError(null)
  }

  function moveUp(index: number) {
    if (index === 0) return
    setStages((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setSaved(false)
  }

  function moveDown(index: number) {
    if (index === stages.length - 1) return
    setStages((prev) => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
    setSaved(false)
  }

  function removeStage(index: number) {
    setStages((prev) => prev.filter((_, i) => i !== index))
    setSaved(false)
    setError(null)
  }

  function addStage() {
    setStages((prev) => [...prev, { name: '', description: '', isDecisionStage: false }])
    setSaved(false)
  }

  // ── Client-side validation ────────────────────────────────────────────────
  function validate(): string | null {
    if (stages.length === 0) return 'A pipeline must have at least one stage.'
    const emptyName = stages.findIndex((s) => !s.name.trim())
    if (emptyName !== -1) return `Stage ${emptyName + 1} must have a name.`
    const decisionCount = stages.filter((s) => s.isDecisionStage).length
    if (decisionCount === 0) return 'Exactly one stage must be marked as the decision stage.'
    if (decisionCount > 1) return 'Only one stage can be marked as the decision stage.'
    return null
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  function handleSave() {
    const clientErr = validate()
    if (clientErr) {
      setError(clientErr)
      return
    }

    startTransition(async () => {
      const stagesPayload = stages.map((s, i) => ({
        name: s.name.trim(),
        description: s.description.trim() || undefined,
        order: i + 1,
        isDecisionStage: s.isDecisionStage,
      }))

      let result: { error: string; code: string } | { pipelineId: string } | { success: true }

      if (existing?.id) {
        result = await updatePipeline({
          pipelineId: existing.id,
          stages: stagesPayload,
        })
      } else {
        result = await createPipeline({
          categorySlug,
          name: `${categoryLabel} Pipeline`,
          isDefault: false,
          stages: stagesPayload,
        })
      }

      if ('error' in result) {
        setError(result.error)
      } else {
        setSaved(true)
        setError(null)
      }
    })
  }

  return (
    <section
      className="rounded-xl p-6 space-y-4"
      style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
      aria-label={`Pipeline for ${categoryLabel}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base" style={{ color: '#F0F0FA' }}>
          {categoryLabel}
        </h3>
        {existing?.id && (
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(0,200,255,0.08)', color: '#00c8ff' }}
          >
            {stages.length} stage{stages.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Stage list */}
      <ol className="space-y-3 list-none p-0 m-0">
        {stages.map((stage, idx) => (
          <StageRow
            key={stage.id ?? `new-${idx}`}
            index={idx}
            total={stages.length}
            name={stage.name}
            description={stage.description}
            isDecisionStage={stage.isDecisionStage}
            onChangeName={(v) => updateStage(idx, { name: v })}
            onChangeDescription={(v) => updateStage(idx, { description: v })}
            onChangeDecision={(checked) => updateStage(idx, { isDecisionStage: checked })}
            onMoveUp={() => moveUp(idx)}
            onMoveDown={() => moveDown(idx)}
            onRemove={() => removeStage(idx)}
          />
        ))}
      </ol>

      {/* Add Stage */}
      <button
        type="button"
        onClick={addStage}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
        style={{ color: '#00c8ff', background: 'rgba(0,200,255,0.08)' }}
      >
        <span aria-hidden>+</span> Add Stage
      </button>

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

      {/* Saved feedback */}
      {saved && (
        <p className="text-sm" style={{ color: '#4ade80' }}>
          ✓ Pipeline saved successfully.
        </p>
      )}

      {/* Save */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="rounded-lg px-5 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #00c8ff, #0070f3)' }}
      >
        {isPending ? 'Saving…' : 'Save Pipeline'}
      </button>
    </section>
  )
}
