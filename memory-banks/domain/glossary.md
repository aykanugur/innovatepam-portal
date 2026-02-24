# Domain Glossary — InnovatEPAM Portal

**Last Updated**: 2026-02-24  
**Version**: 1.0  
**Owner**: Aykan Uğur

> Load this file when writing business logic, designing data models, implementing
> role checks, or generating user-facing copy. These definitions are authoritative
> for this project — if code or copy conflicts with this glossary, the glossary wins.

---

## Terms

### Idea

**Definition:** The core entity of the platform. An innovation suggestion submitted by an EPAM employee. An idea consists of a title, description, category, visibility setting, optional file attachment, and a lifecycle status.

**Context:** "Idea" is the central noun of the domain. Every other concept (submission, review, evaluation) exists in relation to an idea. Do not use "suggestion," "proposal," or "ticket" as synonyms in code, UI copy, or documentation — always say "idea."

**Fields:**
- `title` — max 100 chars (UI copy limits); required
- `description` — max 2,000 chars; required
- `category` — one of the five fixed categories; required
- `visibility` — `PUBLIC` or `PRIVATE`; default `PUBLIC`
- `attachmentPath` — Vercel Blob URL; optional; behind `FEATURE_FILE_ATTACHMENT_ENABLED`
- `status` — follows the Idea Lifecycle state machine (see below)

**Example:** "A new onboarding automation tool that reduces manual HR steps by 60%"

---

### Idea Lifecycle (Status State Machine)

**Definition:** The ordered sequence of statuses an idea moves through from submission to final decision. Only permitted transitions are allowed — invalid transitions are rejected server-side.

**States:**

```
SUBMITTED ──► UNDER_REVIEW ──► ACCEPTED
                            └──► REJECTED
```

| Status | Meaning | Who Triggers It |
|--------|---------|----------------|
| `SUBMITTED` | Idea has been submitted; awaiting admin triage | System (on createIdea) |
| `UNDER_REVIEW` | Admin has claimed the idea and is actively evaluating it | ADMIN / SUPERADMIN (startReview action) |
| `ACCEPTED` | Idea approved; decision + comment recorded | ADMIN / SUPERADMIN (finalizeReview action) |
| `REJECTED` | Idea declined; mandatory comment explains why | ADMIN / SUPERADMIN (finalizeReview action) |

**Business Rule:** No idea can skip from `SUBMITTED` directly to `ACCEPTED` or `REJECTED`. It must pass through `UNDER_REVIEW` first. This ensures every acceptance/rejection is preceded by a deliberate review step.

**Rationale:** Prevents accidental bulk-accepts and ensures review comments are always attached to final decisions.

---

### Idea Category

**Definition:** A fixed top-level classification that every submitted idea must belong to. Categories are not user-editable in Phase 1.

**Fixed list (exactly these 5 values — do not invent others):**
1. `Process Improvement`
2. `New Product/Service`
3. `Cost Reduction`
4. `Employee Experience`
5. `Technical Innovation`

**Context:** Categories are stored as plain strings in the database (not a separate DB table). The allowed values are enforced via Zod enum validation on both client and server. The constant is defined in `constants/idea-categories.ts`.

**Why fixed:** Open-ended categories produce inconsistent data and make analytics useless. Phase 2 may allow admins to manage the category list.

---

### Idea Visibility

**Definition:** A per-idea privacy setting that controls who can see the idea in the listing and detail pages.

| Value | Who can see it |
|-------|---------------|
| `PUBLIC` (default) | All authenticated users |
| `PRIVATE` | Only the submitter (author) + ADMIN + SUPERADMIN |

**Context:** Employees with sensitive or commercially-sensitive ideas can choose `PRIVATE` to limit visibility while still getting a formal review. Attempting to load a `PRIVATE` idea that belongs to another user as a `SUBMITTER` returns `404 Not Found` (not `403`) — this prevents visibility enumeration.

---

### Submitter

**Definition:** The default role assigned to every newly registered EPAM employee. A submitter can submit, view, and delete their own ideas, but cannot perform any evaluation actions.

**Permissions:**
- ✅ Register, verify email, log in
- ✅ Submit ideas
- ✅ View all PUBLIC ideas + their own PRIVATE ideas
- ✅ View idea detail pages (within visibility rules)
- ✅ Delete their own `SUBMITTED` ideas
- ✅ Update their profile and password
- ❌ Start review, accept, or reject any idea
- ❌ Access `/admin/*` routes
- ❌ Change any user's role

**Prisma enum value:** `Role.SUBMITTER`

**Do not call this role:** "user," "employee," "viewer," "standard user." Always say "submitter" in code, comments, and UI copy.

---

### Admin

