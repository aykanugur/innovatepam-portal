# Feature Specification: Blind Review for Idea Evaluation Pipelines

**Feature Branch**: `001-blind-review`  
**Created**: 2025-07-22  
**Status**: Draft  
**Input**: User description: "EPIC-V2-05 — Blind Review: allow SUPERADMIN to enable blind review on a pipeline so that author identities are masked from ADMINs during active evaluation, preserving objectivity. Includes schema field, pipeline config toggle, server-side masking utility, and audit log exemption."

## User Scenarios & Testing _(mandatory)_

### User Story 1 — Enable Blind Review on a Pipeline (Priority: P1)

A SUPERADMIN configures an evaluation pipeline and decides that reviewer objectivity is critical for a particular programme. They enable the "Blind Review" option on the pipeline configuration page. The setting is saved and is reflected immediately for any subsequent idea reviews in that pipeline.

**Why this priority**: The toggle is the entry-point for the entire feature. Without it, the setting cannot be activated, making all downstream masking inert. It is the lowest-effort, highest-leverage change.

**Independent Test**: A SUPERADMIN can open any pipeline's config form, flip the Blind Review switch, save, reload the page, and see the switch still in the enabled position.

**Acceptance Scenarios**:

1. **Given** a SUPERADMIN is on a pipeline configuration page, **When** they enable the Blind Review toggle and save, **Then** the pipeline setting is persisted and the toggle reflects the saved state on the next page load.
2. **Given** a SUPERADMIN enables blind review on a pipeline that currently has active reviews in progress, **When** they save, **Then** a visible amber warning informs them that in-progress reviews will be affected, and the save still succeeds.
3. **Given** an ADMIN is viewing a pipeline configuration page, **When** the page renders, **Then** the Blind Review toggle is not visible to them.
4. **Given** the Blind Review feature flag is disabled (system default), **When** a SUPERADMIN opens pipeline configuration, **Then** the toggle is rendered but marked as disabled with an explanatory tooltip.

---

### User Story 2 — Author Identity Is Masked During Active Review (Priority: P1)

An ADMIN is assigned to review ideas flowing through a blind-review-enabled pipeline. When they open an idea that is currently under review, the author's name and identifying details are replaced with a neutral placeholder. The ADMIN can evaluate the idea purely on its merits, without knowing who submitted it.

**Why this priority**: This is the core user-facing value of the feature. It directly delivers the objectivity goal.

**Independent Test**: With blind review enabled on a pipeline and an idea in UNDER_REVIEW status, an ADMIN viewing the idea detail page sees "Anonymous" instead of the submitter's name. A SUPERADMIN viewing the same page sees the real author name.

**Acceptance Scenarios**:

1. **Given** blind review is enabled on a pipeline and an idea is in UNDER_REVIEW status, **When** an ADMIN opens the idea detail page, **Then** the author field shows a masked placeholder ("Anonymous") and no identifying information is exposed.
2. **Given** blind review is enabled and an idea is in UNDER_REVIEW, **When** a SUPERADMIN opens the same idea, **Then** the real author name and details are shown without masking.
3. **Given** blind review is enabled and an idea is in UNDER_REVIEW, **When** the idea author (SUBMITTER) views their own submission, **Then** they see their own name unmasked.
4. **Given** blind review is enabled, **When** an idea transitions to ACCEPTED or REJECTED (decision made), **Then** the author identity is no longer masked and the real author name is visible to all authorised users.
5. **Given** blind review is disabled on the pipeline, **When** an ADMIN views any idea, **Then** the real author name is always shown regardless of idea status.

---

### User Story 3 — Audit Logs Always Show Real Author Identity (Priority: P1)

A SUPERADMIN or compliance officer reviews the audit log for an idea that was evaluated under blind review. The audit log entries must always display the real identity of all parties — submitter and reviewers — to preserve accountability and traceability, regardless of blind review configuration.

**Why this priority**: Accountability and audit integrity are non-negotiable compliance requirements. Masking audit logs would undermine the entire audit trail.

**Independent Test**: With blind review enabled on a pipeline, any authorised user viewing the idea audit log sees the real author name in every audit entry, even while the main idea detail page shows "Anonymous".

**Acceptance Scenarios**:

1. **Given** blind review is enabled and an idea is in UNDER_REVIEW, **When** any authorised user views the audit log for that idea, **Then** all entries display the real identity of the author and all reviewers.
2. **Given** a decision has been recorded in the audit log under blind review, **When** a SUPERADMIN later views the audit history, **Then** all identities are fully visible and no masking is applied.

---

### User Story 4 — Schema and Data Model Foundation (Priority: P1)

The product's data model must record whether a pipeline has blind review enabled. This is the foundational prerequisite for all masking logic and must be in place before any other story is implemented.

**Why this priority**: All other stories depend on the `blindReview` flag existing as persistent state. No masking or toggle is possible without it.

**Independent Test**: After the migration runs, a pipeline record can be created or updated with `blindReview: true`, retrieved, and the value persists correctly with default `false` on new records.

**Acceptance Scenarios**:

1. **Given** the migration has been applied, **When** a new pipeline is created without specifying `blindReview`, **Then** the value defaults to `false`.
2. **Given** the migration has been applied, **When** a pipeline's `blindReview` field is set to `true` by a SUPERADMIN action, **Then** subsequent reads of that pipeline return `blindReview: true`.

---

### Edge Cases

