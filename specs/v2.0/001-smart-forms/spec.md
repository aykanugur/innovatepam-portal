# Feature Specification: Smart Submission Forms

**Feature Branch**: `001-smart-forms`
**Created**: 2026-02-25
**Status**: Ready for Planning
**Input**: User description: "innovatepam-portal/specs/v2.0/stories/epic-v2-01 — Smart Submission Forms with dynamic category-specific fields (EPIC-V2-01)"

---

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Submitter Sees Category-Specific Fields (Priority: P1)

A submitter navigating to the idea submission form selects a category and synchronously sees additional context-relevant fields specific to that category appear below the category selector. If they switch to a different category, the fields update accordingly and previously entered values are discarded. Required dynamic fields are validated before the idea is saved.

**Why this priority**: This is the core user-facing value of the feature. Without it, the smart forms feature has no visible effect for submitters. It is the end-to-end happy path that all other stories depend on.

**Independent Test**: Can be fully tested by selecting "Cost Reduction" from the category dropdown on the submission form and confirming that the cost-specific fields appear — delivers the structured-data capture value independently.

**Acceptance Scenarios**:

1. **Given** a submitter is on the idea submission form and `FEATURE_SMART_FORMS_ENABLED=true`, **When** they select "Process Improvement" from the category dropdown, **Then** an "Additional Details for Process Improvement" section appears below the category selector without a full page reload.
2. **Given** a submitter has entered values in the "Cost Reduction" dynamic fields, **When** they switch the category to "Technical Innovation", **Then** the cost fields disappear and technical innovation fields appear; the previously entered cost values are discarded.
3. **Given** a submitter leaves a required dynamic field blank and submits, **When** the form is submitted, **Then** an inline error message appears below the field and the idea is not saved.
4. **Given** a submitter selects a category with a `select`-type dynamic field, **When** the dynamic section renders, **Then** the field renders as a dropdown with the predefined options from the template.
5. **Given** `FEATURE_SMART_FORMS_ENABLED=false`, **When** the submitter loads the submission form, **Then** the dynamic fields section is entirely absent and the form behaves identically to V1.

---

### User Story 2 — Admin Reviews Structured Dynamic Fields (Priority: P2)

An admin reviewing an idea on the admin review panel sees the submitted dynamic fields displayed in a labelled "Additional Details" section alongside the standard title and description. For V1 ideas with no dynamic fields, the section is absent and no errors occur.

**Why this priority**: Reviewing structured idea data is the primary business value driver — it reduces review ambiguity and saves reviewer time. It depends on P1 (data must first be captured) but is the reason the feature exists.

**Independent Test**: Can be tested independently by seeding a test idea with dynamic field data and navigating to its admin review panel — verifying the fields appear with labels and correctly formatted values.

**Acceptance Scenarios**:

1. **Given** an admin is on the review panel for an idea with dynamic fields, **When** the page loads, **Then** an "Additional Details" section shows each field as `[Label]: [Value]`.
2. **Given** an idea was submitted with a multiline text dynamic field, **When** the admin views it, **Then** the multiline value is displayed with line breaks preserved.
3. **Given** an admin views a V1 idea that predates smart forms, **When** the review panel loads, **Then** no "Additional Details" section appears and no error is thrown.
4. **Given** `FEATURE_SMART_FORMS_ENABLED=false`, **When** the admin review panel loads for any idea, **Then** no dynamic fields section appears even for ideas that have stored dynamic data.

---

### User Story 3 — Submitter Views Their Idea's Dynamic Fields (Priority: P3)

A submitter viewing their own submitted idea on the idea detail page sees the structured dynamic field values they entered, alongside the standard title and description. This provides confirmation that their context was captured and is visible to reviewers.

**Why this priority**: This is the submitter-facing read path. Lower priority because the data is already captured (P1) and visible to admins (P2) — this adds transparency for the submitter but is not critical to the core review workflow.

**Independent Test**: Can be tested independently by submitting an idea with dynamic fields, then navigating to the idea detail page and verifying the "Additional Details" section renders correctly.

**Acceptance Scenarios**:

1. **Given** a submitter views their own idea detail page and the idea has dynamic fields, **When** the page loads, **Then** an "Additional Details" section renders with labelled field values accurately matching what was submitted.
2. **Given** a submitter views the detail page of a V1 idea (no dynamic fields), **When** the page loads, **Then** no "Additional Details" section appears — the page renders cleanly without errors or empty containers.

---

### Edge Cases

