# User Story: Dynamic Field Display on Idea Detail & Review

**Story ID**: US-020
**Epic**: EPIC-V2-01 — Smart Submission Forms
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P1 (Must)
**Estimate**: XS
**Sprint**: Phase 2 — Step 4
**Assignee**: Aykan Uğur

---

## Story Statement

**As an** admin or submitter viewing an idea,
**I want to** see the dynamic field answers displayed in the idea detail page and review panel,
**so that** the category-specific information submitted is fully visible during evaluation and after the decision.

---

## Context & Motivation

Submitting dynamic field data (US-019) is only useful if reviewers and submitters can see it. The idea detail page and the admin review panel both need to render `dynamicFields` in a structured, readable format. Ideas with `dynamicFields = null` (V1-era ideas or ideas submitted without smart forms) must render normally without errors.

---

## Acceptance Criteria

1. **Given** an idea with non-null `dynamicFields`,
   **When** the idea detail page (`/ideas/[id]`) is loaded by any authenticated user,
   **Then** a section labelled "Additional Details" appears below the description, rendering each key-value pair from `dynamicFields` as a labelled row.

2. **Given** an admin is reviewing an idea on the review panel,
   **When** `dynamicFields` is non-null,
   **Then** the same "Additional Details" section appears in the review panel — no additional fetch required (included in the idea query).

3. **Given** a V1-era idea with `dynamicFields = null`,
   **When** the idea detail page is loaded,
   **Then** the "Additional Details" section is absent from the page — not an empty box, not a "No additional details" placeholder.

4. **Given** `FEATURE_SMART_FORMS_ENABLED=false`,
   **When** an idea detail page is loaded,
   **Then** the "Additional Details" section is absent — regardless of whether `dynamicFields` has data (for consistency with the disabled-feature state).

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                                             | Expected Behavior                                                                               |
| --- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | `dynamicFields` JSON contains a value that is a stringified HTML tag (e.g., `<script>alert(1)</script>`)             | React escapes all rendered string values by default — no XSS possible                           |
| 2   | `dynamicFields` has a key not matching any current `CategoryFieldTemplate` field (stale data from an older template) | The key-value pair is still rendered — the display layer does not validate against the template |
| 3   | `dynamicFields` is an empty object `{}`                                                                              | The "Additional Details" section is absent — treat the same as `null`                           |

---

## UI / UX Notes

- "Additional Details" section: a `dl` (definition list) with `dt` (label) and `dd` (value) pairs, styled with Tailwind. Each label is `font-medium text-sm text-muted-foreground`; each value is `text-sm`.
- Section header: `<h3 className="text-base font-semibold">Additional Details</h3>` in the idea metadata card.
- No edit button in the detail page — editing dynamic fields is handled via the resume/edit flow (US-029).
- On the admin review panel: render the same "Additional Details" component — reuse, do not duplicate.

---

## Technical Notes

- Create a shared `DynamicFieldsDisplay` React component (`components/ideas/dynamic-fields-display.tsx`) that accepts `dynamicFields: Record<string, unknown> | null` and renders the `dl` or `null`.
- The component checks: if `dynamicFields` is `null` or `Object.keys(dynamicFields).length === 0` → return `null`.
- The idea detail query already joins `dynamicFields` via the `Idea` model — no extra fetch required.
- Feature flag check: wrap the `DynamicFieldsDisplay` render in the feature-flag prop from the server; pass `enabled={FEATURE_SMART_FORMS_ENABLED}` to the component.
- **Feature Flag**: `FEATURE_SMART_FORMS_ENABLED`.

---

## Dependencies

| Dependency                                                          | Type  | Status                      | Blocker? |
| ------------------------------------------------------------------- | ----- | --------------------------- | -------- |
| US-018 — `dynamicFields` column on `Idea`                           | Story | Must be done first          | Yes      |
| US-019 — Dynamic form rendering (produces the `dynamicFields` data) | Story | End-to-end flow requires it | No       |
| US-010 (V1) — Idea detail page (`/ideas/[id]`)                      | Story | Already exists              | No       |

---

## Test Plan

### Manual Testing

- [ ] Submit an idea with dynamic fields → visit idea detail → "Additional Details" section shows correct key-value pairs
- [ ] Visit a V1-era idea detail → no "Additional Details" section present
- [ ] Admin opens review panel → "Additional Details" section correctly shown
- [ ] Set `FEATURE_SMART_FORMS_ENABLED=false` → "Additional Details" absent even for ideas that have `dynamicFields` data

### Automated Testing

- [ ] Unit: `DynamicFieldsDisplay` renders `null` for `dynamicFields = null`
- [ ] Unit: `DynamicFieldsDisplay` renders `null` for `dynamicFields = {}`
- [ ] Unit: `DynamicFieldsDisplay` renders correct `dt`/`dd` pairs for a populated `dynamicFields` object

---

## Definition of Done

- [ ] `DynamicFieldsDisplay` component renders correctly on detail page and review panel
- [ ] V1-era ideas (null dynamic fields) show no additional section — no errors
- [ ] Feature flag gates the section correctly
- [ ] `git commit: feat(smart-forms): dynamic field display on idea detail and review`
