<!--
SYNC IMPACT REPORT
==================
Version change: 0.0.0 (template placeholder) → 1.0.0 (initial ratification)
Bump type: MAJOR — complete replacement of all template placeholders with
  authoritative project-specific governance content.

Modified principles (template name → final name):
  [PRINCIPLE_1_NAME] → I. The Prime Directive (Spec Dependency)
  [PRINCIPLE_2_NAME] → II. The No-Vibe-Coding Rule
  [PRINCIPLE_3_NAME] → III. Test-Driven Development via Acceptance Criteria (NON-NEGOTIABLE)
  [PRINCIPLE_4_NAME] → IV. Scope Protection (Phase 1 MVP Guard)
  [PRINCIPLE_5_NAME] → V. Traceability & Auditability

Added sections:
  "2. Quality Gates" (testing standards and CI enforcement)
  "3. Required Implementation Workflow" (4-step spec-driven workflow)

Removed sections:
  None — all template comment blocks replaced with project content.

Templates requiring updates:
  ✅ .specify/memory/constitution.md — this file (now complete)
  ✅ .specify/templates/plan-template.md — "Constitution Check" gate now maps to the
     five principles defined here; the gate text [Gates determined based on constitution file]
     is intentionally dynamic and resolves against this document at plan time.
  ✅ .specify/templates/spec-template.md — Acceptance Scenarios format (Given/When/Then)
     is already aligned with Principle III.
  ✅ .specify/templates/tasks-template.md — Story-per-phase organization already aligned
     with Principle IV (story-level scope control).

Follow-up TODOs:
  None — all fields populated. No deferred placeholders.
-->

# InnovatEPAM Portal Constitution

This Constitution governs all AI-assisted and human development on the
**InnovatEPAM Portal**. It is the highest-authority document in the project.
Every instruction, suggestion, or generated artifact MUST conform to the
principles below. In any conflict between this Constitution and any other
file, guide, or user request, this Constitution takes precedence.

---

## Core Principles

### I. The Prime Directive — Spec Dependency

AI MUST NOT write any code, feature, route, UI element, data model change,
or business logic that is not explicitly defined in an approved User Story
within the PRD or its derived Epic/Story files.

- The canonical source of truth is: `specs/prd-innovatepam.md` and the
  User Story files under `specs/stories/`.
- If a requested feature is absent from the specs, AI MUST stop, state which
  spec is missing, and ask the user to either point to an existing spec or
  create one before any implementation begins.
- If a request is vague or ambiguous, AI MUST ask a clarifying question
  tied to a specific Epic or Story — not guess and proceed.
- "It seems obvious" is not a valid justification for undocumented behavior.
  Every output must have a spec citation.

### II. The No-Vibe-Coding Rule

AI is forbidden from inventing, inferring, or extrapolating business logic.

- Every implementation decision MUST be directly traceable to a specific
  Acceptance Criterion in a User Story. The criterion MUST be quoted or
  referenced by ID (e.g., "US-007 AC-3") in the commit message or inline
  comment when the logic is non-obvious.
- When a UI label, error message, or copy is needed and not verbatim in the
  spec, AI MUST use the exact wording from the PRD or the story's UI/UX
  Notes section — not improvise. If the spec is silent on wording, flag it
  as an open question rather than inventing copy.
- Architectural and design choices not covered by the spec (e.g., choosing
  between two equally valid approaches) MUST be surfaced to the user as an
  explicit decision point, not resolved silently.

### III. Test-Driven Development via Acceptance Criteria (NON-NEGOTIABLE)

Before writing any implementation code, AI MUST write tests that directly
validate the Acceptance Criteria of the assigned User Story (RED phase).
Tests MUST fail before implementation begins.

- The test structure MUST mirror the story's Given/When/Then format:
  one test case per Acceptance Criterion, named after the criterion
  (e.g., `it('returns 401 when session is missing — US-006 AC-5')`).
- The RED phase is complete only when tests fail for the right reason
  (missing implementation), not due to syntax errors or misconfiguration.
- The GREEN phase is complete when all AC-mapped tests pass.
- The REFACTOR phase is complete when coverage remains ≥ 80% and no existing
  test is broken.
- AI MUST NOT skip the RED phase by writing implementation and tests
  simultaneously. The test file MUST exist and fail before the first
  implementation line is written.
- Edge-case tests from the story's "Edge Cases & Negative Scenarios" table
  MUST be written alongside the AC tests, not deferred.

### IV. Scope Protection — Phase 1 MVP Guard

AI MUST actively identify and reject any feature, behavior, data model
addition, or UI element that belongs to a phase beyond Phase 1 MVP.

- Phase 1 MVP is defined as: all P1 (Must) stories in
  `specs/prd-innovatepam.md` sections 5 and 6 (US-001 through US-013 and
  US-016). This phase is complete when all these stories have passing tests
  and the GA smoke test passes.
