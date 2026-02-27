# Contract: completeStage

**Action file**: `lib/actions/complete-stage.ts`
**Type**: Server Action
**Auth**: ADMIN or SUPERADMIN (reviewer who claimed the stage)

---

## Signature

```ts
async function completeStage(
  stageProgressId: string,
  outcome: StageOutcome,
  comment: string
): Promise<{ success: true } | { error: string; code: string }>
```

---

## Input Validation (Zod)

```ts
const CompleteStageSchema = z.object({
  stageProgressId: z.string().cuid(),
  outcome: z.nativeEnum(StageOutcome),
  comment: z.string().min(10).max(2000),
})
```

### Outcome vs stage type cross-validation (Zod refinement)

Applied after base schema parse:

```ts
.superRefine((data, ctx) => {
  // loaded after DB fetch; can't be pure Zod — enforce in action pre-condition instead
})
```

> Outcome/stage-type compatibility is validated as a precondition after loading the stage from DB.

---

## Preconditions

| Check                                                              | Error code           | HTTP analog |
| ------------------------------------------------------------------ | -------------------- | ----------- |
| Feature flag `FEATURE_MULTI_STAGE_REVIEW_ENABLED === 'true'`       | `FEATURE_DISABLED`   | 403         |
| Current user authenticated                                         | `UNAUTHENTICATED`    | 401         |
| `IdeaStageProgress` exists for `stageProgressId`                   | `PROGRESS_NOT_FOUND` | 404         |
| `stageProgress.reviewerId === currentUser.id`                      | `FORBIDDEN`          | 403         |
| `stageProgress.completedAt === null` (not already completed)       | `ALREADY_COMPLETED`  | 409         |
| `stageProgress.startedAt !== null` (stage is active)               | `STAGE_NOT_STARTED`  | 409         |
| Outcome is compatible with stage type:                             |                      |             |
| — `isDecisionStage = false` → only `PASS` or `ESCALATE` allowed    | `INVALID_OUTCOME`    | 422         |
| — `isDecisionStage = true` → only `ACCEPTED` or `REJECTED` allowed | `INVALID_OUTCOME`    | 422         |

---

## On Success — Transaction (`$transaction`)

### Shared (all outcomes)

1. Set `IdeaStageProgress.outcome = outcome`
2. Set `IdeaStageProgress.comment = comment`
3. Set `IdeaStageProgress.completedAt = now()`
4. Write `AuditLog`:
   - `action: 'STAGE_COMPLETED'`
   - `ideaId: stageProgress.ideaId`
   - `userId: currentUser.id`
   - `metadata: { stageId, stageName, outcome, pipelineId }`

### Outcome: `PASS`

5. Load next stage (`order = currentStage.order + 1`) for the same pipeline
6. If next stage exists: set `IdeaStageProgress.startedAt = now()` for that stage row (row already created at claim time)
7. Write `AuditLog`:
   - `action: 'STAGE_STARTED'`
   - `metadata: { stageId: nextStage.id, stageName: nextStage.name, pipelineId }`

### Outcome: `ESCALATE`

5. No next stage activation
6. No extra audit entry (STAGE_COMPLETED written above is sufficient)
7. Result: idea stays `UNDER_REVIEW`, escalation queue shows this progress row

### Outcome: `ACCEPTED`

5. Set `Idea.status = 'ACCEPTED'`
6. Write `AuditLog`:
   - `action: 'IDEA_REVIEWED'`
   - `metadata: { decision: 'ACCEPTED', stageId, via: 'multi-stage-review' }`

### Outcome: `REJECTED`

5. Set `Idea.status = 'REJECTED'`
6. Write `AuditLog`:
   - `action: 'IDEA_REVIEWED'`
   - `metadata: { decision: 'REJECTED', stageId, via: 'multi-stage-review' }`

---

## Return Value

**Success**:

```ts
{
  success: true
}
```

**Errors**:

```ts
{
  error: string
  code: 'FEATURE_DISABLED' |
    'UNAUTHENTICATED' |
    'FORBIDDEN' |
    'PROGRESS_NOT_FOUND' |
    'ALREADY_COMPLETED' |
    'STAGE_NOT_STARTED' |
    'INVALID_OUTCOME' |
    'INTERNAL_ERROR'
}
```

---

## Side Effects

- `IdeaStageProgress` row updated with outcome, comment, completedAt
- Next stage activated (PASS outcome only)
- `Idea.status` updated (ACCEPTED / REJECTED outcomes only)
- 1–2 `AuditLog` rows written

---

## Notes

- SUPERADMIN is allowed to complete a stage **only if they are the `reviewerId`**. Superadmin cannot override a stage completion that belongs to another admin — use `resolveEscalation` for the escalation path.
- When the final stage completes with `ACCEPTED` or `REJECTED` and no ESCALATE state exists, the review flow is fully terminal for this idea.
