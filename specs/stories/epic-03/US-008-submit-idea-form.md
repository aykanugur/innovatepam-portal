# User Story: Submit Idea Form

**Story ID**: US-008  
**Epic**: EPIC-03 — Idea Submission & Discovery  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: M  
**Sprint**: Day 1 — EOD / Day 2 — AM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As an** authenticated employee,  
**I want to** fill out and submit an idea form with a title, description, category, visibility setting, and optional file attachment,  
**so that** my innovation idea is recorded and visible to reviewers.

---

## Context & Motivation

The submit form is the core value-generating action of the portal. Everything downstream — evaluation, analytics, leaderboards — depends on ideas being submitted. The form must be frictionless: well-validated, fast, and forgiving of mistakes (draft auto-save is a P3 nice-to-have, not in scope here).

---

## Acceptance Criteria

1. **Given** I am a logged-in SUBMITTER and visit `/ideas/new`,  
   **When** I fill all required fields and click "Submit Idea",  
   **Then** a new `Idea` record is created with `status=SUBMITTED` and I am redirected to the idea's detail page `/ideas/<id>`.

2. **Given** I submit the form with the "Title" field empty,  
   **When** the form is submitted,  
   **Then** I see the inline error: "Title is required" and no API call is made.

3. **Given** `FEATURE_FILE_ATTACHMENT_ENABLED=true` and I attach a file,  
   **When** the file is NOT PDF, PNG, JPG, DOCX, or MD, OR is larger than 5 MB,  
   **Then** I see the error: "Only PDF, PNG, JPG, DOCX, and MD files under 5 MB are accepted."

4. **Given** `FEATURE_FILE_ATTACHMENT_ENABLED=true` and I attach a valid file,  
   **When** the form is submitted,  
   **Then** the file is uploaded to Vercel Blob and `Idea.attachmentPath` stores the returned URL.

5. **Given** `FEATURE_FILE_ATTACHMENT_ENABLED=false`,  
   **When** I view the form,  
   **Then** the file attachment field is hidden entirely.

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | Description exceeds 2,000 characters | Inline counter; form rejects on submit: "Description must be under 2,000 characters" |
| 2 | Form submitted twice (double-click) | Disable submit button on first click; debounce API call |
| 3 | Vercel Blob upload fails | Show toast: "File upload failed. Idea saved without attachment." — save idea anyway |
| 4 | Unauthenticated user visits `/ideas/new` | Middleware redirects to `/login?callbackUrl=/ideas/new` |

---

## UI / UX Notes

- Route: `/ideas/new`
- Fields:
  - **Title** (required, max 100 chars — character counter)
  - **Description** (required, max 2,000 chars, textarea — character counter)
  - **Category** (required, single select): Process Improvement | New Product/Service | Cost Reduction | Employee Experience | Technical Innovation
  - **Visibility** (required, radio): Public | Private (tooltip: "Private ideas are only visible to admins")
  - **Attachment** (optional, shown if flag enabled): drag-and-drop or click to upload
- CTA: "Submit Idea" (primary), "Cancel" (secondary → back to `/ideas`)
- Loading state: spinner + "Submitting..." on button

---

## Technical Notes

- Route: `POST /api/ideas` or Server Action `createIdea(formData)`
- File upload: `put(fileName, file, { access: 'public' })` from `@vercel/blob`
- Zod schema: `{ title: z.string().min(1).max(100), description: z.string().min(1).max(2000), category: z.enum([...]), visibility: z.enum(['PUBLIC', 'PRIVATE']), attachment: z.instanceof(File).optional() }`
- **Feature Flag**: `FEATURE_FILE_ATTACHMENT_ENABLED`

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| US-006 — Login (session) | Story | Must be authenticated | Yes |
| US-002 — Prisma `Idea` model | Story | Data persistence | Yes |
| Vercel Blob token configured | Config | Required if flag enabled | Conditional |

---

## Test Plan

### Manual Testing
- [ ] Submit valid idea → redirect to detail page
- [ ] Submit with empty title → inline error, no API call
- [ ] Attach invalid file type → error message
- [ ] Attach 6 MB file → error message
- [ ] Attach valid file, submit → `attachmentPath` stored in DB
- [ ] `FEATURE_FILE_ATTACHMENT_ENABLED=false` → attachment field hidden

### Automated Testing
- [ ] Unit: Zod schema rejects missing title, oversized description
- [ ] Integration: `POST /api/ideas` creates record with `status=SUBMITTED`
- [ ] Integration: invalid file type returns 400
- [ ] E2E: Login → `/ideas/new` → fill form → submit → land on detail page

---

## Definition of Done

- [ ] Form creates Idea record in DB
- [ ] All validation rules enforced (client + server)
- [ ] File upload stored in Vercel Blob (when flag enabled)
- [ ] Feature flag hides attachment field
- [ ] All AC passing
- [ ] `git commit: feat(ideas): submit idea form`
