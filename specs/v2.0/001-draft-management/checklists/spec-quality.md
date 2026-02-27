# Requirements Quality Checklist: Draft Management

**Purpose**: Validate that the spec.md requirements are complete, clear, consistent, measurable, and ready for planning — "unit tests for English"
**Created**: 2026-02-26
**Feature**: [spec.md](../spec.md)
**Scope**: Full spec coverage — functional requirements, user stories, edge cases, non-functionals, dependencies, success criteria

---

## Requirement Completeness

- [x] CHK001 — Are save-draft server-side field requirements defined for ALL idea fields (title, description, category, visibility, dynamic fields, attachment references), or only a subset? [Completeness, Spec §FR-001]
- [x] CHK002 — Are the "required fields" for full submission validation explicitly enumerated, or is the spec relying on implicit knowledge of the existing form? [Completeness, Gap — Spec §US-3, §FR-007]
- [x] CHK003 — Are loading/pending state requirements defined for the "Save Draft" button (e.g. "Saving…" label, disabled during in-flight request)? [Completeness, Gap]
- [x] CHK004 — Are requirements defined for the Drafts tab count badge when the count is 0 — should the badge be hidden, show "0", or not render? [Completeness, Gap — Spec §US-2 AC-1]
- [x] CHK005 — Are sort order requirements defined for the "Expired Drafts" collapsed section, or only for the active list? [Completeness, Gap — Spec §FR-004, §FR-009]
- [x] CHK006 — Are requirements defined for what the read-only draft view looks like when a non-owner visits via direct URL — is it a blank page, a generic 404, or a styled not-found page? [Completeness, Spec §FR-008]
- [x] CHK007 — Are requirements defined for the "Resume" navigation target — does it open in the same tab, a new tab, or a modal? [Completeness, Gap — Spec §FR-005]
- [x] CHK008 — Are requirements defined for the localStorage auto-save key invalidation when a draft is deleted by the user? (Stale localStorage key could trigger a spurious restore prompt on a future new draft if IDs are reused.) [Completeness, Gap — Spec §FR-011]
- [x] CHK009 — Are confirmation modal requirements (title, body text, button labels) specified for the "Delete" action? [Completeness, Spec §FR-006 — epic UX section references shadcn AlertDialog but spec.md does not reproduce the exact strings]
- [x] CHK010 — Are requirements defined for the cron endpoint's authentication mechanism (e.g. `CRON_SECRET` header) to prevent unauthorised triggering? [Completeness, Gap — Spec §FR-010, §FR-017]

---

## Requirement Clarity

- [x] CHK011 — Is "active (non-expired) drafts" defined precisely — does it mean `isExpiredDraft = false` only, or also `draftExpiresAt > now()` for cases where the cron has not yet run? [Clarity, Spec §FR-003, §FR-004]
- [x] CHK012 — Is "soft-delete" defined as a specific mechanism (e.g. `isExpiredDraft = true` boolean column) rather than left as an implementation decision? [Clarity, Spec §FR-009, §FR-010, Assumptions]
- [x] CHK013 — Is "the local version is newer than the server version" (localStorage restore prompt) defined with a measurable comparison — timestamp delta, field hash, or something else? [Clarity, Spec §FR-011]
- [x] CHK014 — Is "within 7 days" in the expiry warning banner (FR-012) defined as strictly less than 7 × 24 hours from `draftExpiresAt`, or calendar days? Edge at midnight matters for the exact trigger. [Clarity, Spec §FR-012]
- [x] CHK015 — Is "a descriptive error" in FR-003 (draft limit exceeded) specific enough — does the spec define the exact user-facing message, or leave it to implementation? [Clarity, Spec §FR-003 vs US-4 AC-1 which does specify the tooltip text]
- [x] CHK016 — Is "enters the standard review pipeline" (FR-007) defined — does submitting a draft immediately create an admin review task, or does it go through the same status queue as a fresh idea submission? [Clarity, Spec §FR-007]
- [x] CHK017 — Is "no indication it started as a draft" (US-3, AC-3) a complete requirement — are audit log entries, history fields, or metadata about origin status also excluded, or only the UI display? [Clarity, Spec §US-3 AC-3]

---

## Requirement Consistency

- [x] CHK018 — Does FR-014 (flag gates creation and editing; tab stays visible) align with all user story acceptance scenarios, particularly US-1 AC-4 which states "Save Draft button is not present anywhere on the page"? Verify no scenario incorrectly implies the tab is also hidden. [Consistency, Spec §FR-014 vs §US-1 AC-4]
- [x] CHK019 — Does US-5 AC-4 (hard-delete via daily cleanup) align with FR-010 which specifies the same behaviour — are the row counts, conditions, and timing (30 days after soft-delete) identical in both sections? [Consistency, Spec §US-5 AC-4 vs §FR-010]
- [x] CHK020 — Does the Assumptions section claim `isExpiredDraft` boolean is preferred, while FR-009 uses the phrase "moved to a collapsed Expired Drafts section" — is this explicitly tied to the boolean flag approach, or could it be misread as a status-based query? [Consistency, Spec §FR-009 vs Assumptions]
- [x] CHK021 — Are the draft limit count semantics consistent across FR-003, US-4, and the Assumptions? Specifically: does "10 active drafts" in the limit count include drafts that have passed `draftExpiresAt` but whose `isExpiredDraft` flag has not yet been set by the cron (lazy expiry window)? [Consistency, Spec §FR-003 vs §FR-009 lazy expiry]

