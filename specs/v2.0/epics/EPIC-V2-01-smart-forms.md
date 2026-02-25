# Epic: Smart Submission Forms

**Epic ID**: EPIC-V2-01
**Owner**: Aykan Uğur — Admin
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Target Release**: V2.0 Phase 2 (~30 min)
**PRD Reference**: [specs/v2.0/prd-v2.0.md](../prd-v2.0.md) — Section 5

---

## 1. Summary

Extend the idea submission form to display context-relevant, category-specific additional fields when a user selects a category. Dynamic field templates are seeded per category (10 fields across 5 categories). Values are stored as a JSON map on the `Idea` model. V1 ideas with no dynamic data are handled gracefully. Admin pipeline review sees the structured fields alongside the standard title and description.

---

## 2. Business Context

### 2.1 Strategic Alignment

- **Company Goal**: Improve the quality and completeness of submitted ideas in V2.0.
- **Product Vision Fit**: Structured, category-specific data reduces the time admins spend parsing free-text descriptions, and makes analytics more actionable across idea categories.

### 2.2 Business Value

| Value Driver        | Description                                                                                 | Estimated Impact                    |
| ------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------- |
| Submission quality  | Relevant context fields prompt employees to provide quantified data (e.g. cost, time saved) | Reduces reviewer ambiguity per idea |
| Review efficiency   | Structured fields allow admins to scan key metrics at a glance                              | Saves ~1–2 min per review           |
| Analytics readiness | Quantified fields (number types) can be aggregated in future analytics phases               | Enables Phase 7+ scoring context    |

### 2.3 Cost of Delay

Without smart forms, all ideas remain free-text only. Review quality degrades as submission volume grows — submitters with no field prompts consistently omit critical evidence (e.g., cost figures, affected team size), forcing reviewers to ask follow-up questions outside the platform.

---

## 3. Scope

### 3.1 In Scope

- `CategoryFieldTemplate` Prisma model and seed data for all 5 categories (10 fields total)
- `dynamicFields Json?` column added to the `Idea` model
- Submission form (`/ideas/new`): dynamic field section renders below the category selector; updates without page reload when category changes
- Supported field types: `text`, `textarea`, `number`, `select`
- Client-side and server-side validation for required dynamic fields
- Idea detail page and admin review panel: display filled dynamic fields in a labelled section; hide the section for V1 ideas with `dynamicFields = null`
- Feature flag: `FEATURE_SMART_FORMS_ENABLED` (default `false`)

### 3.2 Out of Scope

- Admin UI to create or edit field templates (deferred to V3.0 — templates are seeded at deploy time)
- Dependent/conditional fields (e.g., showing field B only when field A has a specific value)
- Free-form category creation or custom categories
- Retroactive backfill of `dynamicFields` for V1 ideas

### 3.3 Assumptions

- All 5 category names match exactly: `Process Improvement`, `New Product/Service`, `Cost Reduction`, `Employee Experience`, `Technical Innovation`
- The field template seed is defined as a TypeScript constant in `constants/` and consumed by `prisma/seed.ts`
- `FEATURE_SMART_FORMS_ENABLED=false` in production until QA sign-off

---

## 4. User Personas

| Persona          | Role          | Primary Need                                                                                              |
| ---------------- | ------------- | --------------------------------------------------------------------------------------------------------- |
| Elif (Submitter) | EPAM employee | Be prompted with the right fields for my idea's category so I don't need to guess what context to include |
| Deniz (Admin)    | Innovation PM | See structured, labelled field values per idea during review — not buried in a wall of description text   |

---

## 5. Feature Breakdown

### Feature 1: `CategoryFieldTemplate` Seed & Model — Must Have

**Description**: Create the `CategoryFieldTemplate` Prisma model and seed it with the 10 default fields across 5 categories as defined in PRD Section 5.2.

**User Stories**:

- [ ] As a developer, I can run `prisma migrate dev` and `tsx prisma/seed.ts` to have all 5 category templates in the database.
- [ ] As the system, I can query `CategoryFieldTemplate` by category name to return the field list for a given submission.

**Acceptance Criteria**:

1. `CategoryFieldTemplate` model exists with fields: `id`, `category` (unique), `fields` (Json), `version`, `createdAt`, `updatedAt`
2. After running seed, `SELECT * FROM "CategoryFieldTemplate"` returns exactly 5 rows — one per category
3. Each row's `fields` JSON array contains the correct fields per PRD Section 5.2 (field id, label, type, required, options where applicable)
4. Attempting to seed a duplicate category triggers a unique constraint violation (seed is idempotent with `upsert`)

