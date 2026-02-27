# Spec Quality Checklist: Multi-Media Attachments

**Purpose**: Unit-test the specification for completeness, clarity, consistency, and measurability before planning begins
**Created**: 2026-02-26
**Audience**: Author self-review
**Focus**: Full spec quality — all dimensions equally
**Spec**: [spec.md](../spec.md)

---

## Requirement Completeness

- [x] CHK001 — Are notification requirements defined for the submitter when an admin deletes one of their attachments after submission (e.g., email, in-app notice, or explicitly no notification)? [Completeness, Gap]
      → **Resolved**: Explicit assumption added to spec.md: "No notification is sent to the idea submitter when an admin deletes one of their attachments. Admin attachment deletion is a moderation action; only the admin sees the confirmation."
- [x] CHK002 — Is the content of the audit log entry specified beyond "record deletion event" — e.g., which fields are required (actor, idea ID, file name, timestamp)? [Completeness, Spec §FR-020, Gap]
      → **Pass**: contracts/delete-attachment.md specifies full metadata: `{ ideaId, ideaTitle, fileName, blobUrl, deletedByRole }` + `userId` (session) + `createdAt` (AuditLog default).
- [x] CHK003 — Are display requirements defined for the "Attachments" section specifically on the admin review panel, distinct from the submitter idea detail page? US-025 references "review panel" but §US-023 only specifies the detail page layout. [Completeness, Spec §US-023, US-025, Gap]
      → **Pass**: The admin panel reuses `<AttachmentsTable canDelete={true}>` (T016). Same component, same layout, with delete capability added. No distinct layout needed.
- [x] CHK004 — Are upload date display requirements specified — timezone handling and format (e.g., relative "2 days ago" vs. absolute "Feb 25, 2026")? [Completeness, Spec §FR-014, Gap]
      → **Resolved**: Explicit assumption added: `toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })` in browser local timezone (e.g., "25 Feb 2026").
- [x] CHK005 — Are requirements defined for what a submitter sees when accessing the download route for their own non-public submitted idea? §FR-012 covers "another user's non-public idea" but the own-idea scenario is only implied, not stated. [Completeness, Spec §FR-012, Gap]
      → **Pass**: contracts/download-proxy.md access control table explicitly covers this: "non-public + not author → 403" means author IS permitted. FR-012 phrase "only the idea's author and admins/superadmins may access those" covers it.

---

## Requirement Clarity

- [x] CHK006 — Is "human-readable file size" quantified with specific formatting rules — at what byte threshold does "KB", "MB" switch, and how many decimal places are shown (e.g., "2.3 MB" vs "2 MB")? [Clarity, Spec §FR-014, US-023]
      → **Resolved**: Explicit assumption added: below 1 KB → "< 1 KB"; below 1 MB → "X.X KB" (1 dp); ≥ 1 MB → "X.X MB" (1 dp); fileSize === 0 → "—".
- [x] CHK007 — Is the legacy `attachmentPath` field's lifecycle defined — is it retained permanently, or is there a target version for removal (the spec mentions "until V3.0" in the US-021 story file, but this does not appear in the spec itself)? [Clarity, Spec §Key Entities, Gap]
      → **Resolved**: Explicit assumption added: "`attachmentPath` is retained indefinitely as a soft-deprecated read-only field. No column removal is planned in this epic."
- [x] CHK008 — Is "disappears from the list without a full page reload" (US-025 AC-2) specific enough to be implemented unambiguously — is optimistic removal required, or is a loading spinner while the request completes acceptable? [Clarity, Spec §US-025 AC-2]
      → **Resolved**: Explicit assumption added: "No optimistic removal; row shows a loading/disabled state while the delete request is in flight, then is removed on successful response."
- [x] CHK009 — Is "all attachment functionality" in FR-019 precisely scoped — does disabling `FEATURE_MULTI_ATTACHMENT_ENABLED` also suppress the V1 migration script, or only user-facing upload/download/delete capabilities? [Clarity, Spec §FR-019]
      → **Resolved**: Explicit assumption added: flag gates only user-facing routes; migration script runs regardless of flag value.

---

## Requirement Consistency

- [x] CHK010 — Does FR-017 (soft failure: attachment record is deleted even when blob delete fails) conflict with SC-006 (0% partial data remains)? SC-006 targets upload atomicity; are the two requirements clearly scoped to different operations so no contradiction exists? [Consistency, Spec §FR-017, SC-006]
      → **Pass**: SC-006 explicitly scopes to upload batch failure ("If a batch upload fails mid-way"). FR-017 scopes to admin delete. No overlap — different operations, no conflict.
- [x] CHK011 — Is the feature-flag behavior in FR-019 consistent across all five user stories — specifically, does the US-021 migration script explicitly run regardless of the flag, while only user-facing routes respect it? [Consistency, Spec §FR-019, US-021]
      → **Resolved**: Consistent. Assumption in spec.md and tasks.md both confirm migration script is flag-independent.
- [x] CHK012 — Are the admin access rules in FR-013 (download) and FR-016 (delete) consistent with each other — do both apply to `ADMIN` and `SUPERADMIN` roles identically? [Consistency, Spec §FR-013, FR-016]
      → **Pass**: Both FR-013 and FR-016 apply identically to `ADMIN` and `SUPERADMIN`. contracts/download-proxy.md and contracts/delete-attachment.md both check `role in ['ADMIN', 'SUPERADMIN']`.

