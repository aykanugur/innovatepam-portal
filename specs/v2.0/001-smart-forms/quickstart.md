# Quickstart: Smart Submission Forms

**Feature**: 001-smart-forms
**Date**: 2026-02-25
**Branch**: `001-smart-forms`

This guide walks a developer through the full implementation in the correct dependency order — from database to UI to tests.

---

## Prerequisites

```bash
cd innovatepam-portal
pnpm install          # ensure dependencies are up to date
```

Ensure your `.env.local` has:

```
FEATURE_SMART_FORMS_ENABLED=true   # enable the feature during development
DATABASE_URL=...
DIRECT_URL=...
```

---

## Step 1 — Add Types (`types/field-template.ts`)

Create the `FieldDefinition` interface and `DynamicFields` type (see `data-model.md §3`).
This file has no runtime dependencies — it is the foundational type shared across all layers.

**Verify**: `pnpm tsc --noEmit` passes with no new errors.

---

## Step 2 — Define the Field Template Constant (`constants/field-templates.ts`)

Create the `CATEGORY_FIELD_TEMPLATES` constant:

```typescript
import type { FieldDefinition } from '@/types/field-template'
import type { CategorySlug } from '@/constants/categories'

export const CATEGORY_FIELD_TEMPLATES: Record<CategorySlug, FieldDefinition[]> = {
  'process-improvement': [
    {
      id: 'current_process',
      label: 'Describe the current process',
      type: 'textarea',
      required: true,
    },
    {
      id: 'time_saved_hours_per_week',
      label: 'Estimated time saved (hours/week)',
      type: 'number',
      required: false,
    },
  ],
  'new-product-service': [
    { id: 'target_market', label: 'Target market or audience', type: 'text', required: true },
    {
      id: 'competitive_advantage',
      label: 'Key differentiator vs. alternatives',
      type: 'textarea',
      required: false,
    },
  ],
  'cost-reduction': [
    {
      id: 'current_annual_cost_usd',
      label: 'Current estimated annual cost (USD)',
      type: 'number',
      required: true,
    },
    { id: 'estimated_savings_pct', label: 'Estimated savings (%)', type: 'number', required: true },
  ],
  'employee-experience': [
    {
      id: 'affected_group',
      label: 'Which employee group is affected?',
      type: 'text',
      required: true,
    },
    {
      id: 'pain_level',
      label: 'Current pain level',
      type: 'select',
      required: true,
      options: ['Low', 'Medium', 'High', 'Critical'],
    },
  ],
  'technical-innovation': [
    {
      id: 'problem_being_solved',
      label: 'Technical problem being solved',
      type: 'textarea',
      required: true,
    },
    {
      id: 'proposed_solution_summary',
      label: 'High-level technical approach',
      type: 'textarea',
      required: false,
    },
  ],
}
```

**Verify**: TypeScript enforces all 5 `CategorySlug` keys are present.

---

## Step 3 — Update Prisma Schema and Migrate

In `prisma/schema.prisma`:

1. Add the `CategoryFieldTemplate` model (see `data-model.md §1`).
2. Add `dynamicFields Json?` to the `Idea` model.

Run:

```bash
pnpm prisma migrate dev --name smart_forms
pnpm prisma generate
```

**Verify**: `prisma studio` shows the new `CategoryFieldTemplate` table and `dynamicFields` column on `Idea`.

---

## Step 4 — Extend the Seed Script (`prisma/seed.ts`)

Add a loop that upserts one `CategoryFieldTemplate` record per entry in `CATEGORY_FIELD_TEMPLATES`:

```typescript
import { CATEGORY_FIELD_TEMPLATES } from '@/constants/field-templates'

for (const [slug, fields] of Object.entries(CATEGORY_FIELD_TEMPLATES)) {
  await prisma.categoryFieldTemplate.upsert({
    where: { category: slug },
    update: { fields, version: 1 },
    create: { category: slug, fields, version: 1 },
  })
}
```

Run:

```bash
pnpm prisma:seed
```

**Verify**: `SELECT id, category FROM "CategoryFieldTemplate"` returns exactly 5 rows with correct slug values.

---

## Step 5 — Extend Zod Validation (`lib/validations/idea.ts`)

Add a `buildDynamicFieldsSchema(fields: FieldDefinition[])` helper that constructs the dynamic Zod object schema (see `data-model.md §5`).