- What happens when a category is selected that has no field template in the database? → The dynamic fields section does not render; the idea is submitted without dynamic data (stored as absent).
- What happens when a number-type field receives a non-numeric value submitted directly to the API (bypassing client validation)? → Server-side schema validation rejects the submission with an appropriate error response.
- What happens when the field template data store is empty (seed was not run)? → No dynamic fields render for any category; submitters see only the standard V1 form; no errors occur.
- What happens when a V1 idea is displayed and has no dynamic field data? → The "Additional Details" section is entirely absent from the rendered output — no empty card, no null text.
- What happens if a submitter switches categories after partially filling required fields, then submits without filling the new category's required fields? → Only the currently active category's template requirements are validated; the discarded fields from the previous category are never evaluated.
- What happens if a submitter navigates away from the form mid-completion (browser back, tab close) with unsaved dynamic field values? → Out of scope; browser default behaviour applies. No unsaved-changes warning is added in this feature.
- What happens when the stored `dynamicFields` key-value map references a field ID that no longer exists in the current template (e.g., the seed was updated after the idea was submitted)? → The stored value is displayed using the field ID itself as a fallback label, with no error thrown. Example: `current_process: "We approve invoices manually."` renders as-is.
- What happens when `FEATURE_SMART_FORMS_ENABLED=false` but an idea in the database has stored dynamic field data? → The "Additional Details" section is absent from all pages regardless of stored data; flag off = no display, consistent with FR-010.
- What happens when a stored `select`-type field value no longer matches any option in the current template (e.g., an option was removed from the seed after submission)? → The value is displayed as stored on the read path; no re-validation is applied when reading existing data.
- What is the scope of field ID uniqueness for `FieldDefinition`? → Field IDs must be unique within a single template (per category). Global uniqueness across all templates is not required.

---

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST maintain a field template for each of the 5 supported categories (`Process Improvement`, `New Product/Service`, `Cost Reduction`, `Employee Experience`, `Technical Innovation`), queryable by category name. Category names are stored and queried using their slug form as defined in `constants/categories.ts` (e.g., `process-improvement`); display labels are used only in the user interface.
- **FR-002**: The system MUST store submitted dynamic field values as a structured key-value map associated with the submitted idea.
- **FR-003**: The submission form MUST display the relevant field template section synchronously when a category is selected, with no page reload and no network request. All 5 category field templates are pre-loaded into the page at render time; the client shows or hides the correct section based on the selected category. No loading indicator or skeleton state is required — the transition is instant because no I/O occurs.
- **FR-004**: Switching the selected category MUST reset only the dynamic fields section to an empty state — previously entered values for the former category must not be retained. The standard form fields (title, description, and the category selector itself) MUST NOT be affected by a category switch.
- **FR-005**: The system MUST enforce required dynamic fields during submission, returning a field-level error message when a required field is blank and preventing the idea from being saved. A blank value is defined as an empty string or a string containing only whitespace characters after trimming. Error message format: "[Field Label] is required."
- **FR-006**: Input provided for number-type dynamic fields MUST be validated as numeric by the server; non-numeric input must be rejected with an error response before any data is persisted. Error message format: "[Field Label] must be a number." Negative and zero values are accepted unless the specific field definition in the template explicitly defines a minimum value. Number-type fields MUST be rendered as `<input type="text" inputMode="numeric">` — not `<input type="number">` — to avoid browser-native spinner UX and inconsistent mobile keyboard behaviour.
- **FR-007**: The idea detail page MUST display submitted dynamic field values in a labelled "Additional Details" section when the idea has dynamic data.
- **FR-008**: The admin review panel MUST display the same dynamic field values as the idea detail page with identical labelling and formatting — each field rendered as `[Label]: [Value]`, `textarea` values with line breaks preserved, `number` values as plain numeric strings. The admin panel MUST NOT show additional dynamic fields or apply different formatting conventions.
- **FR-009**: Ideas with no dynamic field data (V1 ideas or ideas in categories with no template) MUST render on all pages without errors — the "Additional Details" section must be completely absent from the output.
- **FR-010**: All smart forms functionality MUST be controlled by the `FEATURE_SMART_FORMS_ENABLED` flag, enforced at two layers: (a) page render — the dynamic fields section is conditionally absent from the rendered HTML; and (b) Server Action — dynamic field values in the request payload are silently ignored and not persisted. When the flag is off, the RSC page MUST NOT query `CategoryFieldTemplate`; no database round-trip for templates occurs. The V1 baseline is defined as: the submission form renders only title, description, and category fields; no "Additional Details" section exists anywhere in the page; form behaviour is unchanged from the last V1 release.
- **FR-011**: The field template data seed MUST be idempotent — running the seeding process multiple times must not create duplicate records.
- **FR-012**: When an idea with dynamic field values is submitted, the dynamic field values MUST be included in the metadata of the existing `IDEA_CREATED` audit log entry — no separate audit action is created.
- **FR-013**: Server-side validation MUST enforce maximum character limits on text-type dynamic field values: `text` fields are capped at 255 characters; `textarea` fields are capped at 2000 characters. Input exceeding these limits MUST be rejected with a field-level error before the idea is persisted. Error message format: "[Field Label] must be [N] characters or fewer."
- **FR-014**: When a draft idea is saved (EPIC-V2-03), the current dynamic field values MUST be persisted as part of the draft state and fully restored when the submitter resumes the draft — dynamic fields are treated identically to any other idea attribute for draft save/restore.
- **FR-015**: All dynamic field inputs MUST meet WCAG 2.1 AA accessibility standards — each field MUST have an associated visible label and be reachable and operable via keyboard. Validation errors MUST be conveyed to screen readers specifically via: `aria-required="true"` on required fields; `aria-invalid="true"` and `aria-describedby` pointing to the error message element's `id` on any field with an active validation error.
- **FR-016**: For `select`-type dynamic fields, the server MUST reject any submitted value that is not present in the field's `options` list in the template, returning a field-level error before the idea is persisted. Error message format: "[Field Label] contains an invalid selection."
- **FR-017**: A `select`-type dynamic field whose `options` list in the template is empty or absent MUST NOT be rendered on the submission form — it is silently skipped. No error is shown to the submitter.
- **FR-018**: The Server Action MUST validate submitted dynamic field keys against the field template for the submitted category before persisting. Any key not present in the template MUST be stripped from the payload — unknown keys are never written to the stored key-value map.