---

## Acceptance Criteria Quality

- [x] CHK013 — Is SC-007 ("same time budget as a page without attachments") objectively measurable without a concrete millisecond threshold? How will this be verified? [Measurability, Spec §SC-007]
      → **Resolved**: SC-007 updated to "under 3 seconds (LCP, p95 on standard broadband), verified manually during T018 quickstart validation."
- [x] CHK014 — Is SC-001's "no more than 3 user interactions" objectively countable — does drag-and-drop count as 1 interaction or 2, and is file-browser selection counted as 1? [Measurability, Spec §SC-001]
      → **Resolved**: SC-001 updated with explicit definition: drag-and-drop = 1 interaction (drop event); (1) select/drop, (2) passive review, (3) submit.

---

## Scenario Coverage

- [x] CHK015 — Are requirements defined for when `BLOB_READ_WRITE_TOKEN` is invalid or expired at upload time — should the upload fail with a specific user-facing message, or is a generic error acceptable? [Coverage, Gap]
      → **Pass**: contracts/upload-endpoint.md covers this: Vercel Blob SDK failure → 500 `{ error: 'Upload failed. Please try again.' }`. Generic error is explicitly accepted (token is validated at startup via env.ts; runtime expiry is rare).
- [x] CHK016 — Are requirements defined for zero-byte files — are they accepted or rejected, and if rejected, what message is shown? [Coverage, Edge Case, Gap]
      → **Resolved**: Assumption added + upload contract updated (step 6: Content-Length > 0 → 400 "File is empty.") + T007/T008 updated with zero-byte validation.
- [x] CHK017 — Is the behavior specified for file names containing special characters — spaces, unicode, or path-traversal sequences (e.g., `../../etc/passwd.pdf`) — in both display and storage? [Coverage, Edge Case, Gap]
      → **Pass**: contracts/upload-endpoint.md step 4 specifies sanitisation (no `/`, `\`, `..`, null bytes) → 400 "Invalid filename". Display uses CSS truncation + `title` attribute (assumption added).
- [x] CHK018 — Are requirements explicitly stated for admins managing attachments on ideas with `ACCEPTED` or `REJECTED` status — the US-025 source story mentions this is permitted, but this is absent from the spec's acceptance scenarios? [Coverage, Spec §US-025, Gap]
      → **Resolved**: Assumption added: "Admins may delete attachments regardless of the parent idea's status (SUBMITTED, UNDER_REVIEW, ACCEPTED, REJECTED)."

---

## Non-Functional Requirements

- [x] CHK019 — Are accessibility requirements defined for the file upload drop zone — keyboard navigation to trigger browse, screen-reader announcements when a file is added or removed from the list? [Non-Functional, Gap]
      → **Resolved**: Assumption added + T008 updated: browse trigger is keyboard-focusable (Enter/Space); `aria-live` region announces file add/remove.
- [x] CHK020 — Are rate-limiting or abuse-prevention requirements specified for the upload endpoint — e.g., max requests per user per minute? [Non-Functional, Gap]
      → **Pass**: contracts/upload-endpoint.md states: "Rate limiting: inherits global rate limiter on `/api/*` routes." Existing Upstash Redis rate limiter covers this.

---

## Dependencies & Assumptions

- [x] CHK021 — Is the assumption that `BLOB_READ_WRITE_TOKEN` is available in the project environment validated before planning begins — is it confirmed present, or is its setup an unresolved dependency? [Assumption, Spec §Assumptions]
      → **Pass**: `@vercel/blob ^2.3.0` is already in `package.json`. Token setup documented in quickstart.md. `env.ts` validates the token at startup with `z.string().min(1)` — misconfiguration fails loudly.
- [x] CHK022 — Is the V1 `attachmentPath` column format validated before migration — the spec acknowledges it could be a relative path or non-URL value (edge case 3 of US-021), but does not require format validation; is this a known, accepted risk? [Dependency, Spec §US-021 Edge Cases]
      → **Resolved**: Assumption added: non-URL values are migrated as-is (known accepted risk). They will return 502 on download attempt. No format validation step required.
- [x] CHK023 — Are concurrency-safety requirements defined for the V1 migration script — can it be run against a live production database while the app is serving traffic, or must the app be paused? [Gap, Assumption]
      → **Resolved**: Assumption added: "Safe to run against a live production database. All operations are idempotent `upsert` calls; no rows are locked for extended periods."

---

## Ambiguities & Conflicts

- [x] CHK024 — Is `text/markdown` MIME type detection reliable enough for cross-browser client-side validation, or should `.md` file extension be the primary detection signal? The spec references both the MIME type and the extension — are they treated as equivalent, and which takes precedence on conflict? [Ambiguity, Spec §FR-008]
      → **Pass**: research.md finding 4 and contracts/upload-endpoint.md both specify: MIME type OR extension match is sufficient (not both required). If browser sends `application/octet-stream` for `.md`, the extension check passes it. Both must fail for rejection. Extension is the reliable primary signal for `.md`.
