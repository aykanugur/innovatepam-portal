# Data Model: Smart Submission Forms

**Feature**: 001-smart-forms
**Date**: 2026-02-25
**Source**: PRD V2.0 §5.3 + research.md findings

---

## 1. New Model: CategoryFieldTemplate

**Purpose**: Stores the set of structured input fields for each idea category. Seeded at deploy time from `constants/field-templates.ts`.

### Prisma Definition

```prisma
model CategoryFieldTemplate {
  id        String   @id @default(cuid())
  category  String   // CategorySlug value — matches Idea.category exactly (e.g., "process-improvement")
  fields    Json     // Array<FieldDefinition> — see type definition below
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([category])
}
```

### Schema Notes

- `category` uses the **slug** format (e.g., `process-improvement`), not the display label — confirmed in research.md Finding 1.
- `@@unique([category])` enforces at most one template per category; enables idempotent `upsert` in the seed.
- `fields` stores a serialised `FieldDefinition[]` array; the TypeScript type is the authoritative contract (see section 3).
- `version` is reserved for future in-place template migrations; default `1` for all V2.0 seeds.

---

## 2. Idea Model Extension

**Change**: Add one nullable column to the existing `Idea` model.

```prisma
// Existing Idea model — add this field:
dynamicFields Json? // key → value map of submitted dynamic field data; null for V1 ideas
```

### Schema Note

- Column type is `jsonb` in PostgreSQL (Prisma `Json` → `jsonb`).
- `null` = pre-V2.0 idea with no dynamic data; rendered cleanly on all pages without a section.
- `{}` empty object = V2.0 idea in a category with no template or all optional fields skipped. Treated identically to `null` on the read path.
- Values are keyed by `FieldDefinition.id` (string slug, e.g., `current_process`).

---

## 3. TypeScript Types (`types/field-template.ts`)

```typescript
/** Supported input types for a dynamic field. */
export type FieldType = 'text' | 'textarea' | 'number' | 'select'

/** A single field definition within a CategoryFieldTemplate. */
export interface FieldDefinition {
  id: string // kebab-case slug, unique within the template (e.g., "current_process")
  label: string // Display label shown above the input
  type: FieldType
  required: boolean
  options?: string[] // Only present and non-empty for type === 'select'
}

/** The stored value type for a single dynamic field entry. */
export type DynamicFieldValue = string | number

/**
 * The shape stored in Idea.dynamicFields (key → value map).
 * Keys are FieldDefinition.id values for the submitted category's template.
 * Optional fields omitted by the submitter are absent from the map (not null-keyed).
 */
export type DynamicFields = Record<string, DynamicFieldValue>
```

---

## 4. Seeded Field Templates (`constants/field-templates.ts`)

Authoritative source for all 5 category templates. The seed script reads from this constant.

| Category Slug          | Field ID                    | Label                               | Type       | Required |
| ---------------------- | --------------------------- | ----------------------------------- | ---------- | -------- |
| `process-improvement`  | `current_process`           | Describe the current process        | `textarea` | Yes      |
| `process-improvement`  | `time_saved_hours_per_week` | Estimated time saved (hours/week)   | `number`   | No       |
| `new-product-service`  | `target_market`             | Target market or audience           | `text`     | Yes      |
| `new-product-service`  | `competitive_advantage`     | Key differentiator vs. alternatives | `textarea` | No       |
| `cost-reduction`       | `current_annual_cost_usd`   | Current estimated annual cost (USD) | `number`   | Yes      |
| `cost-reduction`       | `estimated_savings_pct`     | Estimated savings (%)               | `number`   | Yes      |
| `employee-experience`  | `affected_group`            | Which employee group is affected?   | `text`     | Yes      |
| `employee-experience`  | `pain_level`                | Current pain level                  | `select`   | Yes      |
| `technical-innovation` | `problem_being_solved`      | Technical problem being solved      | `textarea` | Yes      |
| `technical-innovation` | `proposed_solution_summary` | High-level technical approach       | `textarea` | No       |

`pain_level` select options: `['Low', 'Medium', 'High', 'Critical']`

---

## 5. Validation Rules

### Server-Side (Zod — built dynamically per submitted category)

| Field Type | Validation Applied                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `text`     | `z.string().min(1, '[Label] is required.')` (if required); `z.string().max(255, '[Label] must be 255 characters or fewer.')` always   |
| `textarea` | `z.string().min(1, '[Label] is required.')` (if required); `z.string().max(2000, '[Label] must be 2000 characters or fewer.')` always |
| `number`   | `z.coerce.number({ invalid_type_error: '[Label] must be a number.' })`; `.optional()` if not required                                 |
| `select`   | `z.enum([...options], { invalid_type_error: '[Label] contains an invalid selection.' })`; `.optional()` if not required               |

Blank value definition (FR-005): empty string or whitespace-only string after `.trim()` is treated as absent. Required fields fail with `"[Label] is required."` when blank.

Unknown keys in the submitted payload are stripped via `.strip()` on the dynamic Zod object schema (FR-018).

---

## 6. State Transitions

Dynamic fields on the `Idea` model participate in the following state transitions:

| Event                                                       | `dynamicFields` state                                                       |
| ----------------------------------------------------------- | --------------------------------------------------------------------------- |
| V1 idea (created before migration)                          | `null` — permanent, no change                                               |
| V2.0 idea submitted (flag on, category has template)        | `{ fieldId: value, ... }` — set on creation                                 |
| V2.0 idea submitted (flag off, or category has no template) | `null` — not populated                                                      |
| Draft saved (EPIC-V2-03)                                    | Persisted as-is alongside other draft fields                                |
| Draft resumed                                               | Restored to form `initialValues`; category switch resets to `{}` per FR-004 |
| Idea accepted/rejected                                      | No change to `dynamicFields`                                                |

---

## 7. Migration Notes

- Single migration: add `CategoryFieldTemplate` table + add `dynamicFields` column to `Idea`.
- `dynamicFields` is nullable — zero backfill required; existing rows remain untouched.
- `CategoryFieldTemplate` starts empty; populated exclusively by the seed script.
- Seed command: `pnpm prisma:seed` (runs `tsx prisma/seed.ts`); uses `upsert` on `category` — idempotent on re-run.
