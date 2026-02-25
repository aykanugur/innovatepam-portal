# Product Requirements Document: InnovatEPAM Portal — Version 2.0

**Document Owner**: Aykan Uğur — Admin
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Version**: 2.0
**Builds on**: [V1 PRD](../prd-innovatepam.md)
**Template**: `specs/prd-innovatepam.md` (V1 PRD style) + `.agents/skills/prd-mastery-context-aware-expert-driven-and-token-efficient-refinement/SKILL.md`

---

## 1. Executive Summary

InnovatEPAM Portal Version 2.0 evolves the platform from a basic idea-capture tool into a fully-featured innovation management system. Version 1.0 established the core loop: register → submit → review → decide. Version 2.0 deepens the quality of submissions, the flexibility of the review pipeline, and the integrity of evaluations. These six phases address the most critical gaps identified after V1 launch: forms that don't adapt to the type of idea, a single-file-only attachment constraint, no way to save work-in-progress, a rigid two-step review that can't be customized, reviewers who are influenced by the submitter's identity, and no quantitative scoring to complement qualitative decisions.

---

## 2. V1 Recap — What Was Built

> This section provides full context for any new contributor. Skip to Section 3 if you are already familiar with V1.

### 2.1 Scope Delivered in V1

| Area                | What Was Built                                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication**  | Email + password registration, email verification (feature-flagged), login/logout with secure JWT sessions                                                                 |
| **Roles**           | Three roles: `SUBMITTER`, `ADMIN`, `SUPERADMIN`. All new accounts default to `SUBMITTER`. Superadmin promotes/demotes via `/admin/users`.                                  |
| **Idea Submission** | Title (max 150 chars), description (max 5,000 chars), category (5 fixed values), visibility (`PUBLIC`/`PRIVATE`), single optional attachment (PDF/PNG/JPG/DOCX/MD, ≤ 5 MB) |
| **Idea Lifecycle**  | `SUBMITTED → UNDER_REVIEW → ACCEPTED / REJECTED`. State machine enforced server-side.                                                                                      |
| **Review Workflow** | Admin clicks "Start Review" (→ `UNDER_REVIEW`), then "Accept" or "Reject" with mandatory comment (min 10 chars)                                                            |
| **Admin Views**     | Dashboard stats, pending queue, review action panel, abandon review (SUPERADMIN only)                                                                                      |
| **Analytics**       | Ideas by category chart, submission trend chart, top contributors table                                                                                                    |
| **Settings**        | Display name update, password change                                                                                                                                       |

### 2.2 Current Prisma Schema (V1 Baseline)

The following models and enums exist in production at the start of V2.0 development:

**Enums**: `Role`, `IdeaStatus` (`SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, `REJECTED`), `IdeaVisibility`, `ReviewDecision`, `AuditAction`

**Models**: `User`, `Idea`, `IdeaReview`, `AuditLog`, `VerificationToken`

**Key field to note on `Idea`**: `attachmentPath String?` — a single nullable string pointing to a Vercel Blob URL. This is replaced in Phase 3.

---

## 3. V2.0 Goals & Success Metrics

| Goal                               | Metric                                      | V1 Baseline     | V2.0 Target                                       |
| ---------------------------------- | ------------------------------------------- | --------------- | ------------------------------------------------- |
| Improve submission quality         | % of ideas with all dynamic fields filled   | N/A             | ≥ 70% of submissions use category-specific fields |
| Increase idea richness             | Avg. attachments per idea                   | ≤ 1             | ≥ 1.5                                             |
| Reduce abandoned submissions       | Draft-to-submit conversion rate             | N/A (no drafts) | ≥ 60%                                             |
| Enable structured review pipelines | % of categories with custom stage configs   | N/A             | 100% of active categories configured              |
| Improve evaluation objectivity     | Admin-reported bias perception (survey)     | N/A             | < 20% report bias concern post blind-review       |
| Quantify idea quality              | % of finalized reviews with a numeric score | N/A             | ≥ 90% of `ACCEPTED`/`REJECTED` ideas have a score |

### Anti-Goals (V2.0 Explicitly Out of Scope)

- **NOT a social platform** — commenting between employees is still deferred. V2.0 does not add upvoting, reactions, or discussion threads.
- **NOT a project management tool** — accepted ideas do not become tasks, projects, or backlog items in V2.0.
- **NOT an AI feature release** — no AI-assisted scoring, no LLM-based feedback, no recommendation engine.
- **NOT a mobile app** — responsive web only; native mobile is out of scope.

---

## 4. Phases Overview

| Phase   | Feature                                     | Estimated Dev Time | Priority |
| ------- | ------------------------------------------- | ------------------ | -------- |
| Phase 2 | Smart Submission Forms (dynamic fields)     | ~30 min            | P1       |
| Phase 3 | Multi-Media Support (multiple file uploads) | ~45 min            | P1       |
| Phase 4 | Draft Management (save & resume drafts)     | ~30 min            | P2       |
| Phase 5 | Multi-Stage Review (configurable pipeline)  | ~1 hr              | P1       |
| Phase 6 | Blind Review (anonymous evaluation)         | ~20 min            | P2       |
| Phase 7 | Scoring System (1–5 star ratings)           | ~20 min            | P2       |

---

## 5. Phase 2 — Smart Submission Forms

### 5.1 Feature Overview & User Story

**As an** EPAM employee submitting an idea, **I want** the submission form to show me context-relevant fields based on the category I choose, **so that** I can provide richer, more structured information without being overwhelmed by irrelevant fields.

**User Journey**: Elif opens `/ideas/new` and selects the "Cost Reduction" category. The form immediately reveals two additional fields: "Current Estimated Annual Cost (USD)" and "Estimated Savings Percentage." She fills them in alongside the standard title and description. When Deniz (admin) opens the idea for review, she sees these structured fields clearly labelled, saving her the time of parsing free-text descriptions to extract cost data.

**Why this matters**: V1 forms treat all categories identically. A "New Product/Service" idea needs completely different context fields than a "Process Improvement" idea. Structured, category-specific data reduces review time and makes analytics more actionable.

### 5.2 Technical Requirements

- **Form rendering**: When the user selects or changes a category in the submission form, the additional field section below updates without a full page reload. Implementation must use a controlled form state.
- **Field types supported in V1 of dynamic fields**: `text` (single-line), `textarea` (multi-line), `number`, `select` (dropdown from a fixed list of options).
- **Admin configuration (deferred)**: In V2.0, the default field templates per category are seeded from a constant at build time. A UI for admins to edit field templates is deferred to V3.0.
- **Validation**: Dynamic fields marked as `required: true` in their template must be validated client-side and server-side before submission. Optional fields may be left blank.
- **Backward compatibility**: Ideas submitted in V1 (pre-Phase 2) have no dynamic field data. The detail page must render gracefully when `dynamicFields` is `null` or `{}`.
- **Submission payload**: Dynamic field values are serialized as a JSON object and stored in a single column. The key is the field's `id` from its template; the value is the user's input.

**Default field templates per category (seeded)**:

| Category               | Field ID                    | Label                               | Type                                      | Required |
| ---------------------- | --------------------------- | ----------------------------------- | ----------------------------------------- | -------- |
| `Process Improvement`  | `current_process`           | Describe the current process        | `textarea`                                | Yes      |
| `Process Improvement`  | `time_saved_hours_per_week` | Estimated time saved (hours/week)   | `number`                                  | No       |
| `New Product/Service`  | `target_market`             | Target market or audience           | `text`                                    | Yes      |
| `New Product/Service`  | `competitive_advantage`     | Key differentiator vs. alternatives | `textarea`                                | No       |
| `Cost Reduction`       | `current_annual_cost_usd`   | Current estimated annual cost (USD) | `number`                                  | Yes      |
| `Cost Reduction`       | `estimated_savings_pct`     | Estimated savings (%)               | `number`                                  | Yes      |
| `Employee Experience`  | `affected_group`            | Which employee group is affected?   | `text`                                    | Yes      |
| `Employee Experience`  | `pain_level`                | Current pain level                  | `select` (Low / Medium / High / Critical) | Yes      |
| `Technical Innovation` | `problem_being_solved`      | Technical problem being solved      | `textarea`                                | Yes      |
| `Technical Innovation` | `proposed_solution_summary` | High-level technical approach       | `textarea`                                | No       |

### 5.3 Database Changes

**New model: `CategoryFieldTemplate`**

```prisma
model CategoryFieldTemplate {
  id        String   @id @default(cuid())
  category  String   // matches Idea.category values exactly
  fields    Json     // Array<{ id, label, type, required, options? }>
  version   Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([category])
}
```

**Modified model: `Idea`** — add one new nullable field:

```prisma
// Add to existing Idea model:
dynamicFields Json? // key-value map of field id → user input; null for V1 ideas
```

**No new enums required for this phase.**

**Migration notes**:

- `dynamicFields` is nullable — existing `Idea` rows require no backfill.
- `CategoryFieldTemplate` records are created via the seed script at deploy time.

### 5.4 Edge Cases

| #      | Edge Case                                                                                      | Expected Behavior                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| EC-2.1 | User selects a category that has no field template defined                                     | No dynamic fields section is shown; form behaves identically to V1                                    |
| EC-2.2 | User selects "Cost Reduction," partially fills fields, then switches to "Technical Innovation" | Previously entered dynamic values are discarded; the form state resets to the new category's template |
| EC-2.3 | A required dynamic field is left empty on submission                                           | Server returns `422 Unprocessable Entity` with a field-level error: `"[Field Label] is required."`    |
| EC-2.4 | A `number` field receives a non-numeric string via API tampering                               | Server-side Zod schema coercion rejects the value with `400 Bad Request`                              |
| EC-2.5 | `CategoryFieldTemplate` seed has a category with duplicate field IDs                           | Zod validation on the seed script throws before inserting the record                                  |
| EC-2.6 | Admin opens a V1 idea (no `dynamicFields`) in the review panel                                 | The "Additional Fields" section is hidden; no error is thrown                                         |

---

## 6. Phase 3 — Multi-Media Support

### 6.1 Feature Overview & User Story

**As an** EPAM employee submitting an idea, **I want** to attach multiple files of varied types (documents, images, diagrams, short videos), **so that** I can provide all supporting evidence in one place without workarounds like zipping files or linking to external drives.

**User Journey**: Elif is submitting a "New Product/Service" idea for an internal tool. She attaches: a PDF business case (400 KB), a PNG wireframe (1.2 MB), and an MP4 demo recording (8 MB). All three are linked to her idea. When Deniz reviews the idea, she sees all three attachments listed with file name, type icon, and size. She can download or preview each individually.

**Why this matters**: V1 allows only one attachment, forcing employees to either choose their most important file or combine everything into a zip. Multi-attachment support directly increases the completeness of submitted ideas and reduces reviewer ambiguity.

### 6.2 Technical Requirements

- **Upload UI**: The attachment section in the submission form allows adding multiple files via a file picker or drag-and-drop. Each file shows a thumbnail (for images), a file type icon, file name, and size. Files can be removed individually before submission.
- **Upload mechanics**: Files are uploaded to Vercel Blob Storage individually. Each upload returns a URL that is stored in the `IdeaAttachment` model. Uploads happen on form submission (not eagerly on file select) to avoid storing orphaned files.
- **Allowed file types**: PDF, PNG, JPG/JPEG, GIF, DOCX, XLSX, PPTX, MD, TXT, MP4, MOV.
- **Size limits**:
  - Per-file: ≤ 25 MB
  - Total per idea: ≤ 100 MB
- **Maximum files per idea**: 10 files.
- **Backward compatibility**: V1 ideas with a legacy `attachmentPath` on the `Idea` model are migrated to the `IdeaAttachment` model during this phase's migration. The `attachmentPath` column is deprecated (kept as nullable) and no longer written to.
- **Detail page**: Attachment list renders as a sortable table (by file name, size, or upload date) with a download button per row. Image files show an inline thumbnail preview.
- **Access control**: Attachments respect the idea's visibility setting. A `PRIVATE` idea's attachments are only accessible to the author and admins (enforced server-side via Vercel Blob's token URL or a proxy route).

### 6.3 Database Changes

**New model: `IdeaAttachment`**

```prisma
model IdeaAttachment {
  id           String   @id @default(cuid())
  ideaId       String
  idea         Idea     @relation("IdeaAttachments", fields: [ideaId], references: [id], onDelete: Cascade)
  blobUrl      String   // Vercel Blob public or token-protected URL
  fileName     String   // original file name as uploaded
  mimeType     String   // e.g. "application/pdf", "image/png"
  sizeBytes    Int      // file size in bytes
  uploadedAt   DateTime @default(now())
}
```

**Modified model: `Idea`** — deprecate the old field:

```prisma
// Keep existing field but stop writing to it; migrate old data to IdeaAttachment:
attachmentPath String? @deprecated // migrated to IdeaAttachment in Phase 3
```

**Modified model: `Idea`** — add relation:

```prisma
// Add to existing Idea model:
attachments IdeaAttachment[] @relation("IdeaAttachments")
```

**New `AuditAction` enum values**:

```prisma
ATTACHMENT_ADDED   // a file was attached to an idea
ATTACHMENT_DELETED // a file attachment was removed
```

**Migration notes**:

- Write a data migration script that reads existing non-null `attachmentPath` values from `Idea`, creates an `IdeaAttachment` record for each, then sets `attachmentPath` to null.
- `attachmentPath` column stays in schema (nullable) for the duration of V2.0 to avoid a breaking migration. It is physically removed in V3.0.

### 6.4 Edge Cases

| #      | Edge Case                                                               | Expected Behavior                                                                                                                                               |
| ------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-3.1 | User uploads an 11th file beyond the 10-file limit                      | Server returns `422`: "Maximum of 10 attachments per idea." Upload is rejected without affecting existing files.                                                |
| EC-3.2 | A single file exceeds 25 MB                                             | Server returns `422`: "File must be under 25 MB."                                                                                                               |
| EC-3.3 | Total attachment size would exceed 100 MB                               | Server returns `422`: "Total attachment size cannot exceed 100 MB."                                                                                             |
| EC-3.4 | Unsupported MIME type is submitted by tampering the request             | Server-side MIME validation (from file bytes, not extension) rejects the file. Extension spoofing (e.g., `.mp4` renamed to `.pdf`) is caught.                   |
| EC-3.5 | Vercel Blob upload fails (network error)                                | The idea submission is aborted; the partially uploaded blob (if any) is pruned. The form shows: "File upload failed. Please try again."                         |
| EC-3.6 | A PRIVATE idea's blob URL is accessed directly by a non-authorized user | A server-side proxy route validates the session and role before serving the file. Direct blob URL access for private ideas is blocked at the application layer. |
| EC-3.7 | V1 data migration fails for a specific idea (corrupt `attachmentPath`)  | Migration script logs the failed ideaId and continues. Failed records are reviewed manually post-migration.                                                     |

---

## 7. Phase 4 — Draft Management

### 7.1 Feature Overview & User Story

**As an** EPAM employee composing an idea, **I want** to save my work as a draft and return to finish it later, **so that** I don't lose my progress if I'm interrupted or need more time to refine my idea before submitting.

**User Journey**: Elif starts filling in a complex "New Product/Service" idea during her lunch break. She gets called to a meeting before finishing. She clicks "Save Draft." Her idea is saved privately. Later that evening, she returns to `/ideas/my-ideas`, sees "Draft: My Onboarding Tool" in her list, opens it, finishes writing, and clicks "Submit" to enter the evaluation pipeline.

**Why this matters**: Without drafts, interruptions during form filling result in total loss. This creates friction that discourages high-quality submissions, particularly for complex categories that require more thought.

### 7.2 Technical Requirements

- **Draft status**: A draft is an idea in `DRAFT` status. It is exclusively visible to its author. It is not visible to admins unless explicitly listed in a separate admin view (deferred to V3.0).
- **Save draft action**: A "Save Draft" button appears in the submission form alongside the "Submit" button. Clicking it saves the current form state server-side as a `DRAFT` idea without running required-field validation (title can be empty; only a length cap is enforced to prevent abuse).
- **Auto-save**: Optional browser-level auto-save (every 60 seconds using `localStorage` fallback) is implemented as a client-side enhancement. Server-side auto-save is not implemented in V2.0.
- **Resuming a draft**: From `/my-ideas`, drafts appear in a dedicated "Drafts" tab. Clicking a draft opens the submission form pre-populated with saved values.
- **Submitting a draft**: Editing a draft and clicking "Submit" triggers full validation (all required fields including dynamic fields), changes status to `SUBMITTED`, and enters the normal evaluation pipeline.
- **Draft limit**: A single user may have at most 10 active drafts simultaneously.
- **Draft expiry**: Drafts older than 90 days without activity are soft-deleted and moved to an "Expired Drafts" section visible only to the author. Hard deletion occurs after a further 30 days.
- **Discarding a draft**: Authors can permanently delete a draft from the drafts list. This is irreversible.

### 7.3 Database Changes

**Modified enum: `IdeaStatus`** — add `DRAFT` as the initial state before `SUBMITTED`:

```prisma
enum IdeaStatus {
  DRAFT         // idea is being composed; not yet submitted; only visible to author
  SUBMITTED     // initial state on creation through normal submission
  UNDER_REVIEW  // admin has opened the review
  ACCEPTED      // admin decision: accepted
  REJECTED      // admin decision: rejected
}
```

**Modified model: `Idea`** — add expiry tracking field:

```prisma
// Add to existing Idea model:
draftExpiresAt DateTime? // null for non-drafts; set to now() + 90d when draft is created
```

**Modified state machine** (domain/glossary.md must be updated accordingly):

```
DRAFT ──► SUBMITTED ──► UNDER_REVIEW ──► ACCEPTED
                                      └──► REJECTED
```

**No new models required for this phase.**

**Migration notes**:

- All existing `Idea` rows have a `status` of `SUBMITTED`, `UNDER_REVIEW`, `ACCEPTED`, or `REJECTED` — none will be affected by adding `DRAFT` as a new enum value.
- `draftExpiresAt` is nullable — no backfill required.

### 7.4 Edge Cases

| #      | Edge Case                                                                                                            | Expected Behavior                                                                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-4.1 | User reaches the 10-draft limit and tries to save another draft                                                      | "Save Draft" button is disabled; tooltip: "You have reached the maximum of 10 drafts. Please submit or delete a draft to continue."                                              |
| EC-4.2 | User submits a draft with required dynamic fields missing                                                            | Inline validation errors are shown. Status remains `DRAFT`. The server returns `422` on submission attempt.                                                                      |
| EC-4.3 | A draft's `draftExpiresAt` passes and a cron job soft-deletes it while the author has the form open                  | On the next server interaction (e.g., auto-save), the server returns `404`. The client shows: "This draft has expired and can no longer be saved."                               |
| EC-4.4 | An admin navigates to `/admin/review` and sees a DRAFT idea in the queue (possible only via direct URL manipulation) | The review queue explicitly filters out `DRAFT` status server-side. A direct URL attempt to start review on a draft returns `400 Bad Request`: "Draft ideas cannot be reviewed." |
| EC-4.5 | User attempts to set `status=SUBMITTED` directly via API on a draft with missing required fields                     | Server-side validation rejects the transition: `422` with specific field errors.                                                                                                 |
| EC-4.6 | Two browser tabs have the same draft open simultaneously                                                             | Last write wins. The server accepts the most recent save. No optimistic locking in V2.0. A warning note is added to the form for future reference.                               |

---

## 8. Phase 5 — Multi-Stage Review

### 8.1 Feature Overview & User Story

**As an** Innovation Program Manager (admin), **I want** to configure a multi-stage review pipeline per category, **so that** ideas requiring different levels of scrutiny (e.g., a "Cost Reduction" idea needs a Finance sign-off, while a "Technical Innovation" idea needs an Engineering Lead) are routed through the appropriate evaluation chain.

**User Journey**: Deniz configures a 3-stage pipeline for "New Product/Service" ideas: `Initial Screening → Business Case Review → Final Decision`. When Elif submits a "New Product/Service" idea, it enters Stage 1. An admin completes Stage 1 with a "pass" decision and a note. The idea automatically advances to Stage 2. The Stage 2 reviewer completes their evaluation. Only after all stages are complete can the final `ACCEPTED` or `REJECTED` decision be recorded.

**Why this matters**: V1 forces all ideas through an identical two-step workflow regardless of category. This is inadequate for high-stakes decisions (e.g., ideas that require budget approval) while being overkill for simple process improvements. Configurable pipelines align review effort with idea impact.

### 8.2 Technical Requirements

- **Pipeline configuration UI**: A new page at `/admin/review-config` allows SUPERADMIN to create, edit, and delete review pipelines. Each pipeline is bound to a category (one pipeline per category maximum). The page lists all categories with their current pipeline or "Default (2-stage)" if none is configured.
- **Stage configuration**: Each stage has a name (max 60 chars), an optional description, and an `isDecisionStage` flag. Exactly one stage per pipeline must be marked as the decision stage — this is the final stage where `ACCEPTED` or `REJECTED` is recorded.
- **In non-decision stages**: The reviewer produces a `PASS` or `ESCALATE` outcome. `PASS` advances the idea to the next stage. `ESCALATE` flags the idea for SUPERADMIN attention without progressing.
- **Default pipeline**: If a category has no custom pipeline, the system applies the default 2-stage pipeline: Stage 1 = "Initial Review" (non-decision), Stage 2 = "Final Decision" (decision). This is identical to the V1 workflow.
- **Admin review assignment**: In V2.0, any `ADMIN` or `SUPERADMIN` can claim and complete any stage (no per-stage role assignment). Stage-specific assignment is deferred to V3.0.
- **Stage progress visibility**: The idea detail page shows a stage progress indicator (e.g., breadcrumb or stepper component) visible to all users. Pending stages are visible as labels but their content is hidden from non-admins until they are completed.
- **Pipeline locking**: Once an idea has entered a pipeline (i.e., its first stage is started), the pipeline configuration for that category is considered "in use" and cannot be destructively edited (stages cannot be deleted). Only stage names and descriptions can be updated while a pipeline is in use.

### 8.3 Database Changes

**New model: `ReviewPipeline`**

```prisma
model ReviewPipeline {
  id        String   @id @default(cuid())
  category  String   @unique // bound 1:1 to a category name
  name      String   // e.g. "New Product/Service Review Pipeline"
  isDefault Boolean  @default(false) // true for the built-in 2-stage default
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  stages     ReviewPipelineStage[]
  ideaStages IdeaStageProgress[]
}
```

**New model: `ReviewPipelineStage`**

```prisma
model ReviewPipelineStage {
  id              String   @id @default(cuid())
  pipelineId      String
  pipeline        ReviewPipeline @relation(fields: [pipelineId], references: [id], onDelete: Cascade)
  name            String   // max 60 chars
  description     String?
  order           Int      // 1-based; determines sequence
  isDecisionStage Boolean  @default(false) // exactly one per pipeline must be true

  progress IdeaStageProgress[]

  @@index([pipelineId, order])
}
```

**New model: `IdeaStageProgress`**

```prisma
enum StageOutcome {
  PASS      // non-decision stage: idea advances to next stage
  ESCALATE  // non-decision stage: flagged for SUPERADMIN attention
  ACCEPTED  // decision stage only
  REJECTED  // decision stage only
}

model IdeaStageProgress {
  id          String        @id @default(cuid())
  ideaId      String
  idea        Idea          @relation("IdeaStageProgress", fields: [ideaId], references: [id], onDelete: Cascade)
  stageId     String
  stage       ReviewPipelineStage @relation(fields: [stageId], references: [id])
  pipelineId  String
  pipeline    ReviewPipeline @relation(fields: [pipelineId], references: [id])
  reviewerId  String?       // null until stage is claimed
  reviewer    User?         @relation("UserStageReviews", fields: [reviewerId], references: [id])
  outcome     StageOutcome? // null until stage is completed
  comment     String?       // required on completion (min 10 chars)
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime      @default(now())

  @@unique([ideaId, stageId])
}
```

**Modified model: `Idea`** — add relation:

```prisma
// Add to existing Idea model:
stageProgress IdeaStageProgress[] @relation("IdeaStageProgress")
```

**New `AuditAction` enum values**:

```prisma
STAGE_STARTED    // an admin claimed a review stage
STAGE_COMPLETED  // an admin completed a review stage
PIPELINE_CREATED // a new review pipeline was configured
PIPELINE_UPDATED // a review pipeline's config was modified
```

**Migration notes**:

- Existing `IdeaReview` records remain untouched. `IdeaReview` continues to serve V1-style ideas until all in-flight reviews are completed.
- New submissions after Phase 5 deploys are routed through `IdeaStageProgress`. The `IdeaReview` model is soft-deprecated (no new records created) and scheduled for removal in V3.0.

### 8.4 Edge Cases

| #      | Edge Case                                                                             | Expected Behavior                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-5.1 | SUPERADMIN tries to delete a pipeline stage while an idea is currently at that stage  | Server returns `409 Conflict`: "Cannot delete stage: it has active reviews in progress."                                                      |
| EC-5.2 | Pipeline is configured with no `isDecisionStage = true`                               | Server returns `422` on pipeline save: "Exactly one stage must be marked as the decision stage."                                              |
| EC-5.3 | Pipeline is configured with more than one `isDecisionStage = true`                    | Server returns `422`: "Only one stage can be the decision stage."                                                                             |
| EC-5.4 | A non-decision stage reviewer attempts to set `outcome = ACCEPTED` via API tampering  | Server validates that `ACCEPTED`/`REJECTED` outcomes are only assignable to stages where `isDecisionStage = true`. Returns `400 Bad Request`. |
| EC-5.5 | An idea is currently in Stage 2 and the pipeline is reconfigured to only have 1 stage | In-progress ideas continue using the pipeline snapshot at the time of submission. Pipeline changes only apply to new submissions.             |
| EC-5.6 | The default 2-stage pipeline is deleted                                               | `isDefault` pipelines cannot be deleted. The delete action is blocked server-side with `403`.                                                 |

---

## 9. Phase 6 — Blind Review

### 9.1 Feature Overview & User Story

**As an** Innovation Program Manager (admin), **I want** to enable blind review for specific categories or pipelines, **so that** reviewers evaluate ideas purely on merit and cannot be influenced by the submitter's identity, seniority, or team affiliation.

**User Journey**: Deniz configures the "New Product/Service" pipeline with blind review enabled. When an admin opens a "New Product/Service" idea to review, the idea detail page hides the submitter's display name and replaces it with "Anonymous Submitter." The admin evaluates based on the idea's content alone. After the final decision is recorded, the submitter identity is automatically revealed to the reviewer.

**Why this matters**: Unconscious bias toward well-known senior employees (or against junior employees in less visible roles) can skew evaluations. Blind review is a proven mechanism to improve objectivity and encourage submission from employees who fear being dismissed by rank.

### 9.2 Technical Requirements

- **Configuration**: A `blindReview` boolean toggle is added to the `ReviewPipeline` model. When enabled, it applies to all stages within that pipeline.
- **Admin view (blind mode active)**: When an admin opens an idea detail page or review panel for an idea in a blind-review pipeline, the following are hidden or replaced:
  - Submitter display name → shows "Anonymous Submitter"
  - Submitter email → hidden completely
  - "Submitted by" field in idea metadata → shows "Anonymous"
- **What is NOT hidden**: The idea title, description, category, dynamic fields, and attachments remain fully visible. Only identity fields are masked.
- **Post-decision reveal**: Once the idea reaches its `isDecisionStage` and the reviewer records `ACCEPTED` or `REJECTED`, the submitter identity is automatically revealed to the reviewing admin. The reveal is visible on a refresh of the idea detail page.
- **Submitter experience is unchanged**: The submitter always sees their own ideas with their name. Blind review only affects the reviewer's view.
- **Audit trail**: The audit log always stores the true `actorId`. The blind review masking is a display-layer concern only — the database always stores accurate relationships.
- **SUPERADMIN bypass**: `SUPERADMIN` users can see the submitter identity even when blind review is active (required for escalation and conflict-of-interest handling).

### 9.3 Database Changes

**Modified model: `ReviewPipeline`** — add one field:

```prisma
// Add to existing ReviewPipeline model (from Phase 5):
blindReview Boolean @default(false) // when true, submitter identity is hidden from reviewers during active review
```

**No new models or enums required for this phase.**

**Migration notes**:

- `blindReview` defaults to `false` — all existing and new pipelines start with blind review disabled. No data migration required.

### 9.4 Edge Cases

| #      | Edge Case                                                                                             | Expected Behavior                                                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-6.1 | Admin views an idea's audit log while blind review is active                                          | The audit log always shows true actor names and IDs. Blind review masking does not apply to the audit log in this release.                                                       |
| EC-6.2 | An admin who is also the submitter's direct manager is assigned to review the idea                    | No automatic conflict detection in V2.0. SUPERADMIN can re-assign or abandon the review manually. Automated conflict detection is deferred to V3.0.                              |
| EC-6.3 | An idea is transferred from a non-blind pipeline to a blind pipeline mid-review (pipeline change)     | Mid-review pipeline transfers are not supported in V2.0. Ideas stay in the pipeline active at their time of submission.                                                          |
| EC-6.4 | A reviewer screenshots the idea before blind review is enabled, then the pipeline is updated to blind | Masking only applies to live requests. Previously viewed data is uncontrolled. This is communicated to SUPERADMIN in the blind review configuration tooltip.                     |
| EC-6.5 | SUPERADMIN enables blind review on a pipeline that has ideas currently `UNDER_REVIEW`                 | The change takes effect immediately for all current reviews in that pipeline. Admins with those ideas already open must refresh. The idea detail page always re-fetches on load. |

---

## 10. Phase 7 — Scoring System

### 10.1 Feature Overview & User Story

**As an** admin reviewing an idea, **I want** to assign a numeric score (1–5) to the ideas I evaluate, **so that** leadership has a quantitative signal to prioritize accepted ideas and compare evaluation quality over time.

**User Journey**: Deniz is reviewing a "Technical Innovation" idea. After reading the description and attachments, she assigns a score of 4 out of 5 and selects "Technical Feasibility" and "Strategic Alignment" as the scoring criteria she weighted most heavily. She then finalizes her decision as "Accept" with a comment. On the admin analytics page, ideas are now sortable by average score, and the "Top Scoring Ideas" widget surfaces the three highest-scored accepted ideas of the month.

**Why this matters**: Binary `ACCEPTED`/`REJECTED` decisions lose nuance. Among all accepted ideas, leadership needs a way to prioritize implementation effort. A numeric score gives a consistent, auditable signal without adding significant reviewer burden.

### 10.2 Technical Requirements

- **Score input**: On the review action panel (the final decision stage), a 1–5 star rating component is displayed above the Accept/Reject buttons. Selecting a score is required before the final decision can be submitted.
- **Score criteria tags (optional)**: A multi-select tag input allows the reviewer to indicate which criteria drove their score. The fixed tag list (seeded, not user-editable in V2.0):
  - `Technical Feasibility`
  - `Strategic Alignment`
  - `Cost Efficiency`
  - `Employee Impact`
  - `Innovation Level`
- **Score visibility**:
  - Submitter: sees the numeric score on their idea's detail page after the decision is finalized.
  - Admins: see the score on all finalized idea detail pages.
  - Analytics: average score by category, score distribution histogram, top-scored ideas list.
- **Score on blind review**: If blind review is active, the score is recorded normally. The score itself is never hidden (only the submitter identity is masked).
- **Scoring is only on decision stages**: Non-decision stage completions (Phase 5 `PASS`/`ESCALATE`) do not have a score field.

### 10.3 Database Changes

**New model: `IdeaScore`**

```prisma
model IdeaScore {
  id         String   @id @default(cuid())
  ideaId     String   @unique // one score per idea (from the decision stage)
  idea       Idea     @relation("IdeaScore", fields: [ideaId], references: [id], onDelete: Cascade)
  reviewerId String
  reviewer   User     @relation("UserScores", fields: [reviewerId], references: [id])
  score      Int      // 1 to 5 inclusive; enforced via Zod + DB check constraint
  criteria   String[] // array of criteria tag strings from the fixed list
  recordedAt DateTime @default(now())

  @@index([ideaId])
  @@index([score])
}
```

**Modified model: `Idea`** — add relation:

```prisma
// Add to existing Idea model:
score IdeaScore? @relation("IdeaScore")
```

**DB check constraint** (in migration SQL, not expressible in Prisma schema directly):

```sql
ALTER TABLE "IdeaScore" ADD CONSTRAINT "IdeaScore_score_range"
  CHECK (score >= 1 AND score <= 5);
```

**New `AuditAction` enum value**:

```prisma
IDEA_SCORED // a score was recorded for an idea
```

**Migration notes**:

- `IdeaScore` is a new table — no backfill required. V1 ideas that were evaluated before Phase 7 will have no score; analytics queries must handle `score = null` gracefully (e.g., exclude from averages).

### 10.4 Edge Cases

| #      | Edge Case                                                                           | Expected Behavior                                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EC-7.1 | Reviewer submits the final decision without selecting a score                       | Server returns `422`: "A score (1–5) is required to finalize the decision." The decision is not recorded.                                                               |
| EC-7.2 | Score value `0` or `6` is submitted via API tampering                               | Zod schema rejects values outside 1–5 range with `400 Bad Request`. DB check constraint provides a secondary safety net.                                                |
| EC-7.3 | The same idea is somehow given two `IdeaScore` records (race condition)             | The `@@unique([ideaId])` constraint on `IdeaScore` causes a unique constraint violation. The second insert is rejected by the database. The API returns `409 Conflict`. |
| EC-7.4 | Analytics query for average score on a category where no ideas have been scored yet | Query returns `null` for the average; the UI shows "No scored ideas yet" in place of the metric.                                                                        |
| EC-7.5 | A V1-era idea (no `IdeaScore`) appears in the "Top Ideas" analytics widget          | The widget filters to ideas with a non-null score. V1 ideas appear in standard listings but not in score-based rankings.                                                |
| EC-7.6 | Reviewer selects more than 5 criteria tags                                          | The UI limits selection to 5 tags maximum. The server also enforces `criteria.length ≤ 5` via Zod.                                                                      |

---

## 11. Cross-Phase Functional Requirements

These requirements span multiple phases and must be implemented consistently across all V2.0 features.

| ID       | Requirement                                                                                                                                                                                                                                                                                              | Applies To | Priority |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- |
| FR-V2-01 | All new server-side mutations (save draft, multi-upload, stage progression, scoring) MUST be implemented as Server Actions or Route Handlers — no client-side direct DB access.                                                                                                                          | All phases | Must     |
| FR-V2-02 | All new Prisma migrations MUST be non-destructive. No existing columns may be dropped or renamed in V2.0.                                                                                                                                                                                                | All phases | Must     |
| FR-V2-03 | All new user-facing validation errors MUST include a field-level message, not just a generic "Something went wrong."                                                                                                                                                                                     | All phases | Must     |
| FR-V2-04 | All new features MUST be behind a feature flag (`FEATURE_SMART_FORMS_ENABLED`, `FEATURE_MULTI_ATTACHMENT_ENABLED`, `FEATURE_DRAFT_ENABLED`, `FEATURE_MULTI_STAGE_REVIEW_ENABLED`, `FEATURE_BLIND_REVIEW_ENABLED`, `FEATURE_SCORING_ENABLED`). Default to `false` in production until explicitly enabled. | All phases | Must     |
| FR-V2-05 | Role checks for new admin actions (pipeline config, stage completion, scoring) MUST be enforced server-side — never trust client-side role state.                                                                                                                                                        | P5, P6, P7 | Must     |
| FR-V2-06 | New audit actions added in each phase MUST be written to `AuditLog` for all state-changing operations.                                                                                                                                                                                                   | All phases | Must     |
| FR-V2-07 | The `IdeaStatus` state machine enforcer in `lib/state-machine/` MUST be updated to handle the new `DRAFT` status and multi-stage transitions.                                                                                                                                                            | P4, P5     | Must     |

---

## 12. Non-Functional Requirements (V2.0 Additions)

These extend the NFRs defined in the V1 PRD — do not supersede them.

| Category           | Requirement                                  | Target                                                                                                                          |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Performance**    | File upload for 25 MB attachment             | < 15 seconds including server processing                                                                                        |
| **Performance**    | Multi-stage review pipeline config page load | < 2 seconds                                                                                                                     |
| **Scalability**    | Attachments per idea                         | 10 files × 25 MB = 250 MB theoretical maximum; Vercel Blob handles object count at scale                                        |
| **Data Integrity** | Score constraint                             | Database-level check ensures score is always in [1, 5]                                                                          |
| **Security**       | Private idea attachments                     | Served through a proxy route that validates session and role before streaming the blob; direct blob URLs not publicly guessable |
| **Testing**        | Test coverage for new code                   | ≥ 80% line coverage (unit + integration) for all new Server Actions, Route Handlers, and state machine additions                |
| **Testing**        | E2E coverage                                 | Critical new paths covered: save draft → resume → submit; multi-stage review flow; blind review masking                         |

---

## 13. Page Inventory Changes (V2.0 Additions)

Additions to the V1 page inventory defined in the V1 PRD (Section 8):

| #   | Page                        | Route                                | Primary User       | New in Phase |
| --- | --------------------------- | ------------------------------------ | ------------------ | ------------ |
| 11  | **Draft List**              | `/my-ideas` (Drafts tab)             | Submitter          | Phase 4      |
| 12  | **Review Pipeline Config**  | `/admin/review-config`               | Superadmin         | Phase 5      |
| 13  | **Stage Review Panel**      | `/admin/review/[id]/stage/[stageId]` | Admin              | Phase 5      |
| 14  | **Top Scored Ideas Widget** | `/admin/analytics` (new widget)      | Admin / Superadmin | Phase 7      |

---

## 14. Risks & Mitigations

| #   | Risk                                                                                                                                                                | Likelihood | Impact | Mitigation                                                                                                                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | **Phase 5 (Multi-Stage Review) is the most complex phase** — new models, state machine changes, and UI configuration in ~1 hour. Risk of incomplete implementation. | High       | High   | Build only the core stage progression in V2.0. Admin pipeline config UI can ship as read-only in V2.0 (config via seed/migration) and become editable in V2.1.                                         |
| 2   | **`IdeaStatus` enum change (adding `DRAFT`) requires coordinated migration** — all existing code that switches on `IdeaStatus` must handle the new value.           | Med        | High   | Run `grep -r "IdeaStatus\|SUBMITTED\|UNDER_REVIEW\|ACCEPTED\|REJECTED"` across the codebase and audit every switch statement before deploying Phase 4.                                                 |
| 3   | **V1 attachment data migration** — `attachmentPath` → `IdeaAttachment` migration could fail for corrupt or missing blob URLs.                                       | Low        | Med    | Run migration in a transaction with a rollback plan. Log all skipped rows. Keep `attachmentPath` column in schema until V3.0 as a recovery fallback.                                                   |
| 4   | **Feature flag proliferation** — 6 new flags increases environment variable management complexity.                                                                  | Med        | Low    | Document all flags in `lib/env.ts` with defaults and descriptions. Add to `.env.example`.                                                                                                              |
| 5   | **Blind review bypass via API** — a malformed API call could return submitter data even when blind review is active.                                                | Med        | High   | This is not a security boundary — it is a UX objectivity feature. Over-engineer protection is not warranted. Document the scope limitation clearly. Audit log always stores true identity.             |
| 6   | **Multi-stage pipeline with V1-era `IdeaReview` co-existence** — two review models in the DB could cause confusion in queries.                                      | Med        | Med    | Introduce a `reviewVersion` field on `Idea` (`v1` or `v2`) to make the routing explicit in queries. Alternatively, use a discriminating condition: if `IdeaStageProgress` records exist → use V2 path. |

---

## 15. Open Questions

| #   | Question                                                                                                                                                                                                                               | Owner      | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------ |
| 1   | Should `DRAFT` ideas be counted in admin analytics (e.g., total submissions this month)? My recommendation: no — only `SUBMITTED` and beyond should count.                                                                             | Aykan Uğur | Open   |
| 2   | Should the score be editable after a decision is finalized? Once `ACCEPTED`/`REJECTED`, is the score immutable? Recommendation: immutable — editing scores post-decision undermines audit integrity.                                   | Aykan Uğur | Open   |
| 3   | What happens to in-flight `IdeaReview` records (V1 model) when Phase 5 deploys? Recommendation: they complete as V1 reviews; `IdeaReview` model is soft-deprecated but kept until all V1 reviews are resolved.                         | Aykan Uğur | Open   |
| 4   | Should blind review also mask the submitter identity in the audit log for non-SUPERADMIN admins, or is the audit log always unmasked? Recommendation: always unmasked in the audit log — traceability supersedes objectivity concerns. | Aykan Uğur | Open   |

---

## 16. References & Links

- [V1 PRD](../prd-innovatepam.md) — InnovatEPAM Portal Version 1.0
- [V1 Auth & RBAC Spec](../001-auth-rbac/spec.md)
- [Domain Glossary](../../memory-banks/domain/glossary.md) — authoritative terminology
- [Architecture Overview](../../memory-banks/architecture/overview.md)
- [Prisma Schema (V1 baseline)](../../prisma/schema.prisma)
- PRD Template: `specs/prd-innovatepam.md` (V1 PRD) + `.agents/skills/prd-mastery-context-aware-expert-driven-and-token-efficient-refinement/SKILL.md`

---

## Appendix: Revision History

| Version | Date       | Author     | Changes                                                      |
| ------- | ---------- | ---------- | ------------------------------------------------------------ |
| 2.0     | 2026-02-25 | Aykan Uğur | Initial V2.0 draft — Phase 2 through Phase 7 fully specified |