**Estimated Effort**: XS (~10 min)

---

### Feature 2: `dynamicFields` Column on `Idea` — Must Have

**Description**: Add `dynamicFields Json?` to the `Idea` Prisma model. Run and verify migration. No backfill required — column is nullable.

**User Stories**:

- [ ] As the system, new idea submissions store dynamic field values as a JSON key-value object in `dynamicFields`.
- [ ] As the system, V1 ideas with `dynamicFields = null` render without errors on detail and review pages.

**Acceptance Criteria**:

1. `prisma migrate dev` runs without errors; the `Idea` table gains a nullable `dynamicFields` column of type `jsonb`
2. Existing V1 idea rows are unaffected (`dynamicFields` is `NULL` for all pre-migration records)
3. A new idea submission with dynamic fields stores a valid JSON object, e.g. `{ "current_process": "...", "time_saved_hours_per_week": 4 }`
4. A new idea submission for a category with no template stores `dynamicFields = null`

**Estimated Effort**: XS (~5 min)

---

### Feature 3: Dynamic Field Section in Submission Form — Must Have

**Description**: On `/ideas/new`, after the user selects a category, the form renders a "Additional Details" section with the category's field template. Fields update instantly on category change. Required fields are validated on submit.

**User Stories**:

- [ ] US-V2-01-a: As a submitter, when I select "Cost Reduction," I see "Current Estimated Annual Cost (USD)" and "Estimated Savings (%)" fields appear below.
- [ ] US-V2-01-b: As a submitter, if I switch from "Cost Reduction" to "Technical Innovation," the cost fields disappear and the technical fields appear; my previously entered values are discarded.
- [ ] US-V2-01-c: As a submitter, if I leave a required dynamic field blank and click "Submit," I see a field-level inline error.
- [ ] US-V2-01-d: As a submitter, with `FEATURE_SMART_FORMS_ENABLED=false`, I see the standard V1 form with no dynamic fields.

**Acceptance Criteria**:

1. Selecting a category causes the dynamic fields section to render without a full page reload
2. Category change discards previously entered dynamic values (form state resets for that section only)
3. A required dynamic field left empty on submit: server returns `422` with a field-level error `"[Field Label] is required."`; form is not submitted
4. `select` type fields render as a `<select>` dropdown with the options from the template
5. `number` type fields render as `<input type="number">`; non-numeric API input is rejected with `400`
6. When `FEATURE_SMART_FORMS_ENABLED=false`, the dynamic fields section is entirely absent from the form

**Estimated Effort**: S (~15 min)

---

### Feature 4: Dynamic Fields Display on Idea Detail & Review Panel — Must Have

**Description**: The idea detail page (`/ideas/[id]`) and the admin review panel show an "Additional Details" section with labelled field values when `dynamicFields` is non-null. Section is hidden for V1 ideas.

**User Stories**:

- [ ] US-V2-01-e: As a submitter or admin viewing a submitted idea with dynamic fields, I see each field rendered with its label and the entered value.
- [ ] US-V2-01-f: As an admin viewing a V1 idea (no dynamic fields), the "Additional Details" section does not appear and no error is thrown.

**Acceptance Criteria**:

1. Idea detail page renders an "Additional Details" section when `dynamicFields !== null`
2. Each field is displayed as `[Label]: [Value]`, preserving line breaks for `textarea` type fields
3. For V1 ideas (`dynamicFields = null`), the section is absent — no empty card, no "null" text
4. The admin review panel mirrors the same display logic

**Estimated Effort**: XS (~5 min)

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)

| Dependency                                                      | Type          | Status   | Risk |
| --------------------------------------------------------------- | ------------- | -------- | ---- |
| EPIC-01 (Foundation) — Prisma, DB, seed infrastructure          | V1            | Complete | None |
| EPIC-03 (Idea Submission) — `/ideas/new` form and Server Action | V1            | Complete | None |
| PRD V2.0 Section 5 — field template definitions                 | Internal spec | Approved | Low  |

### 6.2 Blocking (Downstream)

