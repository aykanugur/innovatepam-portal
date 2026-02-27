# Contract: claimStage

**Action file**: `lib/actions/claim-stage.ts`
**Type**: Server Action
**Auth**: ADMIN or SUPERADMIN

---

## Signature

```ts
async function claimStage(
  ideaId: string
): Promise<{ stageProgressId: string } | { error: string; code: string }>
```

---

## Input Validation (Zod)

```ts
const ClaimStageSchema = z.object({
  ideaId: z.string().cuid(),
})
```

---

## Preconditions

| Check                                                               | Error code           | HTTP analog |
| ------------------------------------------------------------------- | -------------------- | ----------- |
| Feature flag `FEATURE_MULTI_STAGE_REVIEW_ENABLED === 'true'`        | `FEATURE_DISABLED`   | 403         |
| Current user authenticated                                          | `UNAUTHENTICATED`    | 401         |
| Current user role is ADMIN or SUPERADMIN                            | `FORBIDDEN`          | 403         |
| Idea exists                                                         | `IDEA_NOT_FOUND`     | 404         |
| `idea.status === 'SUBMITTED'`                                       | `INVALID_STATUS`     | 409         |
| Pipeline exists for `idea.categorySlug`                             | `PIPELINE_NOT_FOUND` | 409         |
| No existing `IdeaStageProgress` for this idea (not already claimed) | `ALREADY_CLAIMED`    | 409         |

---

## On Success — Transaction (`$transaction`)

All steps run atomically:

1. **Load pipeline** with stages ordered by `order ASC`
2. **Create `IdeaStageProgress` rows** for every stage in the pipeline:
   - All rows: `ideaId`, `stageId`, `outcome = null`, `startedAt = null`
   - Stage 1 only: `reviewerId = currentUser.id`, `startedAt = now()`
3. **Update `Idea.status`** → `UNDER_REVIEW`
4. **Write AuditLog** entry:
   - `action: 'STAGE_STARTED'`
   - `ideaId`
   - `userId: currentUser.id`
   - `metadata: { stageId: stage1.id, stageName: stage1.name, pipelineId: pipeline.id }`
5. **Write AuditLog** entry:
   - `action: 'IDEA_REVIEW_STARTED'`
   - `ideaId`
   - `userId: currentUser.id`
   - `metadata: { via: 'multi-stage-review' }`

---

## Return Value

**Success**:

```ts
{
  stageProgressId: string
} // IdeaStageProgress.id for Stage 1
```

**Errors** (matched by `code`):

```ts
{
  error: string
  code: 'FEATURE_DISABLED' |
    'UNAUTHENTICATED' |
    'FORBIDDEN' |
    'IDEA_NOT_FOUND' |
    'INVALID_STATUS' |
    'PIPELINE_NOT_FOUND' |
    'ALREADY_CLAIMED' |
    'INTERNAL_ERROR'
}
```

---

## Side Effects

- `Idea.status` changes to `UNDER_REVIEW`
- `IdeaStageProgress` rows created for every stage
- 2 `AuditLog` rows written
- No email sent at claim time

---

## Notes

- Pipeline version is snapshotted by FK at claim time: `stageId` points to the exact `ReviewPipelineStage` row. If the pipeline is later reordered, existing in-flight progress rows are unaffected.
- Only Stage 1 is activated. Subsequent stages become active when the previous stage receives a `PASS` outcome.