- What happens when the feature flag is off but a pipeline's `blindReview` field is already `true` in the database? → Masking is NOT applied — the feature flag governs runtime behaviour entirely; database state is irrelevant when the flag is off.
- What happens when an idea moves out of UNDER_REVIEW (e.g., back to QUEUED due to escalation)? → Masking is lifted; it applies only when status is exactly UNDER_REVIEW.
- What happens when the pipeline record cannot be retrieved? → System defaults to showing real identity (fail-open); objectivity is sacrificed over data integrity risk.
- What happens when the author is also the ADMIN reviewer (same account)? → The self-view rule applies; the user sees their own name unmasked. The platform should prevent self-review via separate guardrails.
- What happens when a pipeline is deleted while ideas are under blind review in it? → Pipeline reference is absent; masking logic cannot activate; real identities are shown.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a boolean `blindReview` field on pipeline records, defaulting to `false`.
- **FR-002**: System MUST persist updates to the `blindReview` field only when initiated by a user with SUPERADMIN role.
- **FR-003**: System MUST reject any attempt by a non-SUPERADMIN to modify the `blindReview` field, returning an authorisation error without processing the change.
- **FR-004**: System MUST expose a toggle control for `blindReview` in the pipeline configuration interface, rendered only for SUPERADMIN users.
- **FR-005**: System MUST display an amber warning banner when a SUPERADMIN enables blind review on a pipeline that currently has one or more ideas in UNDER_REVIEW status.
- **FR-006**: System MUST mask the idea author's identity when ALL of the following conditions are simultaneously true: (a) `FEATURE_BLIND_REVIEW_ENABLED` is `true`; (b) the pipeline has `blindReview: true`; (c) the idea status is `UNDER_REVIEW`; (d) the requesting user's role is `ADMIN`; (e) the requesting user is not the idea author.
- **FR-007**: System MUST NOT mask the author identity when the requesting user has SUPERADMIN role.
- **FR-008**: System MUST NOT mask the author identity when the idea has reached a final decision state (ACCEPTED or REJECTED).
- **FR-009**: System MUST NOT mask the author identity when the requesting user is the idea's own author (self-view).
- **FR-010**: System MUST NOT apply identity masking to any audit log retrieval, regardless of pipeline configuration, idea status, or requesting user role.
- **FR-011**: All code paths that retrieve audit logs MUST include an explicit inline comment documenting that blind review masking is intentionally exempt, citing the governing policy.
- **FR-012**: System MUST gate the entire blind review capability behind an environment-level feature flag (`FEATURE_BLIND_REVIEW_ENABLED`), defaulting to `false`.
- **FR-013**: When the feature flag is disabled, the pipeline toggle MUST be visible to SUPERADMIN but rendered in a disabled state with a tooltip stating it is not currently enabled.
- **FR-014**: The identity masking function MUST execute server-side only; it MUST NOT be callable from client-side rendering paths.
- **FR-015**: The masking function MUST accept the pipeline configuration, requester role, requester user ID, author user ID, and idea status as inputs, and return either the real author data or a masked placeholder based on the conditions in FR-006.

### Key Entities

- **ReviewPipeline**: An evaluation workflow applied to ideas. Extended with a `blindReview` boolean flag. When `true`, all ideas flowing through this pipeline are subject to identity masking during active review.
- **IdeaAuthorView** (projected): The author data as returned to a requesting user. May represent real identity or a masked placeholder ("Anonymous") depending on pipeline configuration, idea status, and requester role.
- **AuditLogEntry**: A timestamped record of an action taken on an idea. Always displays real identities regardless of pipeline settings; explicitly and permanently exempt from blind review masking.
- **Feature Flag** (`FEATURE_BLIND_REVIEW_ENABLED`): Environment-level boolean controlling whether the blind review capability is active at runtime. When `false`, masking never occurs regardless of `ReviewPipeline.blindReview`.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: ADMINs evaluating ideas in a blind-review pipeline complete the full review workflow without at any point being exposed to the submitter's real identity during the UNDER_REVIEW phase.
- **SC-002**: A SUPERADMIN can enable or disable blind review on any pipeline within 30 seconds of opening the pipeline configuration page.
- **SC-003**: 100% of audit log entries for ideas processed through blind-review pipelines display real author identities — zero instances of masked data appearing in audit views.
- **SC-004**: Author identity masking is applied consistently across all access paths (page views and API responses) — no path allows an ADMIN to bypass masking during active blind review.
- **SC-005**: After an idea reaches ACCEPTED or REJECTED, the real author identity is visible in 100% of subsequent reads by any authorised user regardless of pipeline blind review setting.
- **SC-006**: Enabling blind review on a pipeline does not introduce an observable latency increase of more than 100ms on idea detail page loads compared to the non-blind-review baseline.
- **SC-007**: Zero per-idea configuration is required — enabling blind review at the pipeline level automatically governs all ideas in that pipeline without additional manual steps.

## Assumptions

- The masking placeholder text is `"Anonymous"` — a product decision that can be revised without spec change.
- "Active review" means idea status is exactly `UNDER_REVIEW`; draft, queued, accepted, and rejected states are outside the masking window.
- The feature flag is an environment variable, not a database-driven toggle — changing it requires a re-deployment.
- A single idea belongs to one pipeline at a time; multi-pipeline assignment is out of scope for this feature.
- If the pipeline record is unavailable at mask-evaluation time, the system defaults to showing real identity (fail-open for data integrity over objectivity).
- The amber warning about active reviews is informational only and does not block the save action.
- Pipeline CRUD operations (create/delete) are governed by existing flows; this feature adds only the `blindReview` field without modifying other pipeline behaviours.
