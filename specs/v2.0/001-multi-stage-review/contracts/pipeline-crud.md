# Contract: Pipeline CRUD

**Action file**: `lib/actions/pipeline-crud.ts`
**Type**: Server Actions
**Auth**: SUPERADMIN only (all operations)

---

## 1. createPipeline

### Signature

```ts
async function createPipeline(
  data: CreatePipelineInput
): Promise<{ pipelineId: string } | { error: string; code: string }>
```

### Input Schema

```ts
const StageInputSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(500).optional(),
  order: z.number().int().positive(),
  isDecisionStage: z.boolean(),
})

const CreatePipelineSchema = z.object({
  name: z.string().min(1).max(80),
  categorySlug: z.enum([
    'process-improvement',
    'new-product-service',
    'cost-reduction',
    'employee-experience',
    'technical-innovation',
  ]),
  isDefault: z.boolean().default(false),
  stages: z
    .array(StageInputSchema)
    .min(2, 'Pipeline must have at least 2 stages')
    .superRefine((stages, ctx) => {
      const decisionCount = stages.filter((s) => s.isDecisionStage).length
      if (decisionCount !== 1) {
        ctx.addIssue({ code: 'custom', message: 'Exactly one decision stage required' })
      }
      // validate contiguous order starting at 1
      const orders = stages.map((s) => s.order).sort((a, b) => a - b)
      const expected = Array.from({ length: stages.length }, (_, i) => i + 1)
      if (!orders.every((o, i) => o === expected[i])) {
        ctx.addIssue({ code: 'custom', message: 'Stage orders must be contiguous starting at 1' })
      }
    }),
})
```

### Preconditions

| Check                                   | Error code        |
| --------------------------------------- | ----------------- |
| Current user is SUPERADMIN              | `FORBIDDEN`       |
| No existing pipeline for `categorySlug` | `PIPELINE_EXISTS` |

### On Success

1. Create `ReviewPipeline` row
2. Create all `ReviewPipelineStage` rows (bulk `createMany`)
3. Write `AuditLog`:
   - `action: 'PIPELINE_CREATED'`
   - `metadata: { pipelineId, categorySlug, stageCount: stages.length }`

### Return

```ts
{
  pipelineId: string
}
```

---

## 2. updatePipeline

Handles both metadata updates (name) and stage reconfigurations (add/remove/reorder stages).

### Signature

```ts
async function updatePipeline(
  pipelineId: string,
  data: UpdatePipelineInput
): Promise<{ success: true } | { error: string; code: string }>
```

### Input Schema

```ts
const UpdatePipelineSchema = z.object({
  pipelineId: z.string().cuid(),
  name: z.string().min(1).max(80).optional(),
  stages: z
    .array(
      z.object({
        id: z.string().cuid().optional(), // existing stage ID; undefined = new stage
        name: z.string().min(1).max(60),
        description: z.string().max(500).optional(),
        order: z.number().int().positive(),
        isDecisionStage: z.boolean(),
      })
    )
    .min(2)
    .superRefine(/* same refinements as create */)
    .optional(),
})
```

### Preconditions

| Check                                                                                                      | Error code             |
| ---------------------------------------------------------------------------------------------------------- | ---------------------- |
| Current user is SUPERADMIN                                                                                 | `FORBIDDEN`            |
| Pipeline exists                                                                                            | `PIPELINE_NOT_FOUND`   |
| If stages being updated: no in-flight `IdeaStageProgress` (completedAt = null) for any stage being removed | `STAGE_IN_USE` → 409   |
| Exactly one `isDecisionStage = true` in updated stage list                                                 | `INVALID_STAGE_CONFIG` |

### On Success — Stage Update Strategy

Full-array replace in `$transaction`:

1. Identify stages to remove (existing stage IDs not present in new `stages[]`)
2. For each removed stage: verify no `IdeaStageProgress` rows with `completedAt = null`; if any found → abort with `STAGE_IN_USE`
3. Delete removed stages
4. Upsert remaining stages (update existing by ID, create new ones without ID)
5. Re-sequence `order` fields to be contiguous starting at 1 (match provided order)
6. Update `ReviewPipeline.name` if provided
7. Set `ReviewPipeline.updatedAt = now()` (Prisma handles via `@updatedAt`)
8. Write `AuditLog`:
   - `action: 'PIPELINE_UPDATED'`
   - `metadata: { pipelineId, stagesAdded, stagesRemoved, stagesReordered }`

### Return

```ts
{
  success: true
}
```

---

## 3. deletePipeline

### Signature

```ts
async function deletePipeline(
  pipelineId: string
): Promise<{ success: true } | { error: string; code: string }>
```

### Input Schema

```ts
const DeletePipelineSchema = z.object({
  pipelineId: z.string().cuid(),
})
```

### Preconditions

| Check                                                                                      | Error code              | HTTP analog |
| ------------------------------------------------------------------------------------------ | ----------------------- | ----------- |
| Current user is SUPERADMIN                                                                 | `FORBIDDEN`             | 403         |
| Pipeline exists                                                                            | `PIPELINE_NOT_FOUND`    | 404         |
| `pipeline.isDefault === false`                                                             | `CANNOT_DELETE_DEFAULT` | 403         |
| No `IdeaStageProgress` rows with `completedAt = null` across any of this pipeline's stages | `PIPELINE_IN_USE`       | 409         |

### On Success

1. Delete `ReviewPipeline` row (Prisma Cascade deletes all `ReviewPipelineStage` rows)
2. No audit log entry for pipeline deletion (destructive ops tracked at application log level only)

### Return

```ts
{
  success: true
}
```

---

## Error Codes Summary

| Code                    | Operation(s)   | Meaning                                              |
| ----------------------- | -------------- | ---------------------------------------------------- |
| `FORBIDDEN`             | All            | Not SUPERADMIN                                       |
| `PIPELINE_EXISTS`       | create         | categorySlug already has a pipeline                  |
| `PIPELINE_NOT_FOUND`    | update, delete | Pipeline ID not found                                |
| `STAGE_IN_USE`          | update         | Attempting to remove a stage with active progress    |
| `INVALID_STAGE_CONFIG`  | create, update | Validation failure (decision stage count, order gap) |
| `CANNOT_DELETE_DEFAULT` | delete         | `isDefault = true` pipelines are protected           |
| `PIPELINE_IN_USE`       | delete         | Active in-flight IdeaStageProgress for this pipeline |
| `INTERNAL_ERROR`        | All            | Unexpected DB / runtime error                        |
