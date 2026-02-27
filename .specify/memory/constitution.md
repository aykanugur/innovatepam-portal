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

### IV. Scope Protection — Active Phase Guard

AI MUST actively identify and reject any feature, behavior, data model
addition, or UI element that has not been scoped into the current active
phase. The active phase is tracked below and MUST be amended when a new
phase begins.

**Current active phase: V2.0 — Multi-Stage Review Pipeline**

- Phase 1 MVP (US-001 to US-013, US-016) is ✅ COMPLETE. It was declared
  done and tagged `v1.0.0`. All Phase 1 gates passed.
- V2.0 is defined by the six epics in `specs/v2.0/`. The canonical source
  of truth is `specs/v2.0/prd-v2.0.md` and the Epic files under
  `specs/v2.0/epics/`. Only stories approved in those files are in scope.
- V2.0 epic status (as of 2026-02-27):
  - EPIC-V2-01 Foundation & Pipeline Infrastructure — ✅ Complete
  - EPIC-V2-02 Smart Forms — ✅ Complete
  - EPIC-V2-03 Claim & Complete Stage — ✅ Complete
  - EPIC-V2-04 Decision Stage & Final Transitions — ✅ Complete
  - EPIC-V2-05 Blind Review — ✅ Complete (merged 2026-02-26)
  - EPIC-V2-06 Scoring System — ✅ Complete (merged 2026-02-27)
- Features explicitly out of scope for V2.0 unless added to `prd-v2.0.md`:
  - Multi-file attachments or drag-and-drop galleries
  - Social features: comments, upvoting, reactions, @mentions
  - GDPR data export / account deletion
  - External SSO (SAML, OAuth with corporate IdP)
  - Notification digests / push alerts
  - AI-generated idea content
- When a user requests an out-of-scope feature, AI MUST respond:
  "This feature is not in the current V2.0 scope. Should I log it as an
  open question in prd-v2.0.md, or would you like to formally add it to
  EPIC-V2-06 or a new epic?"

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

| Gate                         | Threshold                     | Enforced By               |
| ---------------------------- | ----------------------------- | ------------------------- |
| TypeScript compilation       | Zero errors                   | `npm run build`           |
| ESLint                       | Zero warnings or errors       | `npm run lint`            |
| Unit + integration test pass | 100% of story's AC tests pass | `npm run test:unit`       |
| Line coverage (overall)      | ≥ 80%                         | Vitest coverage threshold |
| E2E critical paths (at GA)   | All 4 Playwright paths pass   | `npm run test:e2e`        |
| Smoke test (production)      | All 6 URL checks pass         | Manual (US-016 checklist) |

**No exceptions.** Coverage threshold violations, TypeScript errors, and
lint failures are not "acceptable for now" — they are blockers.

---

## 3. Canonical Project Structure

This is the authoritative directory layout. AI MUST place new files in the
correct location. Adding files elsewhere without justification is a violation.

```
innovatepam-portal/
├── app/                    Next.js App Router (pages + API route handlers)
│   ├── (auth)/             Unauthenticated pages: login, register, verify-email
│   ├── (main)/             Authenticated user pages: ideas, my-ideas
│   ├── admin/              Admin pages: queue, review, review-config, users, analytics
│   ├── api/                REST Route Handlers (auth, ideas, attachments, cron, test)
│   ├── dashboard/          Post-login redirect hub
│   ├── forbidden/          403 page
│   └── settings/           User profile settings
│
├── components/             React components (UI only — no DB calls)
│   ├── admin/              Admin workflow components (queue, stage panel, escalation)
│   ├── analytics/          Chart components
│   ├── auth/               Login/register forms
│   ├── ideas/              Idea card, form, detail, draft UI, score section
│   ├── pipeline/           Pipeline config form + stage row
│   ├── settings/           Profile forms
│   └── ui/                 shadcn/ui primitives (button, alert, tabs, tooltip, etc.)
│
├── lib/                    Server-side business logic
│   ├── actions/            ALL Server Actions (one concern per file, verb-noun names)
│   ├── state-machine/      Pure state transition validators (no DB, no side effects)
│   ├── validations/        Zod schemas (idea, pipeline, review, user, draft, attachment)
│   ├── generated/prisma/   Prisma generated types — do NOT edit
│   ├── auth-utils.ts       hasRole() helper + session re-read patterns
│   ├── blind-review.ts     maskAuthorIfBlind() — EPIC-V2-05
│   ├── db.ts               Prisma client singleton
│   ├── email.ts            Resend email sender
│   ├── env.ts              Zod-validated environment variables (single source)
│   ├── rate-limit.ts       Upstash rate limiter
│   ├── storage.ts          Vercel Blob helpers
│   ├── api-error.ts        Typed API error factory
│   └── utils.ts            cn() + general utilities
│
├── constants/              Static data (categories, field templates, status badges)
├── types/                  TypeScript type declarations (augmented next-auth, etc.)
│
├── prisma/
│   ├── schema.prisma       Single source of truth for the data model
│   ├── seed.ts             Dev seed
│   └── migrations/         Applied migrations — NEVER edit manually
│
├── tests/
│   ├── unit/               Vitest unit tests (mocked DB) — test path for server actions
│   │   ├── actions/        → tests/unit/actions/<action-name>.test.ts
│   │   ├── lib/            → tests/unit/lib/<util-name>.test.ts
│   │   └── *.test.ts       → tests/unit/<module>.test.ts
│   ├── integration/        Vitest integration tests (real DB required)
│   └── e2e/                Playwright end-to-end tests
│
├── specs/                  All product specifications (READ-ONLY for implementation)
│   ├── prd-innovatepam.md  V1 PRD
│   ├── epics/              V1 Epic files
│   ├── stories/epic-XX/    V1 User Stories (US-001 to US-016)
│   └── v2.0/               V2.0 all specs
│       ├── prd-v2.0.md
│       ├── epics/          V2 Epic files (EPIC-V2-01 to V2-06)
│       ├── stories/epic-v2-XX/   V2 User Stories (US-017 to US-044)
│       └── 001-*/          Sprint-level specs with contracts, plans, tasks
│
├── scripts/                One-off admin scripts (run with `npx tsx scripts/<name>.ts`)
├── memory-banks/           AI context files — load before coding (do not move)
├── public/                 Static assets + local dev uploads
│
├── auth.ts                 Auth.js v5 configuration
├── proxy.ts                Route protection + RBAC middleware (replaces middleware.ts)
├── next.config.ts          Next.js config
├── prisma.config.ts        Prisma config
├── vercel.json             Vercel cron + headers
├── vitest.config.ts        Test + coverage config
├── playwright.config.ts    E2E config
├── components.json         shadcn/ui registry
└── README.md               Developer onboarding (start here)
```

