# Spec Review Checklist: Smart Submission Forms

**Purpose**: Standard PR-level requirements quality review — validate completeness, clarity, consistency, and measurability of spec.md before planning and implementation begin
**Created**: 2026-02-25
**Audience**: Author self-review before opening PR
**Focus**: All three mandatory gating areas — backward compatibility, feature flag isolation, and EPIC-V2-03 cross-epic boundary
**Spec**: [spec.md](../spec.md)

---

## Requirement Completeness

- [x] CHK001 — Are the exact field definitions (ID, label, type, required, options) for all 5 category templates documented in this spec, or is the spec entirely dependent on an external PRD section that could become stale? [Completeness, Traceability, Spec §FR-001, SC-001]
- [x] CHK002 — Are error response requirements defined for all four dynamic field types (`text`, `textarea`, `number`, `select`) individually, or does the spec only cover `required` and `number` validation, leaving `text`/`textarea` truncation and `select` invalid-value errors unspecified? [Completeness, Spec §FR-005, FR-006, FR-013]
- [x] CHK003 — Are loading or transition state requirements defined for the dynamic fields section as it appears or disappears on category change, or is the spec silent on intermediate states (e.g., skeleton, instant, fade)? [Completeness, Gap]
- [x] CHK004 — Are requirements defined for minimum and maximum value bounds on `number`-type dynamic fields (e.g., can "Estimated Savings (%)" exceed 100%)? [Completeness, Gap, Spec §FR-006]
- [x] CHK005 — Are requirements defined for what the form renders when a `select`-type field's options list in the template is empty or missing? [Completeness, Gap]
- [x] CHK006 — Is the cross-epic dependency on EPIC-V2-03 in FR-014 formally declared as a dependency entry in the spec (not only narrated in the FR prose)? [Completeness, Dependency, Gap]

---

## Requirement Clarity

- [x] CHK007 — Is "immediately" in FR-003 quantified with a measurable time threshold (e.g., "within 200ms"), or is it an unverifiable subjective term? [Clarity, Ambiguity, Spec §FR-003]
- [x] CHK008 — Is "behaves identically to V1" in FR-010 and SC-005 defined with a concrete, enumerable V1 baseline — or is the baseline left implicit and therefore untestable? [Clarity, Measurability, Spec §FR-010, SC-005]
- [x] CHK009 — Is "same labelling and formatting" in FR-008 specified with a concrete display rule, or could an implementer reasonably produce a different layout than FR-007 and still satisfy FR-008? [Clarity, Ambiguity, Spec §FR-008]
- [x] CHK010 — Is "appropriate ARIA attributes" in FR-015 specified with concrete attribute names (e.g., `aria-describedby`, `aria-invalid`, `aria-required`), or is it too vague to drive a consistent implementation? [Clarity, Ambiguity, Spec §FR-015]
- [x] CHK011 — Are field-level validation error messages in FR-005 and FR-013 specified with exact wording patterns or templates, or is the message content left to the implementer's discretion? [Clarity, Spec §FR-005, FR-013]
- [x] CHK012 — Does the spec clearly define at which layer the `FEATURE_SMART_FORMS_ENABLED` flag is evaluated — page render, Server Action, or both — or is the enforcement point ambiguous? [Clarity, Ambiguity, Spec §FR-010]

---

## Requirement Consistency

- [x] CHK013 — Do US-1 Scenario 3 and FR-004 agree on whether standard form fields (title, description, category) are preserved or reset when a category switch occurs, or does the spec only specify what happens to dynamic fields? [Consistency, Spec §US-1, FR-004]
- [x] CHK014 — Do FR-007 and FR-008 explicitly confirm that the idea detail page and admin review panel display dynamic fields identically, or could an implementer justify showing additional/different information on the admin panel? [Consistency, Spec §FR-007, FR-008]
- [x] CHK015 — Is there a potential conflict between FR-004 (category switch discards dynamic values) and FR-014 (draft restores dynamic values) when a submitter resumes a draft and then switches categories — does the spec define whether the draft's saved dynamic data is permanently discarded in that case? [Conflict, Spec §FR-004, FR-014]

---

## Acceptance Criteria Quality

- [x] CHK016 — Is the 90-second overhead target in SC-002 based on a measured V1 baseline, or is it an estimate? If an estimate, is the baseline measurement method defined? [Measurability, Assumption, Spec §SC-002]
- [x] CHK017 — Can SC-004 ("no idea with a blank required dynamic field is persisted") be objectively verified by automated tests, and does the spec define what constitutes a blank value (empty string, whitespace-only, null)? [Measurability, Clarity, Spec §SC-004, FR-005]
- [x] CHK018 — Is the "automated comparison" mechanism in SC-005 defined — what is compared, by what tool, and what threshold constitutes "indistinguishable from V1"? [Measurability, Ambiguity, Spec §SC-005]

---

## Scenario Coverage

- [x] CHK019 — Are requirements defined for the submitter's experience when they navigate away from the form mid-completion (browser back, tab close) with unsaved dynamic field values — or is this intentionally out of scope? [Coverage, Gap]
- [x] CHK020 — Are requirements defined for the admin review panel and idea detail page when the `CategoryFieldTemplate` for an idea's category has been updated since the idea was submitted — i.e., field IDs in stored `dynamicFields` no longer exist in the current template? [Coverage, Gap, Spec §Key Entities — version field]
- [x] CHK021 — Are requirements defined for the P3 submitter read path when the flag is disabled (`FEATURE_SMART_FORMS_ENABLED=false`) but the idea has dynamic field data — should stored data remain invisible or visible to the submitter? [Coverage, Consistency, Spec §FR-010, US-3]

---

## Edge Case Coverage

- [x] CHK022 — Are requirements defined for a `select`-type field value in stored `dynamicFields` that no longer matches any option in the current template (e.g., an option was removed from the seed after submission)? [Edge Case, Gap, Spec §FR-001, FR-007]
- [x] CHK023 — Are requirements defined for number-type fields that receive zero or negative values (e.g., `estimated_savings: -5`)? The spec caps characters for text fields but does not bound numeric range. [Edge Case, Gap, Spec §FR-006]
- [x] CHK024 — Is the behaviour of the submission form specified when two required fields from different categories have the same field ID — i.e., are field IDs guaranteed unique only within a template or globally? [Edge Case, Consistency, Spec §Key Entities]

---

## Non-Functional Requirements

- [x] CHK025 — Are performance requirements defined for the page load impact of pre-loading all 5 field templates at render time (FR-003)? The clarification chose pre-load for simplicity, but no budget is set. [Non-Functional, Gap, Spec §FR-003, SC-002]
- [x] CHK026 — Are security requirements defined to prevent a submitter from injecting dynamic field keys that are not present in the template for their submitted category? [Non-Functional, Gap, Spec §FR-002]

---

## Dependencies & Assumptions

- [x] CHK027 — Is the assumption that "all 5 category names are fixed strings already in use in V1" validated against the actual V1 category source of truth (e.g., a database enum or constant), or is it stated without a traceable reference? [Assumption, Traceability, Spec §Assumptions]
- [x] CHK028 — Is the external dependency on PRD V2.0 Section 5.2 (referenced in FR-001 and SC-001) formally linked such that a change to the PRD would be immediately detectable as a spec conflict? [Dependency, Traceability, Spec §FR-001, SC-001]
