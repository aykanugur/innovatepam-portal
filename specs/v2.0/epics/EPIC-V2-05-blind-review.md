# Epic: Blind Review

**Epic ID**: EPIC-V2-05
**Owner**: Aykan Uğur — Admin
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Target Release**: V2.0 Phase 6 (~20 min)
**PRD Reference**: [specs/v2.0/prd-v2.0.md](../prd-v2.0.md) — Section 9
**Depends On**: [EPIC-V2-04 — Multi-Stage Review](./EPIC-V2-04-multi-stage-review.md) (`ReviewPipeline` model must exist)

---

## 1. Summary

Add a `blindReview` boolean toggle to the `ReviewPipeline` model. When enabled, every admin who opens an idea from that pipeline sees the submitter's identity replaced with "Anonymous Submitter" and their email hidden entirely. The masking is a display-layer concern only — the database always stores true relationships, and the audit log always shows real actor names. Once the decision stage records `ACCEPTED` or `REJECTED`, the submitter's identity is automatically revealed to the reviewer. `SUPERADMIN` users bypass masking at all times. The submitter's own view is never affected. No new models are required.

---

## 2. Business Context

### 2.1 Strategic Alignment

- **Company Goal**: Improve evaluation objectivity in V2.0 to increase employee trust in the review process.
- **Product Vision Fit**: Research consistently shows unconscious bias toward seniority, team affiliation, and familiarity skews idea evaluations. Blind review is a lightweight, targeted mechanism to neutralise this at the display layer without overhauling the evaluation pipeline.

### 2.2 Business Value

| Value Driver           | Description                                                                       | Estimated Impact                                                                    |
| ---------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Evaluation objectivity | Reviewers assess idea merit, not author reputation                                | V2.0 Success Metric: < 20% of admins report bias concern post blind-review (survey) |
| Submitter confidence   | Junior or less-visible employees submit ideas they'd otherwise withhold           | Broader idea pool; more diverse submissions                                         |
| Incremental cost       | One boolean field + display-layer masking — no new model, no migration complexity | Lowest implementation cost of any V2.0 phase                                        |

### 2.3 Cost of Delay

Without blind review, the pipeline configured in Phase 5 remains susceptible to the same identity-driven bias that exists in V1. Submitters who are aware of this dynamic self-censor — particularly junior employees, employees in minority teams, or those who've previously had ideas dismissed by rank.

---

## 3. Scope

### 3.1 In Scope

- `blindReview Boolean @default(false)` added to `ReviewPipeline` model (from EPIC-V2-04)
- Prisma migration for the new field
- Blind review toggle on `/admin/review-config` pipeline editor (SUPERADMIN only): labelled "Enable Blind Review" with a tooltip explaining scope and limitations
- Identity masking logic: server-side, applied when constructing the idea detail response for an admin request against a blind-review pipeline
- Fields masked for `ADMIN` role when `blindReview=true` and idea is active (not yet decided):
  - `author.displayName` → `"Anonymous Submitter"`
  - `author.email` → field omitted entirely from the API response
  - "Submitted by" in idea metadata → `"Anonymous"`
- Fields never masked: title, description, category, dynamic fields, attachments, status, stage progress
- Post-decision reveal: once `Idea.status` is `ACCEPTED` or `REJECTED`, the true author identity is returned in all API responses regardless of `blindReview` setting
- `SUPERADMIN` bypass: identity is always returned in full regardless of `blindReview` flag
- Submitter self-view: unchanged — submitters always see their own name on their ideas
- Audit log: never masked — always returns true `actorId` and actor name
- Feature flag: `FEATURE_BLIND_REVIEW_ENABLED` (default `false`) — when `false`, `blindReview` field is ignored and identity is always shown

### 3.2 Out of Scope

