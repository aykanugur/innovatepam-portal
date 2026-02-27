# Contract: Server Actions — Smart Submission Forms

**Feature**: 001-smart-forms
**Date**: 2026-02-25

This document defines the interface contracts for the Server Actions added or modified by this feature. These are the boundaries between the client-form layer and the persistence layer.

---

## Modified Action: `createIdeaAction`

**File**: `innovatepam-portal/lib/actions/create-idea.ts`

### Inputs

The action receives a `FormData` object. With `FEATURE_SMART_FORMS_ENABLED=true`, it handles two additional fields:

| FormData key    | Type                                       | Required | Description                                                                          |
| --------------- | ------------------------------------------ | -------- | ------------------------------------------------------------------------------------ |
| `title`         | `string`                                   | Yes      | 1–100 characters (unchanged from V1)                                                 |
| `description`   | `string`                                   | Yes      | 1–2000 characters (unchanged from V1)                                                |
| `category`      | `CategorySlug`                             | Yes      | Kebab-case slug from `CATEGORIES` constant                                           |
| `visibility`    | `'PUBLIC' \| 'PRIVATE'`                    | Yes      | (unchanged from V1)                                                                  |
| `dynamicFields` | `string` (JSON-serialized `DynamicFields`) | No       | Serialized key-value map of dynamic field values; absent or ignored when flag is off |

### Outputs

```typescript
type CreateIdeaResult =
  | { id: string; error?: never } // success — client redirects to /ideas/<id>
  | { error: string; id?: never } // validation or server error
```

### Behaviour Contract

1. **Flag off** (`FEATURE_SMART_FORMS_ENABLED !== 'true'`): `dynamicFields` key in `FormData` is ignored entirely; `Idea.dynamicFields` is written as `null`. All other behaviour is identical to V1.

2. **Flag on, category has a template**:
   - Parse `dynamicFields` from JSON string; if parse fails → `{ error: 'Invalid dynamic fields format.' }`.
   - Fetch `CategoryFieldTemplate` for the submitted category slug.
   - Construct dynamic Zod schema from template fields (see data-model.md §5 Validation Rules).
   - Validate parsed object against dynamic schema; strip unknown keys (FR-018).
   - On validation failure → return `{ error: '[Field Label] is required.' }` (first failing field).
   - On success → write validated `dynamicFields` map to `Idea.dynamicFields`.
   - Extend `IDEA_CREATED` audit log `metadata` with `{ ...(existingMeta), dynamicFields: validatedMap }` (FR-012).

3. **Flag on, category has no template**:
   - Skip dynamic field validation; write `Idea.dynamicFields = null`.

### Error Response Catalogue

| Scenario                                       | Response                                                 |
| ---------------------------------------------- | -------------------------------------------------------- |
| Required dynamic field blank / whitespace-only | `{ error: '[Label] is required.' }`                      |
| `text` field exceeds 255 chars                 | `{ error: '[Label] must be 255 characters or fewer.' }`  |
| `textarea` field exceeds 2000 chars            | `{ error: '[Label] must be 2000 characters or fewer.' }` |
| `number` field non-numeric                     | `{ error: '[Label] must be a number.' }`                 |
| `select` field not in options                  | `{ error: '[Label] contains an invalid selection.' }`    |
| `dynamicFields` JSON unparseable               | `{ error: 'Invalid dynamic fields format.' }`            |
| All other V1 errors                            | Unchanged from existing `createIdeaAction` contract      |

---

## New Component Prop Contract: `DynamicFieldSection`

**File**: `innovatepam-portal/components/ideas/dynamic-field-section.tsx`

This client component is the primary UI contract for rendering and collecting dynamic field values.

### Props

```typescript
interface DynamicFieldSectionProps {
  /** The field definitions for the currently selected category. Null → render nothing. */
  fields: FieldDefinition[] | null

  /** Current controlled values for this section. Keys are FieldDefinition.id. */
  values: Record<string, string | number>

  /** Called on every field change; parent merges into its form state. */
  onChange: (values: Record<string, string | number>) => void

  /**
   * Initial values for pre-populating fields (e.g., on draft resume — EPIC-V2-03).
   * Optional; defaults to empty map.
   */
  initialValues?: Record<string, string | number>

  /**
   * Validation errors keyed by field ID.
   * Passed from parent form's error state after server-side validation failure.
   */
  errors?: Record<string, string>

  /** Whether the section is in read-only display mode (detail page, review panel). */
  readOnly?: boolean
}
```

### Behaviour Contract

- When `fields` is `null` or `[]`: renders nothing (section absent from DOM).
- When `readOnly={true}`: renders each field as `[Label]: [Value]` text; no inputs.
- `textarea` values in read-only mode: whitespace and newlines are preserved (`white-space: pre-wrap`).
- WCAG 2.1 AA: each input has `<label htmlFor>`, `aria-required`, `aria-invalid`, `aria-describedby` pointing to error `<p id>`.
- `onChange` is called with the full updated map on every keystroke / selection change.

---

## Read-Only Contract: `AdditionalDetailsSection`

**Used on**: idea detail page (`/ideas/[id]`), admin review panel

Same as `DynamicFieldSection` with `readOnly={true}`, plus:

- Section is rendered only when `idea.dynamicFields != null && Object.keys(idea.dynamicFields).length > 0` AND `FEATURE_SMART_FORMS_ENABLED=true`.
- Section heading: `"Additional Details"` (not "for [Category]" in read-only mode).
- Missing field label fallback: if a stored field ID has no matching `FieldDefinition` in the current template (schema drift), render as `{fieldId}: {value}` with no special formatting.
