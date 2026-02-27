# Data Model Checklist: Multi-Stage Review

**Purpose**: Validate the quality, completeness, and clarity of `data-model.md` requirements — testing the requirements document itself, not the implementation.
**Created**: 2026-02-26
**Feature**: [specs/001-multi-stage-review/data-model.md](../data-model.md)

---

## Requirement Completeness

- [ ] CHK001 — Is `onDelete` behavior specified for the `IdeaStageProgress → ReviewPipelineStage` relation? Currently absent — if a stage is deleted mid-flight, the cascade rule is undefined. [Gap, Data Model §2 IdeaStageProgress]
- [ ] CHK002 — Is `onDelete` behavior specified for the `IdeaStageProgress → User (reviewer)` relation? A reviewer account deletion could leave orphaned progress rows with no documented handling. [Gap, Data Model §2 IdeaStageProgress]
- [ ] CHK003 — Are `updatedAt` audit fields specified (or explicitly omitted) for `ReviewPipelineStage` and `IdeaStageProgress`? `ReviewPipeline` has `@updatedAt`; the absence on the other two models should be a deliberate decision, not an omission. [Completeness, Data Model §2]
- [ ] CHK004 — Is an `AuditAction` value for pipeline deletion specified? §4 of the contracts omits a `PIPELINE_DELETED` entry; the data model's AuditAction additions list should explicitly state whether deletion is intentionally unaudited. [Gap, Data Model §1]
- [ ] CHK005 — Are the V1 `IdeaReview` rows for in-flight ideas addressed? The soft-deprecation note says "compatibility" but no migration rule is specified for ideas that entered `UNDER_REVIEW` status before the flag was enabled. [Gap, Data Model §4]
- [ ] CHK006 — Is the maximum number of stages per pipeline defined? A minimum of 2 is documented but no upper bound is specified — unbounded stage counts could create UX and query performance issues. [Gap, Data Model §2 ReviewPipelineStage]
- [ ] CHK007 — Are requirements defined for co-existence of V1 (`IdeaReview`) and V2 (`IdeaStageProgress`) review rows for the same idea? Possible if feature flag is toggled during an active review cycle. [Gap, Data Model §4]

---

## Requirement Clarity

- [ ] CHK008 — Is `isDefault` semantics unambiguously defined? The data model says "cannot be deleted" but does not state whether `isDefault` controls routing logic (e.g., fallback when no pipeline matches), or whether multiple non-default pipelines per category are possible. [Ambiguity, Data Model §2 ReviewPipeline]
- [ ] CHK009 — Is "FK-by-convention" for `categorySlug` sufficiently defined? The note says it references the `CATEGORIES` constant but does not specify what happens at the DB or application layer if an invalid slug is stored. [Ambiguity, Data Model §2 ReviewPipeline]
- [ ] CHK010 — Is the `comment` field nullability contract fully specified? The model says "null until stage is completed" but the Validation Rules table allows `comment` to be absent even after `completedAt` is set — this conflict should be resolved explicitly. [Ambiguity, Data Model §2 IdeaStageProgress vs §7]
- [ ] CHK011 — Is the outcome/stage-type compatibility enforcement approach clearly described? §7 notes "Zod in `complete-stage.ts`" but the contract contract notes "can't be pure Zod — enforce in action pre-condition" — the data model spec should unambiguously state where this rule lives and why DB-level enforcement is absent. [Ambiguity, Data Model §7]
- [ ] CHK012 — Is the distinction between "pipeline deletion blocked by `isDefault`" (403) and "pipeline deletion blocked by in-flight progress" (409) clearly documented in the data model (not just the contracts)? [Clarity, Data Model §7]
- [ ] CHK013 — Is "contiguous starting at 1" order enforcement fully defined for the seed case? The seed upsert uses `categorySlug` as the key but it is not specified whether stages within a seeded pipeline are upserted by `id`, `order`, or `name` — leaving the idempotency strategy incomplete. [Ambiguity, Data Model §6]

---

## Requirement Consistency

- [ ] CHK014 — Are the `StageOutcome` values consistent between the data model and the contract specs? The data model defines `ESCALATE` as an outcome but `resolve-escalation` contract uses `action: 'PASS' | 'REJECT'` (not `StageOutcome`). This asymmetry should be documented and justified in the data model. [Consistency, Data Model §1 vs contracts/resolve-escalation.md]
- [ ] CHK015 — Is `name` max-length consistent across all documents? The data model states "no max at DB level (Zod handles max 80 chars)" for `ReviewPipeline.name` and "max 60 chars (Zod-validated)" for `ReviewPipelineStage.name`, but the Validation Rules table in §7 correctly lists both — confirm no spec-level drift. [Consistency, Data Model §2 vs §7]
- [ ] CHK016 — Does the `AuditAction` additions list in the data model align with all audit writes described in every contract? Cross-check: `claim-stage` writes `STAGE_STARTED` + `IDEA_REVIEW_STARTED`; `IDEA_REVIEW_STARTED` is not listed as a new audit action in the data model. [Consistency, Data Model §1 vs contracts/claim-stage.md]
- [ ] CHK017 — Is the state transition table in §5 consistent with the existing `IdeaStatus` state machine? The data model says states are "unchanged" but adds new trigger semantics — confirm the state machine spec (`lib/state-machine/idea-status.ts` changes) is documented somewhere or referenced. [Consistency, Data Model §5]