**Definition:** A role granted to designated Innovation Program Managers or program leads. An admin can perform the full evaluation workflow on submitted ideas and access the admin dashboard.

**Permissions (extends Submitter, plus):**
- ✅ View ALL ideas regardless of visibility
- ✅ Start review (SUBMITTED → UNDER_REVIEW)
- ✅ Accept or reject ideas with a comment
- ✅ Access `/admin` and `/admin/review/[id]`
- ✅ Access `/admin/users` (behind `FEATURE_USER_MANAGEMENT_ENABLED`)
- ❌ Cannot evaluate their own submitted ideas (self-review prevention)
- ❌ Cannot promote users to SUPERADMIN

**Prisma enum value:** `Role.ADMIN`

**Promotion:** Only a SUPERADMIN can promote a SUBMITTER to ADMIN via the user management page.

---

### Superadmin

**Definition:** The highest privilege role. Exactly one account bootstrapped per deployment via the `SUPERADMIN_EMAIL` environment variable and `prisma db seed`. Superadmins can do everything an ADMIN can, plus manage roles and (in Phase 2) global settings.

**Permissions (extends Admin, plus):**
- ✅ Promote any SUBMITTER to ADMIN
- ✅ Demote any ADMIN to SUBMITTER
- ✅ Access `/admin/analytics` (behind `FEATURE_ANALYTICS_ENABLED`)
- ❌ Cannot demote themselves (self-demotion prevention)
- ❌ Cannot be demoted by any other user

**Bootstrap:** On first deploy, run `npx prisma db seed`. The seed script reads `SUPERADMIN_EMAIL` from the environment and updates the matching `User.role` to `SUPERADMIN`. If the email doesn't exist in the DB yet, the seed logs a warning and exits cleanly — it does not crash.

**Prisma enum value:** `Role.SUPERADMIN`

**Important:** There is no registration path to SUPERADMIN. The role only exists via seed. Never add UI to self-assign this role.

---

### Evaluation Workflow

**Definition:** The three-step process an ADMIN follows to move an idea from `SUBMITTED` to a final decision (`ACCEPTED` or `REJECTED`). Comprises the `startReview` and `finalizeReview` Server Actions.

**Steps:**
1. **Start Review** — Admin clicks "Start Review" on a `SUBMITTED` idea. Status → `UNDER_REVIEW`. Idea is now locked from submitter editing.
2. **Decide** — Admin reviews full idea content (title, description, category, attachment).
3. **Finalize** — Admin selects Accept or Reject + writes a comment. An `IdeaReview` record is created; `Idea.status` is updated atomically in a Prisma transaction.

**Self-Review Rule:** An admin who is also the idea's author cannot evaluate their own idea. The `finalizeReview` action checks `idea.authorId !== session.user.id` and throws `ForbiddenError` if violated.

**Comment Rule:** A comment is **mandatory** when rejecting (min 10 chars). A comment is **recommended but not required** when accepting. The mandatory comment ensures submitters always understand why their idea was declined.

---

### IdeaReview

**Definition:** The database record created when an admin finalizes a decision on an idea. Stores the decision (`ACCEPTED` or `REJECTED`), the reviewer's mandatory/recommended comment, and the reviewer's identity.

**Key constraint:** One-to-one with `Idea` (`ideaId` is unique). An idea can only have one review record. Attempting to review an already-reviewed idea throws `ConflictError`.

**Context:** When displaying an idea's detail page, the presence of an `IdeaReview` record signals that a final decision has been made and the review card should be shown to the submitter.

---

### Feature Flag

**Definition:** An environment variable that enables or disables a feature at runtime without redeployment. All flags are boolean (read as `process.env.FEATURE_X === 'true'`). Flags are checked at the route/page level, not deep inside business logic.

**Active Flags:**

| Flag | Default | Effect when `false` |
|------|---------|-------------------|
| `PORTAL_ENABLED` | `true` | Entire portal shows maintenance page |
| `FEATURE_EMAIL_VERIFICATION_ENABLED` | `true` | Registration auto-verifies; no email sent |
| `FEATURE_FILE_ATTACHMENT_ENABLED` | `true` | Attachment UI hidden; `attachmentPath` always null |
| `FEATURE_ANALYTICS_ENABLED` | `false` | `/admin/analytics` returns 404 |
| `FEATURE_USER_MANAGEMENT_ENABLED` | `true` | `/admin/users` returns 404 |

**Context for AI:** When generating code for a flagged feature, always add the flag check at the route entry point (e.g., `if (!featureEnabled('FILE_ATTACHMENT')) return notFound()`). Never gate flags with complex branching inside business logic functions — keep the on/off logic at the boundary.

---

### Verification Token

**Definition:** A cryptographically random 32-byte hex string generated at registration and stored on the `User` record. Sent to the user's email as a one-time-use link parameter for email verification. Valid for 24 hours.