### Key Entities

- **CategoryFieldTemplate**: Represents the set of structured input fields associated with one category. Key attributes: unique category name, an ordered list of field definitions, and a version number for future migrations.
- **FieldDefinition** (embedded within CategoryFieldTemplate): Represents a single dynamic input field. Attributes: a unique identifier within the template, a human-readable label, the input type (`text`, `textarea`, `number`, or `select`), whether the field is required, and for `select` types, the list of allowed values.
- **Idea — Dynamic Data** (extension of existing entity): The idea entity gains a nullable structured data attribute that maps field identifier strings to the values submitted by the user. This attribute is absent on V1 ideas.

---

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: All 5 category field templates are present and queryable after a clean deployment — confirmed by a record count returning exactly 5 entries, each containing the correct fields per PRD V2.0 Section 5.2.
- **SC-002**: Submitters can complete a dynamic idea submission (all required fields filled) in under 4 minutes total — the additional context fields add no more than 90 seconds compared to the V1 baseline submission time. This is an estimate for V2.0; no formal V1 timing baseline measurement is required before shipping. Actual timing should be validated during QA.
- **SC-003**: 100% of V1 ideas (those predating the smart forms migration) render without errors or anomalies on idea detail and admin review pages after the feature is deployed.
- **SC-004**: Required dynamic field enforcement is applied to 100% of submission attempts — no idea with a blank required dynamic field is persisted.
- **SC-005**: Disabling the feature flag produces an experience indistinguishable from V1 — confirmed by a Playwright E2E test that renders the submission form with `FEATURE_SMART_FORMS_ENABLED=false`, asserts that no element with the "Additional Details" section heading exists in the DOM, and confirms the rendered field count matches the V1 form snapshot stored in the test suite.

---

## Dependencies

| Dependency                                        | Type              | Direction                                 | Notes                                                                                                                                          |
| ------------------------------------------------- | ----------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| EPIC-V2-03 — Draft Management                     | Cross-epic        | Upstream consumer of FR-014               | EPIC-V2-03 must treat `dynamicFields` as a first-class draft attribute. This spec defines the contract; EPIC-V2-03 spec must reference FR-014. |
| PRD V2.0 Section 5.2 — Field template definitions | External spec     | Source of truth for FR-001 / SC-001       | Any change to PRD §5.2 field definitions must trigger a revision of this spec and the seed data.                                               |
| `constants/categories.ts` — V1 category enum      | Codebase constant | Source of truth for category name strings | FR-001 category names must match exactly the values exported from this constant.                                                               |

---

## Assumptions

- All 5 category names are the fixed strings already in use in the V1 system, as exported from `constants/categories.ts`. No new categories are introduced by this feature.
- Field template definitions (labels, types, required flags, and select options) are as specified in PRD V2.0 Section 5.2 — linked above in the Dependencies table — and require no admin configuration; they are seeded at deploy time only.
- Optional dynamic fields left blank by the submitter are omitted entirely from the stored key-value map (not stored as null-valued keys) — this produces cleaner stored data and simplifies the read path.
- V1 ideas retain no dynamic field data permanently; no retroactive population of this data is performed.
- The feature is deployed with `FEATURE_SMART_FORMS_ENABLED=false` in production until QA sign-off.
- The edit idea flow (modifying a previously submitted idea) is out of scope for this feature. No dynamic fields UX is added to the edit form; editing a V1 or V2 idea via any edit route leaves `dynamicFields` unchanged.

