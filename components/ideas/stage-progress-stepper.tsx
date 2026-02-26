/**
 * components/ideas/stage-progress-stepper.tsx
 *
 * T035 — US5 (Submitter Sees Stage Progress Stepper)
 *
 * Server Component.
 * Renders a horizontal (or stacked on mobile) stepper showing each review stage.
 *
 * Role-based data redaction:
 * - SUBMITTER: sees stage name + status badge only; no reviewer identity or comment
 *   for incomplete stages; completed stages show outcome but NOT reviewer name
 * - ADMIN/SUPERADMIN: sees all fields including reviewer name and outcome
 *
 * V1 fallback: renders nothing when stageProgress array is empty.
 */

export type StageProgressItem = {
  id: string
  startedAt: Date | null
  completedAt: Date | null
  outcome: 'PASS' | 'ESCALATE' | 'ACCEPTED' | 'REJECTED' | null
  comment: string | null
  stage: {
    name: string
    order: number
    isDecisionStage: boolean
  }
  reviewer: { displayName: string | null } | null
}

interface StageProgressStepperProps {
  stageProgress: StageProgressItem[]
  viewerRole: 'SUBMITTER' | 'ADMIN' | 'SUPERADMIN'
}

const OUTCOME_BADGE: Record<string, { label: string; bg: string; color: string }> = {
  PASS: { label: 'Passed', bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
  ESCALATE: { label: 'Escalated', bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  ACCEPTED: { label: 'Accepted', bg: 'rgba(74,222,128,0.12)', color: '#4ade80' },
  REJECTED: { label: 'Rejected', bg: 'rgba(255,107,107,0.12)', color: '#ff6b6b' },
}

function stageStatus(progress: StageProgressItem): 'not-started' | 'in-progress' | 'completed' {
  if (progress.completedAt) return 'completed'
  if (progress.startedAt) return 'in-progress'
  return 'not-started'
}

export default function StageProgressStepper({
  stageProgress,
  viewerRole,
}: StageProgressStepperProps) {
  // V1 fallback: nothing to show
  if (stageProgress.length === 0) return null

  const isAdmin = viewerRole === 'ADMIN' || viewerRole === 'SUPERADMIN'

  const sorted = [...stageProgress].sort((a, b) => a.stage.order - b.stage.order)

  return (
    <section
      aria-label="Review stage progress"
      className="rounded-xl p-5 space-y-4"
      style={{ background: '#1A1A2A', border: '1px solid rgba(255,255,255,0.08)' }}
    >
      <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: '#8888A8' }}>
        Review Progress
      </h2>

      <ol
        className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-0"
        role="list"
        aria-label="Stage list"
      >
        {sorted.map((progress, idx) => {
          const status = stageStatus(progress)
          const isLast = idx === sorted.length - 1

          // Connector line styles
          const connectorColor =
            status === 'completed' ? 'rgba(74,222,128,0.4)' : 'rgba(255,255,255,0.1)'

          // Step indicator
          const indicatorBg =
            status === 'completed'
              ? '#4ade80'
              : status === 'in-progress'
                ? '#00c8ff'
                : 'rgba(255,255,255,0.08)'
          const indicatorText = status === 'completed' ? '✓' : String(progress.stage.order)
          const indicatorColor =
            status === 'completed' ? '#060608' : status === 'in-progress' ? '#060608' : '#555577'

          const outcomeBadge = progress.outcome ? OUTCOME_BADGE[progress.outcome] : null

          return (
            <li key={progress.id} className="flex sm:flex-1 sm:flex-col items-start">
              <div className="flex sm:flex-row items-start w-full">
                {/* Step circle + connector */}
                <div className="flex flex-col sm:flex-row items-center">
                  <span
                    className="flex-shrink-0 flex w-7 h-7 rounded-full items-center justify-center text-xs font-semibold"
                    style={{ background: indicatorBg, color: indicatorColor }}
                    aria-hidden
                  >
                    {indicatorText}
                  </span>
                  {/* Connector between steps */}
                  {!isLast && (
                    <div
                      className="hidden sm:block h-0.5 flex-1 mt-3.5 ml-0"
                      style={{ background: connectorColor, minWidth: 16 }}
                      aria-hidden
                    />
                  )}
                </div>

                {/* Stage details */}
                <div className="ml-3 sm:ml-0 sm:mt-2 sm:pr-4 pb-4 sm:pb-0 flex-1">
                  <p
                    className="text-sm font-medium"
                    style={{
                      color:
                        status === 'not-started'
                          ? '#555577'
                          : status === 'in-progress'
                            ? '#00c8ff'
                            : '#F0F0FA',
                    }}
                  >
                    {progress.stage.name}
                  </p>

                  {/* Status badge */}
                  <div className="mt-1 flex items-center gap-2 flex-wrap">
                    {status === 'in-progress' && (
                      <span
                        className="text-xs rounded-full px-2 py-0.5 font-medium"
                        style={{ background: 'rgba(0,200,255,0.12)', color: '#00c8ff' }}
                      >
                        In Progress
                      </span>
                    )}
                    {status === 'not-started' && (
                      <span
                        className="text-xs rounded-full px-2 py-0.5"
                        style={{ background: 'rgba(255,255,255,0.04)', color: '#555577' }}
                      >
                        Not Started
                      </span>
                    )}
                    {outcomeBadge && (
                      <span
                        className="text-xs rounded-full px-2 py-0.5 font-medium"
                        style={{ background: outcomeBadge.bg, color: outcomeBadge.color }}
                      >
                        {outcomeBadge.label}
                      </span>
                    )}
                  </div>

                  {/* Admin-only: reviewer name (redacted from SUBMITTER) */}
                  {isAdmin && progress.reviewer?.displayName && (
                    <p className="mt-1 text-xs" style={{ color: '#8888A8' }}>
                      Reviewed by {progress.reviewer.displayName}
                    </p>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