---

## Acceptance Criteria Quality

- [x] CHK022 — Can SC-001 ("60% of drafts eventually submitted over a 30-day cohort") be objectively measured without an analytics system being in scope for this feature? Is the tracking mechanism specified? [Measurability, Spec §SC-001]
- [x] CHK023 — Can SC-006 ("resume flow fully restores all previously saved field values with no data loss") be objectively verified given that dynamic category fields vary per category — are all category field types explicitly covered? [Measurability, Spec §SC-006]
- [x] CHK024 — Does SC-005 ("expired drafts surfaced within 24 hours") account for the lazy expiry fallback — is the 24-hour window tied to the cron schedule only, or also to the lazy check on request? [Measurability, Spec §SC-005]

---

## Scenario Coverage

- [x] CHK025 — Are requirements defined for the scenario where a user submits a draft while the feature flag is disabled (flag-off + existing draft + submit attempt)? Submit is an edit action — is it blocked by the flag? [Coverage, Gap — Spec §FR-014]
- [x] CHK026 — Are requirements defined for the scenario where a draft is resumed and then **abandoned** (form closed without saving or submitting)? Does the localStorage auto-save fire, and does the expiry clock remain unchanged? [Coverage, Gap — Spec §FR-002, §FR-011]
- [x] CHK027 — Are requirements defined for a draft being saved immediately after the rate limit is hit — does the browser auto-save (localStorage) silently continue, and is the user informed the server save failed? [Coverage, Spec §FR-016, §FR-011 edge case already in spec]
- [x] CHK028 — Are requirements defined for an ADMIN-role user's draft visibility — since all roles can create drafts (Clarification Q1), can an admin see their own drafts via `/my-ideas` the same way a submitter does? [Coverage, Gap — Spec §FR-004, §FR-013]
- [x] CHK029 — Are requirements defined for the transition from DRAFT → SUBMITTED when attachments are present — do attachment records remain associated with the idea after status change? [Coverage, Gap — Spec §FR-007]

---

## Edge Case Coverage

- [x] CHK030 — Is the concurrent-tab save scenario (two tabs, last-write-wins) documented as an accepted data-loss risk, or is it silently assumed? [Edge Case, Spec §Edge Cases — documented as "last write wins; no merge conflict resolution"]
- [x] CHK031 — Is the boundary condition where `draftExpiresAt` passes **exactly** as a save request is in flight defined — does the save succeed and reset the clock, or does the expired check run before the update? [Edge Case, Gap — Spec §FR-002 vs §FR-009]
- [x] CHK032 — Is the empty-category case on resume defined — if a draft was saved with a category that no longer exists (category deleted or renamed), what does the resume form show? [Edge Case, Gap — Spec §FR-005]
- [x] CHK033 — Is the hard-delete timing edge case defined — if a draft is soft-deleted (expired) and then the user manually deletes it within the 30-day window, which action takes precedence and is there a double-delete risk? [Edge Case, Gap — Spec §FR-006, §FR-009]

---

## Non-Functional Requirements Coverage

- [x] CHK034 — Are accessibility requirements defined for the Drafts tab (keyboard navigation, ARIA labels for count badge, focus management after delete confirmation)? [Coverage, Gap — Non-Functional]
- [x] CHK035 — Is the rate limit error user experience specified — does the user see an inline error, a toast, or generic browser error when the 30/15 min save limit is hit? [Clarity, Spec §FR-016]
- [x] CHK036 — Is the cron endpoint's response format specified — what HTTP status and body does it return on success vs. partial failure vs. total failure? [Completeness, Gap — Spec §FR-017]
- [x] CHK037 — Are mobile/responsive layout requirements defined for the Drafts tab, draft rows, and confirmation modal? [Coverage, Gap — Non-Functional]

---

## Dependencies & Assumptions

- [x] CHK038 — Is the assumption that `/my-ideas` already has a tab-based layout validated against the current codebase, or is it untested? If the page uses a different layout pattern, the "add a Drafts tab" requirement underestimates scope. [Assumption, Spec §Assumptions]
- [x] CHK039 — Is the dependency on `dynamicFields` being nullable (EPIC-V2-01 may not be merged) explicitly handled in the resume pre-population requirement (FR-005) — what does the form show for dynamic fields when `dynamicFields` is null? [Dependency, Spec §FR-005, §Dependencies]
- [x] CHK040 — Is the `CRON_SECRET` environment variable assumed to already exist (from EPIC-V2-02 or earlier), or does it need to be defined and documented as a new secret for this feature? [Dependency, Gap — Spec §FR-010]

---

## Ambiguities & Conflicts

- [x] CHK041 — Is the term "save" used consistently to mean only the explicit "Save Draft" button action, or does it also include the localStorage auto-save? FR-002 says expiry resets "on every subsequent save" — does localStorage auto-save trigger a server-side expiry reset? [Ambiguity, Spec §FR-002, §FR-011]
- [x] CHK042 — SC-002 states "zero draft ideas appear in the admin review queue under any circumstances" — is this enforced at query level (per FR-013) or also at the state machine level (per FR-015)? The spec implies both; is that duplication intentional as defence-in-depth? [Clarity, Spec §SC-002, §FR-013, §FR-015]
