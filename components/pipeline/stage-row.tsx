'use client'

/**
 * components/pipeline/stage-row.tsx
 *
 * T016 — US1 (Pipeline Config)
 *
 * Client Component: renders a single stage row inside PipelineConfigForm.
 * - Name input (required, max 80 chars)
 * - Description textarea (optional, max 320 chars)
 * - Decision-stage checkbox (exactly one must be checked before saving)
 * - Up / Down reorder buttons (local state only — no server call per click)
 * - Remove button (hidden if only 1 row remains)
 */

interface StageRowProps {
  index: number
  total: number
  name: string
  description: string
  isDecisionStage: boolean
  onChangeName: (value: string) => void
  onChangeDescription: (value: string) => void
  onChangeDecision: (checked: boolean) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onRemove: () => void
}

export default function StageRow({
  index,
  total,
  name,
  description,
  isDecisionStage,
  onChangeName,
  onChangeDescription,
  onChangeDecision,
  onMoveUp,
  onMoveDown,
  onRemove,
}: StageRowProps) {
  const isFirst = index === 0
  const isLast = index === total - 1
  const labelId = `stage-label-${index}`

  return (
    <li
      aria-labelledby={labelId}
      className="rounded-xl p-4 space-y-3"
      style={{ background: '#12121E', border: '1px solid rgba(255,255,255,0.07)' }}
    >
      {/* Header row: stage number + reorder + remove */}
      <div className="flex items-center gap-2">
        <span
          id={labelId}
          className="flex-shrink-0 flex items-center justify-center rounded-full w-6 h-6 text-xs font-semibold"
          style={{ background: 'rgba(0,200,255,0.12)', color: '#00c8ff' }}
        >
          {index + 1}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            disabled={isFirst}
            onClick={onMoveUp}
            className="rounded p-1 transition-opacity disabled:opacity-30"
            style={{ color: '#8888A8' }}
            aria-label={`Move stage ${index + 1} up`}
          >
            ↑
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={onMoveDown}
            className="rounded p-1 transition-opacity disabled:opacity-30"
            style={{ color: '#8888A8' }}
            aria-label={`Move stage ${index + 1} down`}
          >
            ↓
          </button>
          {total > 1 && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded px-2 py-1 text-xs transition-opacity hover:opacity-80"
              style={{ color: '#ff6b6b', background: 'rgba(255,107,107,0.1)' }}
              aria-label={`Remove stage ${index + 1}`}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Name */}
      <div>
        <label
          htmlFor={`stage-name-${index}`}
          className="block text-xs font-medium mb-1"
          style={{ color: '#8888A8' }}
        >
          Stage Name <span style={{ color: '#ff6b6b' }}>*</span>
        </label>
        <input
          id={`stage-name-${index}`}
          type="text"
          required
          maxLength={80}
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="e.g. Initial Screening"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors"
          style={{
            background: '#1A1A2A',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#F0F0FA',
          }}
          aria-required="true"
        />
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor={`stage-desc-${index}`}
          className="block text-xs font-medium mb-1"
          style={{ color: '#8888A8' }}
        >
          Description <span style={{ color: '#555577' }}>(optional)</span>
        </label>
        <textarea
          id={`stage-desc-${index}`}
          maxLength={320}
          rows={2}
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          placeholder="Briefly describe what this stage evaluates…"
          className="w-full rounded-lg px-3 py-2 text-sm outline-none resize-none transition-colors"
          style={{
            background: '#1A1A2A',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#F0F0FA',
          }}
        />
      </div>

      {/* Decision stage toggle */}
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isDecisionStage}
          onChange={(e) => onChangeDecision(e.target.checked)}
          className="sr-only"
          aria-checked={isDecisionStage}
          aria-label="Mark as decision stage"
        />
        <span
          className="flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-xs"
          style={{
            background: isDecisionStage ? 'rgba(0,200,255,0.2)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${isDecisionStage ? '#00c8ff' : 'rgba(255,255,255,0.15)'}`,
            color: '#00c8ff',
          }}
        >
          {isDecisionStage && '✓'}
        </span>
        <span className="text-xs" style={{ color: '#8888A8' }}>
          Decision stage (ACCEPTED / REJECTED)
        </span>
      </label>
    </li>
  )
}
