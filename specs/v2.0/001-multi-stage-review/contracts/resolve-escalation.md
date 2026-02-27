# Contract: resolveEscalation

**Action file**: `lib/actions/resolve-escalation.ts`
**Type**: Server Action
**Auth**: SUPERADMIN only

---

## Signature

```ts
async function resolveEscalation(
  stageProgressId: string,
  action: 'PASS' | 'REJECT',
  comment: string
): Promise<{ success: true } | { error: string; code: string }>
```

---

## Input Validation (Zod)

```ts
const ResolveEscalationSchema = z.object({
  stageProgressId: z.string().cuid(),
  action: z.enum(['PASS', 'REJECT']),
  comment: z.string().min(10).max(2000),
})
```

---

## Preconditions

| Check                                                                   | Error code           | HTTP analog |
| ----------------------------------------------------------------------- | -------------------- | ----------- |
| Feature flag `FEATURE_MULTI_STAGE_REVIEW_ENABLED === 'true'`            | `FEATURE_DISABLED`   | 403         |
| Current user authenticated                                              | `UNAUTHENTICATED`    | 401         |
| Current user role is SUPERADMIN                                         | `FORBIDDEN`          | 403         |
| `IdeaStageProgress` exists                                              | `PROGRESS_NOT_FOUND` | 404         |
| `stageProgress.outcome === 'ESCALATE'`                                  | `NOT_ESCALATED`      | 409         |
| `stageProgress.completedAt` is set (the escalate was formally recorded) | `STAGE_INCOMPLETE`   | 409         |
| Idea status is still `UNDER_REVIEW` (not already accepted/rejected)     | `INVALID_STATUS`     | 409         |

---

## On Success — Transaction (`$transaction`)

### Action: `PASS`

1. Load next stage (`order = escalatedStage.order + 1`) for the pipeline
2. If next stage exists:
   - Set `IdeaStageProgress.startedAt = now()` for that stage row
   - Write `AuditLog`:
     - `action: 'STAGE_STARTED'`
     - `metadata: { stageId: nextStage.id, stageName: nextStage.name, pipelineId, escalationResolution: 'PASS' }`
3. If no next stage exists (escalated stage was the last one):
   - Set `Idea.status = 'ACCEPTED'`
   - Write `AuditLog`:
     - `action: 'IDEA_REVIEWED'`
     - `metadata: { decision: 'ACCEPTED', via: 'escalation-resolution', escalationResolution: 'PASS' }`
4. Write a **new** `IdeaStageProgress` resolution record:
   - Create a synthetic progress record for the escalation resolver with comment
   - OR: Add resolution metadata as additional `AuditLog` entry (preferred, no extra model needed)
   - Chosen approach: Write `AuditLog` with `action: 'STAGE_COMPLETED'`, `userId: currentUser.id`, `metadata: { resolution: 'PASS', comment, stageProgressId, resolvedBy: 'SUPERADMIN' }`

### Action: `REJECT`

1. Set `Idea.status = 'REJECTED'`
2. Write `AuditLog`:
   - `action: 'IDEA_REVIEWED'`
   - `ideaId`
   - `userId: currentUser.id`
   - `metadata: { decision: 'REJECTED', via: 'escalation-resolution', comment, escalationResolution: 'REJECT' }`
3. Write `AuditLog`:
   - `action: 'STAGE_COMPLETED'`
   - `metadata: { resolution: 'REJECT', comment, stageProgressId, resolvedBy: 'SUPERADMIN' }`

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
  error: string;
  code:
    | 'FEATURE_DISABLED'
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'PROGRESS_NOT_FOUND'
    | 'NOT_ESCALATED'
    | 'STAGE_INCOMPLETE'
    | 'INVALID_STATUS'
    | 'INTERNAL_ERROR'
}
```

---

## Queue Display

To populate the escalation queue UI:

```ts
// Escalation queue query:
prisma.ideaStageProgress.findMany({
  where: { outcome: 'ESCALATE' },
  include: { idea: true, stage: { include: { pipeline: true } }, reviewer: true },
  orderBy: { completedAt: 'asc' }, // oldest escalation first
})
```

---

## Notes

- SUPERADMIN cannot re-claim the stage as their own reviewer. The resolution action is purely an approval gateway decision (PASS = forward to next stage or accept; REJECT = reject idea).
- SUPERADMIN cannot undo a resolved escalation.
- After resolution, the SUPERADMIN is not assigned as `reviewerId` on any `IdeaStageProgress` row — only ADMIN reviewers can own stages. Resolution is tracked solely via `AuditLog`.
