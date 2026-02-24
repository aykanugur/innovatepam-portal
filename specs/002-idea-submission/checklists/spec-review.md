# Spec Review Checklist: Idea Submission & Discovery

**Purpose**: Peer reviewer requirements-quality audit — tests the clarity, completeness, consistency, and measurability of `spec.md` before planning begins. Covers UX/form, API/backend, Security/RBAC, and Feature Flag domains.
**Created**: 2026-02-24
**Feature**: [specs/002-idea-submission/spec.md](../spec.md)
**Audience**: Peer reviewer (pre-plan PR review)
**Depth**: Standard (~40 items)

---

## Requirement Completeness — UX & Form

- [x] CHK001 — Are loading state requirements defined for the submission form during async submit (e.g., spinner shown, button disabled until response arrives)? [Gap]
- [x] CHK002 — Is inline validation trigger timing specified for form fields — e.g., on-blur vs. on-change vs. on-submit-only? [Clarity, Spec §FR-008]
- [x] CHK003 — Is the redirect behavior after deletion specified for ADMIN and SUPERADMIN roles (FR-020), or only for the idea author (FR-019)? [Gap, Spec §FR-019, §FR-020]
- [x] CHK004 — Are the modal dismiss/close requirements defined: Escape key, clicking the backdrop, and a "Cancel" button — and whether any of these are required or optional? [Gap, Spec §FR-019]
- [x] CHK005 — Is the exact instructional copy inside the delete modal specified (e.g., "Type your name to confirm deletion"), or is the wording left to implementation? [Clarity, Spec §FR-019]
- [x] CHK006 — Are requirements defined for the state of the submission form after a server-side error (500/503) — does it preserve field values, or reset? [Gap, Spec §FR-007]

---

## Requirement Clarity — Vague or Undefined Terms

- [x] CHK007 — Is "profile name" defined precisely — is it the user's display name, email prefix, full legal name, or a specific stored username field? This directly determines the case-sensitive match logic in FR-019. [Ambiguity, Spec §FR-019]
- [x] CHK008 — Is "newest-first" ordering defined by `createdAt` across both US-009 (FR-009) and US-011 (FR-023), and is tie-breaking order specified? [Clarity, Spec §FR-009, §FR-023]
- [x] CHK009 — Is "relative submission time" in FR-012 specified with a format and threshold (e.g., "2 hours ago" up to 24 h, then "Feb 24, 2026")? [Ambiguity, Spec §FR-012]
- [x] CHK010 — Is "under 3 seconds" in SC-002 quantified with measurement conditions (network tier, device class, data volume, cold vs. warm cache)? [Measurability, Spec §SC-002]
- [x] CHK011 — Is the HTTP 429 error message in FR-029 specified with exact format including the retry-after duration (e.g., "Please wait 45 seconds before submitting again")? [Clarity, Spec §FR-029]
- [x] CHK012 — Is "color-coded" in FR-015 status badges defined beyond hex colors — e.g., is a text label or icon also required for color-blind accessibility? [Ambiguity, Spec §FR-015]

---

## Requirement Consistency

- [x] CHK013 — FR-020 grants ADMIN/SUPERADMIN delete rights, but FR-019 defines the name-match modal only for the idea author. Are the confirmation UX requirements for admin deletions separately specified or explicitly waived? [Gap, Spec §FR-019, §FR-020]
- [x] CHK014 — FR-009 states SUBMITTER sees public ideas + "their own private ideas." FR-021 states private ideas by others return "Not Found" on the detail page. Do these rules consistently cover the list endpoint too, or only the detail endpoint? [Consistency, Spec §FR-009, §FR-021]
- [x] CHK015 — US-008 Scenario 1 and FR-007 both specify redirect to the detail page on success. Are error-recovery paths (e.g., 500 during submit) consistently addressed in both the acceptance scenarios and the FRs? [Consistency, Gap]
- [x] CHK016 — FR-014 defines an empty state for "no ideas match the filter." Is this empty state requirement consistent with the no-ideas-yet empty state in FR-024 (My Ideas) and US-009 Scenario 4? [Consistency, Spec §FR-014, §FR-024]
- [x] CHK017 — Acceptance Scenario 4 of US-010 specifies redirect to "My Ideas page" on deletion. Does FR-019 consistently specify this same destination, and is the page URL (`/my-ideas` or similar) defined? [Consistency, Spec §FR-019]

---

## API & Contract Requirements

- [x] CHK018 — Are the API endpoint paths and HTTP methods documented for all required mutations (create idea, delete idea by author, delete idea by admin)? [Gap]
- [x] CHK019 — Is the request payload shape defined for `POST /api/ideas` — field names, types, required/optional, and max sizes matching FR-002? [Gap, Spec §FR-002]
- [x] CHK020 — Are HTTP error response body shapes specified for failure modes beyond 429 (e.g., 400 validation errors, 401 unauthenticated, 403 forbidden, 404 not found, 500 server error)? [Gap]
- [x] CHK021 — Is the rate limit state storage mechanism for FR-029 specified (in-memory, Redis, database row), or is that deliberately deferred to `plan.md`? [Gap, Spec §FR-029]
- [x] CHK022 — Is the pagination contract defined — query parameter names, whether offset-based or cursor-based, and the shape of the paginated response envelope? [Clarity, Spec §FR-011]
- [x] CHK023 — Is the category filter URL parameter name and value format defined (e.g., `?category=cost-reduction` vs. `?category=Cost+Reduction`)? [Gap, Spec §FR-013]

