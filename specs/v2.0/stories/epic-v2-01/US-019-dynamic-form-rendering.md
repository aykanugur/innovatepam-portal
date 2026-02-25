# User Story: Dynamic Form Rendering on Idea Submission

**Story ID**: US-019
**Epic**: EPIC-V2-01 — Smart Submission Forms
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: S
**Sprint**: Phase 2 — Step 3
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** submitter,
**I want to** see category-specific input fields appear automatically when I select a category on the idea submission form,
**so that** I can provide the structured information reviewers need without seeing irrelevant fields.

---

## Context & Motivation

The V1 submission form gives every category the same fields. Reviewers must infer missing details or request follow-up. Dynamic fields remove this gap — a "Process Improvement" idea shows different follow-up questions than a "Technical Innovation" idea. The submitter experience should be seamless: selecting a category triggers a smooth field transition with no page reload.

---

## Acceptance Criteria

1. **Given** `FEATURE_SMART_FORMS_ENABLED=true`,
   **When** I open the idea submission form at `/ideas/new`,
   **Then** a "Category" select is the first field, and no dynamic fields are displayed until a category is selected.

2. **Given** I select a category (e.g., "Technical Innovation"),
   **When** the selection is made,
   **Then** the dynamic fields for that category (fetched from `CategoryFieldTemplate`) appear below the core fields without a page reload — the transition is animated (fade-in).

3. **Given** I have filled in dynamic fields for "Technical Innovation" and then change the category to "Process Improvement",
   **When** the category changes,
   **Then** the previous dynamic fields are cleared and the new category's fields are rendered; a confirmation toast appears: "Changing category will clear your category-specific answers."

4. **Given** a required dynamic field is left empty,
   **When** I submit the form,
   **Then** I see an inline validation error below the empty field before the Server Action is called.

5. **Given** `FEATURE_SMART_FORMS_ENABLED=false`,
   **When** I open the idea submission form,
   **Then** no dynamic fields appear — the form is identical to the V1 submission form.

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                   | Expected Behavior                                                                                                                            |
| --- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | The `CategoryFieldTemplate` fetch fails (network error)                                    | The form falls back to the V1 static form for that category; an inline notice: "Additional fields unavailable. Submit using core fields."    |
| 2   | A `select` type dynamic field has an empty `options` array                                 | The field is rendered as a disabled select with placeholder "No options available"; it is treated as optional regardless of `required: true` |
| 3   | User submits with more than 50 dynamic field answers (unusual edge case via API tampering) | Server Zod schema limits `dynamicFields` object to max 20 keys; excess keys stripped                                                         |

---

## UI / UX Notes

- Route: `/ideas/new`
- Dynamic fields render in a visually distinct section below the core fields, labelled "Additional Details for [Category Name]"
- Field types map to shadcn/ui components: `text` → `Input`, `textarea` → `Textarea`, `number` → `Input type="number"`, `select` → `Select`
- Category change confirmation — use a shadcn `AlertDialog`, not a native `window.confirm`
- Animation: `transition-all duration-200 ease-in-out` on the dynamic fields wrapper div
- Progress indicator: "Step 1 of 2 — Core Details / Step 2 — Category Details" is optional and not required for V2.0

---

## Technical Notes

- Fetch `CategoryFieldTemplate` for the selected category using a Server Action `getCategoryTemplate(category: IdeaCategory)` — called client-side on category change (use `startTransition` to avoid blocking the form).
- Build the dynamic Zod schema client-side from the template `fields` array — use `z.object()` with dynamic entries for `useForm` validation.
- Do not use `react-hook-form` re-registration for dynamic fields — reset the form section and register fresh fields on category change.
- The `dynamicFields` payload is merged with the core fields object in the `createIdea` Server Action call.
- **Feature Flag**: `FEATURE_SMART_FORMS_ENABLED` — wrap the dynamic section in a feature flag check on the server; client does not receive templates when flag is `false`.

---

## Dependencies

| Dependency                                    | Type  | Status             | Blocker? |
| --------------------------------------------- | ----- | ------------------ | -------- |
| US-017 — `CategoryFieldTemplate` model + seed | Story | Must be done first | Yes      |
| US-018 — `dynamicFields` column on `Idea`     | Story | Must be done first | Yes      |

---

## Test Plan

### Manual Testing

- [ ] Select "Technical Innovation" → correct dynamic fields appear
- [ ] Switch category → confirmation dialog appears → fields clear → new category fields appear
- [ ] Leave required dynamic field empty → inline validation error on submit
- [ ] Set `FEATURE_SMART_FORMS_ENABLED=false` → no dynamic fields, form identical to V1

### Automated Testing

- [ ] Unit: dynamic Zod schema built from template correctly validates required fields
- [ ] Integration: `getCategoryTemplate` Server Action returns correct `fields` array for each category
- [ ] E2E: submit idea with dynamic fields → idea detail page shows submitted dynamic values

---

## Definition of Done

- [ ] Category select triggers dynamic field render without page reload
- [ ] Category change shows confirmation and clears previous answers
- [ ] Required dynamic field validation blocks submission
- [ ] Feature flag disables dynamic fields entirely
- [ ] `git commit: feat(smart-forms): dynamic field rendering on idea submission`