---

## Clarifications

### Session 2026-02-25

- Q: How should the dynamic field templates be delivered to the form — pre-loaded at page render time or fetched per category change? → A: Pre-load all 5 templates at page render time; zero network requests on category change (Option A).
- Q: Should dynamic field values appear in the audit log, and if so, how? → A: Include dynamic field values in the metadata of the existing `IDEA_CREATED` audit log entry — no new audit action (Option A). Note: the enum value is `IDEA_CREATED` (confirmed from `prisma/schema.prisma`) — not `IDEA_SUBMITTED`.
- Q: What are the maximum character limits for `text` and `textarea` dynamic field types? → A: `text` ≤ 255 chars, `textarea` ≤ 2000 chars — consistent with existing V1 title/description limits.
- Q: Should dynamic field values be preserved when a draft is saved and resumed (EPIC-V2-03 integration)? → A: Yes — dynamic field values are persisted in drafts and fully restored on resume (Option A).
- Q: What accessibility standard must the dynamic field inputs meet? → A: WCAG 2.1 AA — same standard as the rest of the form (Option A).

### Spec Review Checklist Resolutions (2026-02-25)

All 28 items from `checklists/spec-review.md` resolved:

- **CHK001** (field definitions depend on external PRD): Explicitly declared as a dependency above; any PRD §5.2 change triggers spec revision. Acceptable external reference.
- **CHK002** (`select` invalid value error): FR-016 added.
- **CHK003** (loading/transition state): FR-003 updated — templates are pre-loaded; transition is synchronous; no loading state required.
- **CHK004** (number field bounds): FR-006 updated — bounds are template-defined per PRD §5.2; no global floor/ceiling in this spec.
- **CHK005** (`select` with empty options): FR-017 added — field is silently skipped.
- **CHK006** (EPIC-V2-03 dependency not declared): Dependencies section added.
- **CHK007** ("immediately" unquantified): FR-003 and story narrative updated to "synchronously" — the pre-load pattern makes quantification moot.
- **CHK008** (V1 baseline undefined): FR-010 updated with explicit V1 baseline definition.
- **CHK009** ("same labelling and formatting" vague): FR-008 updated with concrete `[Label]: [Value]` rule and per-type formatting notes.
- **CHK010** ("appropriate ARIA attributes" vague): FR-015 updated with specific `aria-required`, `aria-invalid`, and `aria-describedby` requirements.
- **CHK011** (error message wording not specified): FR-005, FR-006, FR-013, and FR-016 each updated with explicit message format patterns.
- **CHK012** (flag enforcement layer ambiguous): FR-010 updated — enforced at both page render and Server Action.
- **CHK013** (standard fields affected by category switch): FR-004 updated — only dynamic fields are reset; title/description/category selector are unaffected.
- **CHK014** (admin panel vs detail page identical): FR-008 updated with explicit "MUST NOT differ" wording.
- **CHK015** (FR-004 vs FR-014 conflict on resumed draft + category switch): Resolved — FR-004 applies to the active session; if a submitter resumes a draft and then switches categories, the restored dynamic values are discarded by FR-004, and the next save/submit captures only the new category's values. No additional FR needed.
- **CHK016** (SC-002 baseline is an estimate): SC-002 updated with explicit "estimate" note and QA validation guidance.
- **CHK017** (blank value definition): FR-005 updated — blank = empty string or whitespace-only after trimming.
- **CHK018** (SC-005 comparison mechanism undefined): SC-005 updated with Playwright E2E approach and DOM assertion criteria.
- **CHK019** (mid-form navigation): Edge case added — out of scope; browser default applies.
- **CHK020** (template version mismatch on display): Edge case added — field ID used as fallback label; no error.
- **CHK021** (flag off + stored data): Edge case added — flag off = absent section regardless of stored data.
- **CHK022** (stale `select` values on read): Edge case added — displayed as stored; no re-validation on read path.
- **CHK023** (negative/zero numbers): FR-006 updated — accepted unless template defines a minimum.
- **CHK024** (field ID uniqueness scope): Edge case added — unique within template only.
- **CHK025** (pre-load performance budget): Templates are embedded in page HTML at render time; no extra network round-trip; covered by standard page load and aligns with SC-002.
- **CHK026** (field key injection security): FR-018 added.
- **CHK027** (category enum not traced): Assumptions and Dependencies updated to reference `constants/categories.ts`.
- **CHK028** (PRD §5.2 link informal): Dependencies table added with explicit link and change-trigger note.