---

## Security & Visibility Rules

- [x] CHK024 — Are the visibility enforcement rules complete and explicit for the idea _detail_ API endpoint: which roles can read a Private idea (author + ADMIN + SUPERADMIN only)? [Clarity, Spec §FR-021]
- [x] CHK025 — Is it specified whether any role can change an idea's visibility field (Public ↔ Private) after submission? [Gap]
- [x] CHK026 — Are audit log event requirements complete — is the required payload defined (actor ID, action type, idea ID, timestamp, IP or session token)? [Clarity, Spec §FR-026]
- [x] CHK027 — Is the 429 rate limit check scoped exclusively to authenticated users, and is there a separate requirement for unauthenticated submission attempts (which should be caught earlier by FR-027)? [Clarity, Spec §FR-027, §FR-029]
- [x] CHK028 — Are requirements defined for what happens when an ADMIN deletes their own idea (author = admin) — FR-019 (author path) or FR-020 (admin path) applies? [Ambiguity, Spec §FR-019, §FR-020]

---

## Feature Flag Requirements

- [x] CHK029 — Is the owner and mechanism of `FEATURE_FILE_ATTACHMENT_ENABLED` specified — environment variable, runtime config, admin UI toggle — and who controls it? [Gap, Spec §FR-005, §FR-006]
- [x] CHK030 — Are requirements defined for ideas that already have attachments when the flag is subsequently disabled — are attachment links hidden, shown, or degraded? [Gap, Spec §FR-018]
- [x] CHK031 — Is the flag's evaluation point defined — server-side at request time, build-time constant, or per-user setting? The answer affects whether a running deployment needs restarting to toggle the feature. [Ambiguity, Spec §FR-005]

---

## Scenario Coverage — Missing Flows

- [x] CHK032 — Are requirements defined for concurrent deletion — a SUBMITTER and an ADMIN both attempt to delete the same idea simultaneously (race condition / 404 on second delete attempt)? [Edge Case, Gap]
- [x] CHK033 — Are requirements for deep-linking to a specific paginated URL (e.g., `/ideas?page=5`) specified — server-side render, client-side redirect, or 404 if page exceeds total? [Coverage, Gap, Spec §FR-011]
- [x] CHK034 — Is a timeout / error behavior defined for the file upload itself (FR-005) separately from the idea creation — e.g., upload succeeds but DB write fails? [Coverage, Edge Case, Spec §FR-005]
- [x] CHK035 — Are requirements defined for My Ideas page behaviour after an idea the employee owns is deleted by an ADMIN while they are actively viewing the list (stale data / optimistic UI)? [Coverage, Gap]

---

## Non-Functional & Accessibility Requirements

- [x] CHK036 — Are keyboard-accessibility requirements defined for the delete confirmation modal: focus trap while open, Escape-to-close, Enter-to-confirm when button is active? [Gap, Accessibility, Spec §FR-019]
- [x] CHK037 — Are ARIA requirements specified for dynamic content: status badges, pagination controls, and the modal overlay? [Gap, Accessibility]
- [x] CHK038 — Is the audit log's target storage or sink specified (database table, external SIEM, structured stdout) to determine infrastructure requirements? [Gap, Spec §FR-026]

---

## Acceptance Criteria Quality

- [x] CHK039 — SC-003 targets "95% of form submissions succeed on first attempt" — is there a defined measurement mechanism (e.g., analytics event, server-side counter, dashboard)? [Measurability, Spec §SC-003]
- [x] CHK040 — SC-005 and SC-006 claim "absolute" and "no exceptions" isolation — are admin-acting-as-submitter edge cases and shared-session scenarios explicitly scoped in or out? [Measurability, Spec §SC-005, §SC-006]
- [x] CHK041 — SC-001 "under 2 minutes under normal conditions" — are "normal conditions" defined (connection speed, form state, with/without file attachment)? [Measurability, Spec §SC-001]

---

## Dependencies & Assumptions

- [x] CHK042 — Is the external blob storage provider and SDK/API contract referenced — or is this dependency intentionally deferred to the plan? [Dependency, Gap]
- [x] CHK043 — Is the "separate retention policy" for orphaned blobs (FR-028) owned by a specific team or epic, and is that ownership documented? [Dependency, Spec §FR-028]
- [x] CHK044 — Is the assumption that "five category values are fixed for this release" traceable to a stakeholder decision — or is there a risk they change before launch without a spec update? [Assumption, Spec §Assumptions]

---

## Notes

- Mark items `[x]` when satisfied; leave `[ ]` open items for the spec author to address before plan.md is written.
- Add inline findings as sub-bullets under any failing item.
- Items tagged `[Gap]` indicate a requirement that appears to be missing entirely from the spec.
- Items tagged `[Ambiguity]` indicate an existing requirement that is underspecified.
- Items tagged `[Consistency]` flag potential conflicts between sections.