**Verify**: Unit test `tests/unit/dynamic-field-schema.test.ts` — required field blank → `ZodError`; `number` field with `"abc"` → `ZodError`; valid payload → parsed object with unknown keys stripped.

---

## Step 6 — Extend the Server Action (`lib/actions/create-idea.ts`)

When `FEATURE_SMART_FORMS_ENABLED=true`:

1. Extract `dynamicFields` from `FormData` (JSON string).
2. Fetch `CategoryFieldTemplate` from DB for the submitted category.
3. Build and apply the dynamic Zod schema.
4. Persist validated `dynamicFields` in the `Idea` create call.
5. Extend `IDEA_CREATED` audit log `metadata` with `dynamicFields`.

When flag is off: ignore `dynamicFields` key entirely.

**Verify**: `tests/integration/create-idea-dynamic.test.ts` — required field missing → `error` returned; valid payload → `Idea` row has correct `dynamicFields` JSON; unknown keys stripped.

---

## Step 7 — Build `DynamicFieldSection` Component (`components/ideas/dynamic-field-section.tsx`)

Client component that renders the appropriate input type based on `FieldDefinition.type`. See `contracts/server-actions.md` for the full prop contract.

Key behaviours:

- `fields = null` → return `null` (nothing rendered).
- `readOnly={true}` → display-only layout (`[Label]: [Value]`).
- WCAG 2.1 AA: `htmlFor`, `aria-required`, `aria-invalid`, `aria-describedby`.

**Verify**: `tests/unit/dynamic-field-section.test.tsx` — render for each field type; keyboard accessible; error display correct.

---

## Step 8 — Update the Submission Form (`components/ideas/idea-form.tsx` + `app/(main)/ideas/new/page.tsx`)

**Page (RSC)**:

1. If `FEATURE_SMART_FORMS_ENABLED=true`: query `CategoryFieldTemplate` for all 5 templates, build `Record<CategorySlug, FieldDefinition[]>`.
2. Pass `templates` prop to `IdeaForm`.

**Form (client component)**:

1. Add `templates` prop (`Record<CategorySlug, FieldDefinition[]> | null`).
2. On category change: reset only the `dynamicFields` state to `{}` (title/description unchanged — FR-004).
3. Render `<DynamicFieldSection fields={templates[selectedCategory] ?? null} .../>` below category selector.
4. Serialize `dynamicFields` to JSON before submitting via `formData.append('dynamicFields', JSON.stringify(dynamicFields))`.

**Verify**: Manual test — select "Cost Reduction" → 2 fields appear; switch to "Technical Innovation" → cost fields gone, tech fields appear.

---

## Step 9 — Update the Detail Page and Admin Review Panel

**`components/ideas/idea-detail.tsx`**:

- Import `DynamicFieldSection` and render with `readOnly={true}`, `fields={templateForCategory}`, `values={idea.dynamicFields ?? {}}`.
- Only render the section when flag on AND `dynamicFields` is non-null and non-empty.

**`components/admin/decision-card.tsx`** (or `review-action-panel.tsx`):

- Same pattern as detail page.

**Verify**: V1 idea (no `dynamicFields`) → no "Additional Details" section; no errors.

---

## Step 10 — Write E2E Tests (`tests/e2e/smart-forms.spec.ts`)

Key scenarios:

1. Select "Cost Reduction" → 2 required fields visible.
2. Submit without filling required fields → inline error; no navigation.
3. Fill and submit → idea detail page shows "Additional Details" with correct values.
4. Flag off → no dynamic fields section on form or detail page.
5. Admin review panel shows same dynamic fields.

```bash
pnpm playwright test tests/e2e/smart-forms.spec.ts
```

---

## Verification Checklist

- [ ] `pnpm tsc --noEmit` — no TypeScript errors
- [ ] `pnpm test` — all unit + integration tests pass; line coverage ≥ 80% on new action logic
- [ ] `pnpm playwright test tests/e2e/smart-forms.spec.ts` — all E2E scenarios pass
- [ ] `SELECT count(*) FROM "CategoryFieldTemplate"` returns `5`
- [ ] V1 idea detail page renders without "Additional Details" section (no errors)
- [ ] `FEATURE_SMART_FORMS_ENABLED=false` → form identical to V1

---

## Rollback

Set `FEATURE_SMART_FORMS_ENABLED=false`. No database rollback required — `dynamicFields` is nullable and the `CategoryFieldTemplate` table is harmless when unused.