| Dependent Epic                  | Impact if EPIC-V2-01 is Delayed                                                                                             |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| EPIC-V2-02 (Multi-Media)        | No blocking dependency; can develop in parallel                                                                             |
| EPIC-V2-04 (Multi-Stage Review) | Review panel improvements in EPIC-V2-04 must account for the dynamic fields section layout                                  |
| EPIC-V2-06 (Scoring)            | Scoring criteria tags (Phase 7) are conceptually linked to category context — nice-to-have awareness only, not a hard block |

---

## 7. UX / Design

- **Dynamic field section header**: "Additional Details for [Category Name]" — appears below the category selector, above the file attachment section.
- **Transition**: Section fades in/out on category change (CSS transition, no animation library required).
- **Field layout**: Single-column, full-width fields (same width as description textarea). Labels above inputs.
- **Error state**: Inline red error text below the field, consistent with V1 form validation style.
- **Empty state (V1 ideas)**: No section rendered — do not show an empty card or a "No additional details" placeholder.
- **No design mockup required** — follow existing shadcn/ui form field patterns already in use on `/ideas/new`.

---

## 8. Technical Notes

- `CategoryFieldTemplate.fields` stores a `Json` array typed as `Array<{ id: string; label: string; type: "text" | "textarea" | "number" | "select"; required: boolean; options?: string[] }>`. Define this interface in `types/` or `lib/validations/`.
- The submission Server Action must retrieve the `CategoryFieldTemplate` for the submitted category and validate each field's value against the template definition using Zod before persisting.
- Use Zod's `z.coerce.number()` for `number` type fields to safely handle string-to-number coercion from form data.
- The field template is fetched server-side as part of the submission form's page load (RSC). Do not fetch on the client; pass the template as a prop to the client form component.
- Seed uses `prisma.categoryFieldTemplate.upsert({ where: { category: ... }, ... })` to be idempotent across re-runs.

---

## 9. Milestones & Timeline

| Milestone           | Features Included | Target                           | Exit Criteria                                                                                           |
| ------------------- | ----------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| M1 — DB Layer       | Features 1 & 2    | Phase 2 start                    | Migration applied; seed runs without error; DB has 5 template rows                                      |
| M2 — Form & Display | Features 3 & 4    | Phase 2 complete (~30 min total) | Dynamic fields render correctly for all 5 categories; V1 ideas unaffected; feature flag toggles cleanly |

---

## 10. Success Metrics

| Metric                             | Target                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| All 5 category templates seeded    | 5 rows in `CategoryFieldTemplate` after seed                          |
| Required field validation enforced | Server returns `422` when required dynamic field is blank             |
| V1 backward compatibility          | Zero errors on idea detail page for ideas with `dynamicFields = null` |
| Feature flag isolation             | With `FEATURE_SMART_FORMS_ENABLED=false`, form is identical to V1     |
| Test coverage                      | ≥ 80% line coverage on new Server Action logic and seed               |

---

## 11. Risks & Mitigations

| #   | Risk                                                                                                 | Likelihood | Impact | Mitigation                                                                                                           |
| --- | ---------------------------------------------------------------------------------------------------- | ---------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Category name mismatch between `CategoryFieldTemplate.category` and `Idea.category` values in the DB | Med        | High   | Enforce exact string match via Zod enum validation at both the template seed level and the submission Server Action  |
| 2   | Form state reset on category switch unexpectedly clears standard fields (title, description)         | Low        | High   | Reset only the `dynamicFields` portion of the form state; use a dedicated controlled sub-state for dynamic fields    |
| 3   | `fields` JSON column stores invalid schema (missing `id` or `type`) due to a bad seed                | Low        | Med    | Validate the seed payload against the TypeScript interface before inserting; add a unit test for the seed data shape |

---

## 12. Open Questions

| #   | Question                                                                                                                                                                                                                        | Owner      | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1   | Should optional dynamic fields that are left blank be stored as `null` in the JSON object or omitted entirely from the key-value map? (Recommendation: omit missing optional fields — cleaner JSON)                             | Aykan Uğur | Open   |
| 2   | Should V1 ideas without `dynamicFields` be retroactively assigned an empty `{}` JSON object, or stay as `null`? (Recommendation: keep `null` — allows distinguishing "no template existed" from "user skipped optional fields") | Aykan Uğur | Open   |

---

## Appendix: Revision History

| Version | Date       | Author     | Changes                                                           |
| ------- | ---------- | ---------- | ----------------------------------------------------------------- |
| 0.1     | 2026-02-25 | Aykan Uğur | Initial draft — all sections complete based on PRD V2.0 Section 5 |
