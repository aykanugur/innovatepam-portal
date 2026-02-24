# Requirements Quality Checklist: Evaluation Workflow, Admin Tools & Quality Gate

**Purpose**: Author self-review of spec completeness, clarity, and consistency before calling `/speckit.plan`. Emphasis on state machine correctness, security/access control, audit trail, and test coverage gate. P1-gating items marked `[P1-GATE]`.
**Created**: 2026-02-24
**Feature**: [specs/003-evaluation-qa/spec.md](../spec.md)
**Scope**: All 5 stories (US-012, US-013, US-014, US-015, US-016); P1 items carry mandatory gate markers.

---

## Requirement Completeness

- [ ] CHK001 - Are loading / in-flight state requirements defined for the review page while "Start Review" or finalize actions are processing (e.g., button disabled, spinner)? [Gap, Spec §US-012]
- [ ] CHK002 - Are requirements defined for what the submitter sees on their idea detail page while the idea is in `UNDER_REVIEW` state — before any decision is made? [Gap, Spec §FR-007]
- [ ] CHK003 - Are UI/UX requirements specified for the "Abandon Review" action — where it appears, who sees it, and whether a confirmation dialog is required? [Gap, Spec §FR-030]
- [ ] CHK004 - Are pagination or truncation requirements defined for the "Pending Review" queue on the admin dashboard in scenarios where hundreds of `SUBMITTED` ideas exist? [Gap, Spec §FR-010]
- [ ] CHK005 - Are requirements specified for who can READ the audit log, or is it defined as write-only from the portal perspective? [Gap, Spec §FR-028, §FR-030]
- [ ] CHK006 - Are rollback / compensation requirements defined for partially completed atomic operations — e.g., if `IdeaReview` row is created but `Idea.status` update fails during Start Review? [Gap, Spec §FR-004]
- [ ] CHK007 - Are requirements specified for what happens when an audit log write fails during a state transition — does the transition roll back? [Gap, Spec §FR-028]

---

## Requirement Clarity

- [ ] CHK008 - Is "atomically" (used in FR-004 and FR-006) defined in terms of the expected database-level guarantee — e.g., single Prisma transaction — or is it left implementation-defined? [Ambiguity, Spec §FR-004, §FR-006]
- [ ] CHK009 - Is the "comment summary" field in `IDEA_REVIEWED` audit metadata defined precisely — e.g., first 100 characters of the comment — or is the truncation strategy unspecified? [Ambiguity, Spec §FR-028]
- [ ] CHK010 - Is the analytics "last 30 days" window defined as a rolling window from the current UTC timestamp or a fixed calendar-month boundary? [Ambiguity, Spec §FR-023]
- [ ] CHK011 - Is "live count" on the admin dashboard (FR-009, FR-013) defined with an explicit staleness tolerance, or does it require real-time accuracy on every navigation? [Ambiguity, Spec §FR-009, §FR-013]
- [ ] CHK012 - Is `FEATURE_ANALYTICS_ENABLED` specified as a build-time environment variable or a runtime flag, and are the implications for Vercel's static/edge rendering noted? [Ambiguity, Spec §FR-021]
- [ ] CHK013 - Is the analytics leaderboard ranking behavior defined when fewer than 5 contributors exist — e.g., are empty rank slots shown, or does the list simply end? [Ambiguity, Spec §FR-023, §FR-024]

---

## Requirement Consistency

- [ ] CHK014 - Does the self-review restriction in FR-003 explicitly state whether it applies to SUPERADMIN as well as ADMIN, or does it silently exclude SUPERADMIN? [Consistency, Spec §FR-003]
- [ ] CHK015 - Are the password complexity requirements in FR-018 stated with the same rules as registration (min 8 chars, 1 uppercase, 1 number) — no divergence from the existing Zod schema? [Consistency, Spec §FR-018, §Assumption 8]
- [ ] CHK016 - Is SC-007 ("admin cannot review their own idea — at UI, server actions, and direct API layers") consistently reflected as an explicit constraint in FR-003 itself, or only in the success criteria? [Consistency, Spec §FR-003, §SC-007]
- [ ] CHK017 - Does the Key Entities description of `IdeaReview` (two-step creation, concurrency guard) fully align with FR-004, FR-006, and FR-030 with no contradictions? [Consistency, Spec §FR-004, §FR-006, §FR-030, §Key Entities]
- [ ] CHK018 - Is `IDEA_REVIEW_ABANDONED` added to the `AuditAction` enum in the Key Entities section, consistent with its introduction in FR-030? [Consistency, Spec §FR-030, §Key Entities — AuditLog]

---

## Acceptance Criteria Quality