---

## Acceptance Criteria Quality

- [ ] CHK018 — Can the "exactly one decision stage per pipeline" rule be objectively verified? It is Zod-only, not a DB constraint — is the acceptance criterion measurable for both the application layer and data integrity audits? [Measurability, Data Model §7]
- [ ] CHK019 — Is the seed idempotency claim ("upsert by `categorySlug`") testable without manual inspection? The upsert key for individual stages within a pipeline is not specified — making the idempotency guarantee incomplete and difficult to verify. [Measurability, Data Model §6]
- [ ] CHK020 — Are the "guard" constraints (stage in-use, pipeline in-use, default pipeline) specified with sufficient precision to write unit tests against? Each guard describes a DB query condition — confirm whether the exact query shape is defined or deferred to implementation. [Measurability, Data Model §7]

---

## Scenario Coverage

- [ ] CHK021 — Are requirements defined for the scenario where a pipeline's `categorySlug` needs to change? The `@unique` constraint makes re-assignment non-trivial; no swap/reassignment flow is documented. [Coverage, Gap]
- [ ] CHK022 — Are requirements defined for the scenario where all stages in a pipeline are completed with `PASS` but no decision stage is ever reached (e.g., misconfiguration)? [Coverage, Edge Case]
- [ ] CHK023 — Are requirements defined for concurrent claim attempts on the same idea by two ADMIN users? The data model relies on `@@unique([ideaId, stageId])` as a DB-level guard but the race condition between checking preconditions and inserting rows is not documented. [Coverage, Concurrency]
- [ ] CHK024 — Are requirements defined for the scenario where `FEATURE_MULTI_STAGE_REVIEW_ENABLED` is toggled off while ideas are actively in the multi-stage review pipeline? [Coverage, Feature Flag Edge Case]
- [ ] CHK025 — Are requirements specified for ideas submitted to a category whose pipeline has been deleted or reconfigured after claim-time? The snapshot-by-FK mechanism is cited in the contract but not in the data model itself. [Coverage, Data Model §2]

---

## Edge Case Coverage

- [ ] CHK026 — Is the behavior defined when `ReviewPipelineStage.order` gaps are introduced by partial updates? The `@@unique([pipelineId, order])` constraint prevents duplicates but does not enforce contiguity — a gap (e.g., orders 1, 3) could be stored. [Edge Case, Data Model §2]
- [ ] CHK027 — Is the behavior defined when a user completes Stage N and there is no Stage N+1 in the pipeline for a non-decision stage outcome of `PASS`? (Last stage is not a decision stage — orphaned terminal state.) [Edge Case, Data Model §5]
- [ ] CHK028 — Is the `IdeaStageProgress` row lifecycle defined for ideas that are withdrawn or archived before completing all stages? No `onDelete` interaction with `Idea` deletion path is documented beyond Cascade. [Edge Case, Data Model §2]

---

## Non-Functional Requirements

- [ ] CHK029 — Are query-performance requirements defined for the escalation queue? `@@index([outcome])` is specified, but no latency or row-count SLO is documented — leaving the index adequacy unmeasurable. [Non-Functional, Gap]
- [ ] CHK030 — Are data retention requirements defined for `IdeaStageProgress` and related audit records? No archiving, soft-delete, or purge policy is specified in the data model or spec. [Non-Functional, Gap]
- [ ] CHK031 — Is there a documented strategy for handling schema migration rollbacks? The data model describes additive changes but does not address the rollback footprint (e.g., dropping new columns if deploy fails). [Non-Functional, Gap]

---

## Dependencies & Assumptions

- [ ] CHK032 — Is the assumption that `categorySlug` values are stable (never renamed/removed) documented and validated? The `@unique` constraint on `categorySlug` means a slug rename would require a data migration. [Assumption, Data Model §2 ReviewPipeline]
- [ ] CHK033 — Is it documented that `IdeaReview` (V1 model) must remain queryable for historical/audit purposes even after V3.0 removal? The soft-deprecation note targets V3.0 removal but no archival or read-only access requirement is specified. [Assumption, Data Model §4]

---

## Ambiguities & Conflicts

- [ ] CHK034 — Does `isDefault = false` pipeline have any functional difference from `isDefault = true` beyond deletion protection? If not, is a boolean flag the right modeling choice vs. a separate "protected" constraint? [Ambiguity, Data Model §2 ReviewPipeline]
- [ ] CHK035 — Is the relationship between `StageOutcome.ESCALATE` (stored on the progress row) and the escalation queue display fully specified in the data model? The contracts define the queue query, but the data model does not reference it. [Ambiguity, Data Model §2 vs contracts/resolve-escalation.md]