- Automated conflict-of-interest detection (e.g., blocking a manager from reviewing a direct report's idea) — deferred to V3.0
- Masking the submitter identity in audit log entries — explicitly documented as out of scope in PRD; audit traceability supersedes objectivity concerns
- Per-stage blind review (blind only for Stage 1, not Stage 2) — the `blindReview` toggle applies to all stages in the pipeline
- Hiding the submitter's identity in the ideas list page (`/ideas`) — masking applies only to the idea detail page and review panel
- Retroactive masking of already-decided ideas — once `ACCEPTED`/`REJECTED`, identity is always revealed

### 3.3 Assumptions

- EPIC-V2-04 is merged and `ReviewPipeline` model exists before this epic starts
- Masking is enforced server-side when building the API/RSC response — the client never receives unmasked identity fields for a blind-review idea in active review
- `blindReview` changes take effect immediately for all current in-progress reviews in that pipeline (no grandfather clause for in-flight ideas)
- `FEATURE_BLIND_REVIEW_ENABLED=false` in production until QA sign-off

---

## 4. User Personas

| Persona            | Role          | Primary Need                                                                                                                     |
| ------------------ | ------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Deniz (Admin)      | Innovation PM | Evaluate ideas purely on content — not influenced by whether the author is her direct peer or a junior employee she doesn't know |
| Elif (Submitter)   | EPAM employee | Know that her idea is evaluated on its merits, not on her job title or team — reducing the self-censorship she'd otherwise apply |
| Aykan (Superadmin) | Portal owner  | Configure blind review per pipeline; retain full identity visibility for escalation and conflict-of-interest handling            |

---

## 5. Feature Breakdown

### Feature 1: `blindReview` Field & Migration — Must Have

**Description**: Add `blindReview Boolean @default(false)` to the `ReviewPipeline` model. Run Prisma migration. All existing and new pipelines default to `blindReview=false` — no behavioural change until a SUPERADMIN explicitly enables it.

**User Stories**:

- [ ] As a developer, `prisma migrate dev` applies the new column without errors.
- [ ] As the system, all existing `ReviewPipeline` rows have `blindReview=false` after migration with no manual backfill.

**Acceptance Criteria**:

1. `prisma migrate dev` applies cleanly; `ReviewPipeline` table gains a non-nullable `blindReview` column with a `DEFAULT false` constraint
2. All existing `ReviewPipeline` rows (including the 5 default pipelines seeded by EPIC-V2-04) have `blindReview=false` after migration
3. No data migration script required

**Estimated Effort**: XS (~3 min)

---

### Feature 2: Blind Review Toggle on Pipeline Config UI — Must Have

**Description**: The `/admin/review-config` pipeline editor (built in EPIC-V2-04) gains an "Enable Blind Review" toggle switch per pipeline. Toggling and saving updates `ReviewPipeline.blindReview`. A tooltip explains: "When enabled, reviewers see 'Anonymous Submitter' instead of the author's name until the final decision is recorded. SUPERADMIN users always see the true identity."

**User Stories**:

- [ ] US-V2-05-a: As SUPERADMIN, I can toggle "Enable Blind Review" on any pipeline in `/admin/review-config` and save — the change is persisted immediately.
- [ ] US-V2-05-b: As SUPERADMIN enabling blind review on a pipeline that has ideas currently `UNDER_REVIEW`, I see a warning: "Blind review will apply immediately to all active reviews in this pipeline. Reviewers currently viewing these ideas must refresh their browser."
- [ ] US-V2-05-c: As ADMIN (non-superadmin), the blind review toggle is not visible in the config UI, and the `PATCH /api/admin/pipelines/[id]` endpoint returns `403` if I attempt to set `blindReview` directly.

**Acceptance Criteria**:

1. Toggle renders as a labelled switch component (shadcn/ui `Switch`) with the tooltip text from the PRD
2. Saving with `blindReview=true` when the pipeline has `IdeaStageProgress` rows with `completedAt=null` shows an inline warning banner — save is still permitted (not blocked)
3. `PIPELINE_UPDATED` audit entry is written on every toggle save with `metadata: { field: "blindReview", newValue: true/false }`
4. `ADMIN` role cannot set `blindReview` — server enforces `SUPERADMIN` only; `403` returned for `ADMIN` attempts
5. Toggle change takes effect on the next page load for any admin — no stale cache served

**Estimated Effort**: XS (~5 min)

---

### Feature 3: Server-Side Identity Masking — Must Have

**Description**: When constructing the idea detail response (RSC or Route Handler), check if the idea's pipeline has `blindReview=true` AND `Idea.status` is not `ACCEPTED`/`REJECTED` AND the requester's role is `ADMIN`. If all three conditions are met, replace `author.displayName` with `"Anonymous Submitter"` and omit `author.email` from the serialised response. `SUPERADMIN` always receives the full author object.

**User Stories**:

- [ ] US-V2-05-d: As ADMIN viewing a blind-review idea that is `UNDER_REVIEW`, I see "Anonymous Submitter" in place of the author's display name; the email field is absent from the page.
- [ ] US-V2-05-e: As ADMIN viewing the same idea after it has been decided (`ACCEPTED` or `REJECTED`), I now see the true author display name and email — the masking has been lifted automatically.
- [ ] US-V2-05-f: As SUPERADMIN viewing a blind-review idea at any stage, I always see the true author display name and email.
- [ ] US-V2-05-g: As a SUBMITTER viewing my own blind-review idea, I see my own name — the masking never applies to the author's self-view.
- [ ] US-V2-05-h: As ADMIN attempting to call the idea detail API directly, the server returns a masked response — the true identity is not present in any field of the JSON payload.

**Acceptance Criteria**:

1. Masking is applied server-side — no client-side conditional rendering of identity; the true `displayName` and `email` are never included in the serialised response sent to an `ADMIN` on a blind-review active idea
2. Masking conditions (all must be true to apply): `pipeline.blindReview === true` AND `idea.status` is `SUBMITTED` or `UNDER_REVIEW` AND requester role is `ADMIN`
3. Post-decision reveal (any one condition removes masking): `idea.status === ACCEPTED` or `idea.status === REJECTED`; OR requester role is `SUPERADMIN`; OR requester is the idea's own author
4. The masked API response contains: `author: { displayName: "Anonymous Submitter" }` — the `email` key is absent, not null
5. The unmasked API response (post-decision or SUPERADMIN) contains the full `author` object including `displayName` and `email`
6. `FEATURE_BLIND_REVIEW_ENABLED=false` causes all masking logic to be skipped — identity is always returned in full regardless of `pipeline.blindReview`

**Estimated Effort**: S (~8 min)

---

### Feature 4: Audit Log Exemption — Must Have

**Description**: Ensure the audit log view and API endpoint never apply blind review masking. The `AuditLog` query always joins the true `actor.displayName` and `actor.email` regardless of any pipeline's `blindReview` setting. This is explicitly documented in code with a comment.

**User Stories**:

- [ ] US-V2-05-i: As ADMIN viewing the audit log for a blind-review idea, I see the true actor name on all audit entries — not "Anonymous Submitter."

**Acceptance Criteria**:

1. The audit log Server Action / Route Handler that fetches `AuditLog` records never applies the blind review masking function
2. A code comment is placed on the audit log query: `// Blind review masking is intentionally NOT applied here — audit traceability supersedes objectivity. See PRD V2.0 Section 9.`
3. A unit test asserts: given `pipeline.blindReview=true` and `idea.status=UNDER_REVIEW`, the audit log API for that idea still returns the true actor `displayName`

**Estimated Effort**: XS (~4 min)

---

## 6. Dependencies

### 6.1 Blocked By (Upstream)

| Dependency                                                                                      | Type | Status               | Risk                                            |
| ----------------------------------------------------------------------------------------------- | ---- | -------------------- | ----------------------------------------------- |
| EPIC-V2-04 (Multi-Stage Review) — `ReviewPipeline` model with `category`, `isDefault`, `stages` | V2.0 | Must be merged first | High — this epic cannot start without the model |
| `/admin/review-config` pipeline editor UI (EPIC-V2-04 Feature 2)                                | V2.0 | Must be merged first | High — the toggle is added to this existing UI  |

### 6.2 Blocking (Downstream)

| Dependent Epic       | Impact if EPIC-V2-05 is Delayed                                     |
| -------------------- | ------------------------------------------------------------------- |
| EPIC-V2-06 (Scoring) | No hard dependency — scoring is independent of blind review masking |

---

## 7. UX / Design

- **Toggle placement on pipeline config**: Below the stage list in the pipeline editor accordion. Full-width row: `[Switch] Enable Blind Review` + info icon that shows the tooltip on hover. Toggle is disabled (greyed) when `FEATURE_BLIND_REVIEW_ENABLED=false` with tooltip: "Blind review is currently disabled by a feature flag."
- **In-flight warning banner**: An amber `Alert` (shadcn/ui) appears inline above the save button when toggling on a pipeline with active reviews: "Blind review will apply immediately to all active reviews in this pipeline. Reviewers currently viewing these ideas must refresh."
- **Masked idea detail page (ADMIN view)**: The "Submitted by" metadata row shows `Anonymous` with a grey eye-slash icon. No other visual change — the rest of the idea content renders normally.
- **Post-decision reveal**: No special animation or banner — the author name simply renders normally on the next page load after the decision is recorded. No "identity revealed" toast is shown.
- **SUPERADMIN view**: Identical to the normal unmasked view at all times — no visual indicator that blind review is active for SUPERADMIN (to avoid drawing attention to the bypass).
- **Audit log**: No visual change — the audit log always shows real names.

---

## 8. Technical Notes

- **Masking is a serialisation concern, not a DB concern.** The server always fetches the full `author` object from the database. The masking function (`maskAuthorIfBlind(author, pipeline, session, ideaStatus)`) is applied during response serialisation, before the data is sent to the client. It must never be applied to the raw Prisma result used by the audit trail.
- **Masking function signature** (place in `lib/auth-utils.ts` or a new `lib/blind-review.ts`):
  ```ts
  function maskAuthorIfBlind(
    author: { displayName: string; email: string },
    pipeline: { blindReview: boolean } | null,
    requesterRole: Role,
    ideaStatus: IdeaStatus
  ): { displayName: string; email?: string }
  ```
- **RSC vs. Route Handler parity**: The masking function must be called in both the RSC page component (`app/ideas/[id]/page.tsx`) and any Route Handler that returns idea author data (`GET /api/ideas/[id]`). Add a shared helper to prevent divergence.
- **V1 ideas (no pipeline)**: Ideas reviewed under V1 (`IdeaReview` model, no `ReviewPipeline`) have `pipeline = null`. The masking function must treat `pipeline = null` as `blindReview = false` — identity is never masked for V1 ideas.
- **Feature flag check**: The `FEATURE_BLIND_REVIEW_ENABLED` env var check must be the first condition evaluated in the masking function — returning the unmasked author immediately if the flag is `false`, without checking any pipeline or role conditions.

---

## 9. Milestones & Timeline

| Milestone             | Features Included | Target                           | Exit Criteria                                                                                                                       |
| --------------------- | ----------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| M1 — DB               | Feature 1         | Phase 6 start                    | Migration applied; all existing pipelines have `blindReview=false`                                                                  |
| M2 — Config & Masking | Features 2, 3, 4  | Phase 6 complete (~20 min total) | Toggle saves correctly; admin sees masked identity; SUPERADMIN sees real identity; audit log unmasked; feature flag toggles cleanly |

---

## 10. Success Metrics

| Metric                       | Target                                                                                                                                    |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Migration clean              | `blindReview` column added; all existing rows default `false`                                                                             |
| Masking enforced server-side | `GET /api/ideas/[id]` with `ADMIN` session on blind-review active idea returns no `email` field and `displayName = "Anonymous Submitter"` |
| Post-decision reveal         | Same endpoint after `ACCEPTED`/`REJECTED` returns true author data                                                                        |
| SUPERADMIN bypass            | `GET /api/ideas/[id]` with `SUPERADMIN` session returns true author data regardless of `blindReview`                                      |
| Audit log exemption          | Audit log API returns true actor names on all entries regardless of blind review setting                                                  |
| Test coverage                | ≥ 80% line coverage on `maskAuthorIfBlind()` function covering all condition branches                                                     |

---

## 11. Risks & Mitigations

| #   | Risk                                                                                                                                                            | Likelihood | Impact | Mitigation                                                                                                                                                                                                                                      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | ------------------------------------- |
| 1   | Masking applied in the RSC page but missed in a Route Handler that also returns author data — leaking true identity via API                                     | Med        | High   | Centralise all masking in a single shared `maskAuthorIfBlind()` utility. Add an integration test that calls both the RSC-rendered page and the Route Handler with an `ADMIN` session and asserts the `email` field is absent in both responses. |
| 2   | `SUPERADMIN` bypass silently breaks if role check uses a loose equality (`==` instead of strict enum comparison)                                                | Low        | High   | Use the typed `Role` enum from Prisma in the masking function — no string literals. TypeScript strict mode prevents accidental loose comparison.                                                                                                |
| 3   | Toggling `blindReview` on a pipeline with active reviews affects an admin who already has the idea detail page open — stale identity data visible until refresh | Med        | Low    | Document in the toggle warning banner (Feature 2, AC-2). The idea detail page always re-fetches data on navigation — this is a "stale tab" issue, not a routing bug. Mark as acceptable in V2.0.                                                |
| 4   | V1 ideas (no `ReviewPipeline`) accidentally trigger a null-reference error in the masking function when `pipeline` is `null`                                    | Low        | Med    | Explicitly handle `pipeline = null` as the first guard in `maskAuthorIfBlind()`: `if (!pipeline                                                                                                                                                 |     | !pipeline.blindReview) return author` |

---

## 12. Open Questions

| #   | Question                                                                                                                                                                                                                                                                                                       | Owner      | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1   | Should the submitter be informed that their idea is in a blind-review pipeline? (PRD is silent on this; the submitter experience is described as "unchanged.") Recommendation: no disclosure to the submitter — informing them may change how they write their idea description to signal identity indirectly. | Aykan Uğur | Open   |
| 2   | When `blindReview` is toggled from `true` back to `false` on a pipeline mid-review, should in-progress reviews immediately reveal identities? (Recommendation: yes — the toggle is the live source of truth; no grandfather clause.)                                                                           | Aykan Uğur | Open   |
| 3   | Should the ideas list page (`/ideas`) also mask the "Submitted by" column for blind-review pipeline ideas, or only the detail page? (PRD specifies detail page and review panel. Recommendation: list page also masked — consistency prevents admins from learning the identity before opening the detail.)    | Aykan Uğur | Open   |

---

## Appendix: Revision History

| Version | Date       | Author     | Changes                                                           |
| ------- | ---------- | ---------- | ----------------------------------------------------------------- |
| 0.1     | 2026-02-25 | Aykan Uğur | Initial draft — all sections complete based on PRD V2.0 Section 9 |