**Lifecycle:**
1. Generated: `crypto.randomBytes(32).toString('hex')` at registration
2. Stored: `User.verificationToken` + `User.verificationTokenExpiry` (now + 24h)
3. Consumed: When the user clicks the link, the token is matched in DB, `emailVerified` set to `true`, and `verificationToken` / `verificationTokenExpiry` cleared to `null`
4. Expired: If `verificationTokenExpiry < now()`, the token is rejected

**Security note:** Token reuse after verification is rejected with 400. Tokens are never logged.

---

### Alpha Release

**Definition:** The internal Day 2 milestone. All 6 P1 user stories (register, verify, login, submit idea, view ideas, admin evaluate) are functional end-to-end. No production traffic. Developer self-testing only. Success gate: core flows work E2E + ≥80% test coverage.

**Contrast with GA:** Alpha may have rough UI states and no analytics. GA is the Day 3 production-ready release accessible to all EPAM employees.

---

### GA (General Availability)

**Definition:** The Day 3 milestone. The portal is deployed to production, all smoke-test items pass, zero critical bugs, and the URL is shared with EPAM employees globally. Marked by `git tag v1.0.0`.

---

### Attachment

**Definition:** An optional single file that an employee can upload alongside an idea to provide supporting materials. Stored in Vercel Blob; the Blob URL is saved as `Idea.attachmentPath`.

**Constraints:**
- Allowed types: PDF, PNG, JPG, DOCX, Markdown (`.md`)
- Max size: 5 MB
- One attachment per idea (no multi-file in Phase 1)
- Behind `FEATURE_FILE_ATTACHMENT_ENABLED`
- If upload fails: idea is saved without attachment (graceful degradation); user sees toast

---

## Key Business Rules

### Self-Review Prevention
**Rule:** An admin who is the author of an idea cannot evaluate that idea.  
**Rationale:** Prevents conflicts of interest. An admin might submit ideas too, and should not be able to unilaterally accept their own work.  
**Enforcement:** `finalizeReview` Server Action checks `idea.authorId !== session.user.id`. Returns `ForbiddenError`: "You cannot review your own idea."

---

### Mandatory Rejection Comment
**Rule:** Rejecting an idea requires a comment of at least 10 characters.  
**Rationale:** Ensures submitters always receive actionable feedback when their idea is declined. A silent rejection is demotivating and defeats the portal's purpose.  
**Enforcement:** Zod schema + Server Action guard. Client-side validation shows error before API call.

---

### Unique Review Per Idea
**Rule:** Each idea can receive exactly one final evaluation (one `IdeaReview` record).  
**Rationale:** Prevents admins from reversing or overwriting previous decisions, which would undermine trust in the evaluation process.  
**Enforcement:** `IdeaReview.ideaId` is `@unique` in Prisma schema. `finalizeReview` checks `idea.review` existence before creating a new one.

---

### Additive-Only Schema Migrations (MVP)
**Rule:** No `DROP COLUMN`, `DROP TABLE`, or destructive schema changes are permitted during the 3-day build.  
**Rationale:** Ensures Vercel instant rollback always works — reverting a deployment never leaves the DB in an incompatible state.  
**Enforcement:** Manual review of all `prisma migrate dev` output before committing. Destructive changes deferred to Phase 2.

---

### Private Idea 404 (Not 403)
**Rule:** When a SUBMITTER requests the detail page of a PRIVATE idea that belongs to another user, the response is `404 Not Found`, not `403 Forbidden`.  
**Rationale:** Returning 403 confirms the idea exists. A 404 prevents visibility enumeration — the requester cannot tell whether the idea exists at all.  
**Enforcement:** `notFound()` called in the `[id]/page.tsx` Server Component when `idea.visibility === 'PRIVATE' && idea.authorId !== session.user.id && role === 'SUBMITTER'`.

---

### Role Promotion Chain
**Rule:** Only SUPERADMIN can promote users to ADMIN. Only SUPERADMIN can demote ADMIN users. No user can assign the SUPERADMIN role through the UI.  
**Rationale:** Prevents privilege escalation. If an ADMIN could arbitrarily create new ADMINs, the SUPERADMIN role would become meaningless.  
**Enforcement:** `updateUserRole` Server Action validates `session.user.role === 'SUPERADMIN'` for any role change, and rejects any attempt to assign `SUPERADMIN` as the new role.

---

### SUPERADMIN Cannot Self-Demote
**Rule:** A SUPERADMIN cannot change their own role through the user management interface.  
**Rationale:** Prevents the platform from ending up with zero superadmins, which would make role management impossible without a DB seed re-run.  
**Enforcement:** `updateUserRole` checks `userId !== session.user.id` before applying the change.