### File Placement Rules

| New artifact         | Correct location                                 |
| -------------------- | ------------------------------------------------ |
| New page             | `app/<route>/page.tsx`                           |
| New API endpoint     | `app/api/<resource>/route.ts`                    |
| New Server Action    | `lib/actions/<verb>-<noun>.ts`                   |
| New Zod schema       | `lib/validations/<domain>.ts`                    |
| New pure utility     | `lib/<utility-name>.ts`                          |
| New state machine    | `lib/state-machine/<domain>.ts`                  |
| New React component  | `components/<domain>/<ComponentName>.tsx`        |
| New constant         | `constants/<name>.ts`                            |
| New unit test        | `tests/unit/<layer>/<module>.test.ts`            |
| New integration test | `tests/integration/<feature>.test.ts`            |
| New E2E test         | `tests/e2e/<feature>.spec.ts`                    |
| New V2 story         | `specs/v2.0/stories/epic-v2-XX/US-XXX-<slug>.md` |
| New V2 epic          | `specs/v2.0/epics/EPIC-V2-XX-<slug>.md`          |

---

## 4. Required Implementation Workflow

This is the mandatory step sequence for every User Story. Skipping or
reordering steps is a Constitution violation.

```
Step 1 — READ THE SPEC
  V1 stories: specs/stories/epic-XX/US-XXX-*.md
  V2 stories: specs/v2.0/stories/epic-v2-XX/US-XXX-*.md  ← current active path
  Read: Story Statement, ALL Acceptance Criteria, Edge Cases table,
  Technical Notes, Dependencies, and Definition of Done.
  Cross-reference: specs/prd-innovatepam.md (V1) or specs/v2.0/prd-v2.0.md (V2)
  for the corresponding Functional Requirement.
  Output: Confirm understanding by listing each AC number before proceeding.
  GATE: If any dependency story is incomplete, STOP and resolve it first.

Step 2 — WRITE FAILING TESTS (RED phase)
  Unit tests   → tests/unit/<layer>/<story-slug>.test.ts
  Integration  → tests/integration/<story-slug>.test.ts
  (Do NOT use __tests__/ — that directory does not exist in this project)
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

**Version**: 1.2.1 | **Ratified**: 2026-02-24 | **Last Amended**: 2026-02-27

> **v1.2.1 changelog** (2026-02-27): Step 1 V2 story path corrected from
> `specs/v2.0/stories/US-XXX-*.md` → `specs/v2.0/stories/epic-v2-XX/US-XXX-*.md` to match
> actual directory layout. Step 1 V1 path corrected `epicXX` → `epic-XX`. PATCH bump.
>
> **v1.2.0 changelog** (2026-02-27): Added §3 "Canonical Project Structure" — authoritative
> directory layout, file placement rules, and spec path reference for V1 + V2.0.
> Former §3 "Required Implementation Workflow" renumbered to §4. MINOR bump.
>
> **v1.1.0 changelog** (2026-02-27): Principle IV updated — Phase 1 MVP
> declared complete; replaced with V2.0 Active Phase Guard tracking current
> epic status. Step 2 test path corrected from `__tests__/` to `tests/unit/`
> and `tests/integration/`. Step 1 spec path updated for V2.0 story location.