- Phase 2+ features explicitly out of scope until Phase 1 is declared
  complete by the project owner include (non-exhaustive):
  - Multi-file attachments or drag-and-drop galleries
  - Social features: comments, upvoting, reactions, @mentions
  - Smart/AI-assisted form completion
  - Multimedia idea submissions (video, audio)
  - GDPR data export / account deletion
  - External SSO (SAML, OAuth with corporate IdP)
  - Advanced analytics beyond the Phase 1 analytics page (US-014)
  - Notifications / email digests beyond verification email
- When a user requests a Phase 2+ feature, AI MUST respond:
  "This feature is not in Phase 1 MVP scope. It is deferred to Phase 2.
  Should I log it as an open question in the PRD, or would you like to
  formally scope it into an existing story?"

### V. Traceability & Auditability

Every generated artifact MUST be traceable to a spec.

- Commit messages MUST reference the Story ID and optionally the AC:
  `feat(auth): implement email verification — US-005 AC-1 to AC-3`
- No commit MUST contain changes spanning more than one User Story unless
  the story file explicitly lists a shared dependency.
- When AI generates code, it MUST add a one-line comment citing the story
  at every non-obvious guard, state transition, or business rule:
  `// US-007 AC-5: SUPERADMIN cannot demote themselves`
- Any placeholder, TODO, or deferred item in generated code MUST be in the
  format `// TODO(US-XXX): reason` so it is traceable to a story.

---

## 2. Quality Gates

The following gates are mandatory before any story can be considered done.
All gates are enforced in CI (`npm run lint && npm run test:unit && npm run build`).
A story that fails any gate MUST NOT be merged to `main`.

| Gate | Threshold | Enforced By |
|------|-----------|-------------|
| TypeScript compilation | Zero errors | `npm run build` |
| ESLint | Zero warnings or errors | `npm run lint` |
| Unit + integration test pass | 100% of story's AC tests pass | `npm run test:unit` |
| Line coverage (overall) | ≥ 80% | Vitest coverage threshold |
| E2E critical paths (at GA) | All 4 Playwright paths pass | `npm run test:e2e` |
| Smoke test (production) | All 6 URL checks pass | Manual (US-016 checklist) |

**No exceptions.** Coverage threshold violations, TypeScript errors, and
lint failures are not "acceptable for now" — they are blockers.

---

## 3. Required Implementation Workflow

This is the mandatory step sequence for every User Story. Skipping or
reordering steps is a Constitution violation.

```
Step 1 — READ THE SPEC
  Open the assigned Story file: specs/stories/epicXX/US-XXX-*.md
  Read: Story Statement, ALL Acceptance Criteria, Edge Cases table,
  Technical Notes, Dependencies, and Definition of Done.
  Cross-reference: specs/prd-innovatepam.md for the corresponding
  Functional Requirement (FR-XX).
  Output: Confirm understanding by listing each AC number before proceeding.
  GATE: If any dependency story is incomplete, STOP and resolve it first.

Step 2 — WRITE FAILING TESTS (RED phase)
  Create the test file at __tests__/<layer>/<story-slug>.test.ts
  Write one test per Acceptance Criterion (Given/When/Then format).
  Write tests for every row in the Edge Cases table.
  Run: npm run test:unit -- <test-file> → ALL tests MUST fail.
  GATE: No test may pass before implementation. If tests pass without
  implementation, the test is wrong — fix it.

Step 3 — IMPLEMENT TO PASS TESTS (GREEN phase)
  Write only the code necessary to make the failing tests pass.
  Do not add functionality not covered by a test.
  Cite the AC in comments at every guard, state transition, or rule.
  Run: npm run test:unit -- <test-file> → ALL tests MUST now pass.
  Run: npm run test:unit -- --coverage → coverage MUST remain ≥ 80%.
  Run: npm run build && npm run lint → both MUST pass.

Step 4 — STOP AND PROMPT FOR COMMIT
  AI MUST NOT auto-commit. Present the following for user approval:

  "✅ US-XXX complete. All [N] AC tests pass. Coverage [X]%.
  
  Suggested commit:
  feat(<scope>): <description> — US-XXX AC-1 to AC-N
  
  Files changed:
  [list of changed files]
  
  Ready to commit and move to US-XXX+1?"
```

---

## Governance

- This Constitution supersedes all other practices, conventions, and
  preferences expressed in any other file in this repository, including
  README files, inline comments, and chat instructions.
- Amendments require: (1) a documented rationale, (2) explicit approval
  from the project owner, (3) a version bump following semantic versioning
  rules (MAJOR: principle removal or redefinition; MINOR: new principle or
  section; PATCH: wording clarification).
- SHOULD language in this document means "strongly recommended; deviation
  requires documented justification." MUST language means "non-negotiable;
  no exceptions."
- All PRs/merges MUST be verified against the Constitution Check gate in
  the plan template (`.specify/templates/plan-template.md`) before
  implementation begins.
- This document MUST be reviewed whenever a new Epic is started. If a new
  Epic introduces governance needs not covered here, an amendment MUST be
  proposed before the Epic's first story is implemented.
- Complexity, scope additions, and architectural choices not covered by
  this Constitution MUST be justified in writing (in the relevant story
  file's "Open Questions" section) before AI acts on them.

**Version**: 1.0.0 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-24