- [ ] CHK019 - `[P1-GATE]` Do the US-012 acceptance scenarios cover the Abandon Review path, or is that flow only specified in FR-030 without a user-facing AC? [Coverage, Spec §US-012 ACs, §FR-030]
- [ ] CHK020 - Can SC-001 ("complete review cycle in under 2 minutes") be measured objectively — is the start/end boundary defined, and does it include or exclude page navigation time? [Measurability, Spec §SC-001]
- [ ] CHK021 - Is SC-002 ("submitter sees decision within one page load") defined precisely enough to be verifiable — e.g., does "one page load" mean SSR or a client-side refetch, and is this an E2E AC or a performance bound? [Measurability, Spec §SC-002]
- [ ] CHK022 - Does US-016 AC-2 list the four E2E critical paths exhaustively, or is the "admin abandons review" path absent from the E2E suite requirement? [Coverage, Spec §US-016 AC-2, §FR-030]

---

## State Machine & Transition Coverage `[P1-GATE]`

- [ ] CHK023 - `[P1-GATE]` Is a complete, explicit state transition table or diagram included in the spec showing ALL valid and ALL invalid transitions (including `UNDER_REVIEW → SUBMITTED` via Abandon), rather than relying on prose-only description? [Gap, Spec §FR-002]
- [ ] CHK024 - `[P1-GATE]` Are requirements defined for every invalid transition attempt (e.g., `SUBMITTED → ACCEPTED` directly, `REJECTED → UNDER_REVIEW`) specifying the exact error message returned? [Ambiguity, Spec §FR-002, §FR-008]
- [ ] CHK025 - `[P1-GATE]` Is the race condition between concurrent finalize and Abandon Review on the same idea addressed — e.g., what happens if a SUPERADMIN triggers Abandon while the original reviewer concurrently submits a decision? [Gap, Spec §FR-006, §FR-030, §Edge Cases]
- [ ] CHK026 - `[P1-GATE]` Does FR-030 specify what happens on Abandon Review if no `IdeaReview` row exists at the time of the action (e.g., data inconsistency)? [Edge Case, Spec §FR-030]
- [ ] CHK027 - Is the state machine defined as a _pure function_ (FR-002 references "State machine" key entity) — is this mandate propagated to the test requirements in US-016? [Consistency, Spec §FR-002, §Key Entities, §US-016]

---

## Security & Access Control Coverage `[P1-GATE]`

- [ ] CHK028 - `[P1-GATE]` Are access control requirements explicitly stated for every new route introduced by this epic: `/admin/review/<id>`, `/admin`, `/admin/analytics`, `/settings`, and the Abandon Review server action? [Coverage, Spec §FR-001, §FR-014, §FR-022, §FR-030]
- [ ] CHK029 - `[P1-GATE]` Does the spec require access control enforcement at both the UI layer (hide buttons/routes) AND the server action / API handler layer, or only at one layer? [Ambiguity, Spec §SC-007]
- [ ] CHK030 - `[P1-GATE]` Are SUBMITTER-level access-denial behaviors consistent across all admin routes — do all produce the same HTTP status and response shape, or is this undefined? [Consistency, Gap]
- [ ] CHK031 - Is it specified whether a SUPERADMIN can access the `/settings` page with the same password-change flow as a SUBMITTER, or are there any role-specific restrictions on settings? [Gap, Spec §FR-015, §FR-016]
- [ ] CHK032 - Are authentication (session validity) requirements specified for server actions — i.e., what happens when a session expires mid-review and the user tries to finalize? [Gap, Spec §FR-004, §FR-006]

---

## Audit Trail Completeness `[P1-GATE]`

- [ ] CHK033 - `[P1-GATE]` Are the exact metadata field names and value types defined for all three audit events (`IDEA_REVIEW_STARTED`, `IDEA_REVIEWED`, `IDEA_REVIEW_ABANDONED`) in a structured format rather than natural language prose? [Clarity, Spec §FR-028, §FR-030, §Key Entities — AuditLog]
- [ ] CHK034 - `[P1-GATE]` Is `IDEA_REVIEW_ABANDONED` included in the `AuditAction` enum in the Prisma schema section or Key Entities, consistent with FR-030's requirement? [Consistency, Spec §FR-030, §Key Entities]
- [ ] CHK035 - Is it specified whether audit log entries are written inside the same DB transaction as the state change, or in a separate write — and what consistency guarantees this implies? [Ambiguity, Spec §FR-028, §FR-030]
- [ ] CHK036 - Is FR-028's scope limited to evaluation events, or should it extend to cover the `delete` audit events already implemented (IDEA_DELETED) for consistency? The spec does not cross-reference the existing audit pattern. [Consistency, Gap]

---

## Test Coverage Quality Gate `[P1-GATE]`

- [ ] CHK037 - `[P1-GATE]` Is the ≥ 80% coverage metric in FR-025 specified as _line_ coverage, _branch_ coverage, or both — and is the choice intentional given that state machine branching is a core risk? [Clarity, Spec §FR-025, §SC-004]
- [ ] CHK038 - `[P1-GATE]` Are source file exclusions from the coverage threshold explicitly stated — e.g., generated Prisma client (`lib/generated/`), configuration files, seed scripts? [Ambiguity, Spec §FR-025]
- [ ] CHK039 - `[P1-GATE]` Is the CI enforcement mechanism for the quality gate specified — which CI job, which command, and what blocking behaviour on failure? [Gap, Spec §FR-027]
- [ ] CHK040 - Do the four E2E critical paths in US-016 AC-2 cover the Abandon Review flow, or is that admin-only path absent from E2E requirements? [Coverage, Gap, Spec §US-016 AC-2]
- [ ] CHK041 - Is it specified which environment (staging vs. production) the E2E suite runs against, and whether a seeded database state is required? [Ambiguity, Spec §US-016, §Assumption 4]
- [ ] CHK042 - Are unit test requirements for the state machine (pure function) explicitly listed as a deliverable in US-016, separate from integration and E2E requirements? [Coverage, Spec §US-016, §Key Entities — State machine]

---

## Scenario Coverage

- [ ] CHK043 - Are requirements defined for the alternate flow where a SUPERADMIN performs the review (not just an ADMIN) — does the same start/finalize workflow apply without modification? [Coverage, Spec §FR-001]
- [ ] CHK044 - Is the exception flow for a deleted idea that still has an active `IdeaReview` row addressed — does cascade delete cover this, and is it stated in the spec? [Coverage, Spec §Assumption 2]
- [ ] CHK045 - Are requirements for the case where an admin's account is deactivated mid-review specified — who can resolve the stuck `UNDER_REVIEW` state, and is this the same Abandon Review path? [Gap, Spec §FR-030, §Edge Cases]
- [ ] CHK046 - Is the US-015 password change flow specified for users who authenticated via OAuth (if applicable in future), or is it intentionally scoped to credentials-only accounts? [Assumption, Spec §FR-016]

---

## Non-Functional Requirements

- [ ] CHK047 - Are performance requirements defined for the admin dashboard page load (stat counts + queue), separate from the per-review-action time in SC-001? [Gap, Spec §SC-001]
- [ ] CHK048 - Are accessibility requirements (keyboard navigation, ARIA roles, screen reader labels) defined for the review action panel and the read-only decision card? [Gap]
- [ ] CHK049 - Is a mobile/responsive layout requirement stated for the admin dashboard and review page, or are admin routes desktop-only by spec? [Gap]
- [ ] CHK050 - Are analytics chart rendering requirements defined for reduced-motion preferences or when a chart library is unavailable? [Gap, Spec §FR-023]

---

## Dependencies & Assumptions

- [ ] CHK051 - Is Assumption 2 ("`IdeaReview` model already exists in the Prisma schema") validated by reference to the actual `prisma/schema.prisma` file, or is it unverified? [Assumption, Spec §Assumption 2]
- [ ] CHK052 - Is Assumption 3 (Vitest for unit/integration, Playwright for E2E) confirmed against current `devDependencies` in `package.json`, or could the test runner be absent? [Assumption, Spec §Assumption 3]
- [ ] CHK053 - Is the `DATABASE_URL_TEST` requirement (Assumption 4) documented as a required CI/CD secret in Vercel or the relevant CI environment, not just locally? [Assumption, Gap, Spec §Assumption 4]
- [ ] CHK054 - Are the three new `AuditAction` enum values (`IDEA_REVIEW_STARTED`, `IDEA_REVIEWED`, `IDEA_REVIEW_ABANDONED`) listed as a schema migration dependency that must precede the evaluation logic implementation? [Dependency, Gap]

---

## Ambiguities & Conflicts

- [ ] CHK055 - FR-003 prohibits self-review but SC-007 says this "holds across UI, server actions, and direct API calls" — is there a conflict if the review page URL is accessible via direct navigation by the submitter-admin (they see the page but buttons are hidden)? [Conflict, Spec §FR-003, §SC-007]
- [ ] CHK056 - FR-013 requires stat counts to reflect state after review action "without requiring a manual reload" — does this imply optimistic UI updates, server-side revalidation (`revalidatePath`), or streaming? The mechanism is unspecified and affects plan complexity. [Ambiguity, Spec §FR-013]
- [ ] CHK057 - The spec states US-014 and US-015 are "cut-first candidates" (Assumption 5) but they are assigned story IDs and have P2/P3 priorities — is there an explicit decision point defined for when these are formally dropped, or will they remain open indefinitely? [Ambiguity, Spec §Assumption 5]

---

## Notes

- `[P1-GATE]` items (CHK019, CHK023–CHK025, CHK028–CHK030, CHK033–CHK034, CHK037–CHK039) are mandatory to resolve before calling `/speckit.plan`. All others are recommended but can be resolved iteratively.
- Mark items `[x]` when the spec is updated to address them, or add an inline note explaining why they are intentionally out of scope.
- Items without `[Gap]` reference an existing spec section — re-read that section and verify the requirement is sufficiently precise for a developer to implement without ambiguity.
