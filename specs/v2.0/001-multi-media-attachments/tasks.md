# Tasks: Multi-Media Attachments

**Feature**: `001-multi-media-attachments` | **Branch**: `001-multi-media-attachments`
**Input**: plan.md, spec.md, data-model.md, contracts/, quickstart.md
**Epic**: EPIC-V2-02 | **Stories**: US-021 – US-025

---

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase (different files, no blocking dependency)
- **[US#]**: Maps to a specific user story from spec.md
- No test tasks generated (not requested in spec)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add the feature flag, env var, and constants that every subsequent task depends on.

- [x] T001 Add `BLOB_READ_WRITE_TOKEN: z.string().min(1)` and `FEATURE_MULTI_ATTACHMENT_ENABLED: z.string().default('false')` to `innovatepam-portal/lib/env.ts`
- [x] T002 [P] Create `innovatepam-portal/constants/allowed-mime-types.ts` with `ALLOWED_MIME_TYPES`, `ALLOWED_EXTENSIONS`, `MAX_FILE_SIZE_BYTES` (25 MB), `MAX_TOTAL_SIZE_BYTES` (100 MB), `MAX_FILE_COUNT` (10)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema and validation infrastructure that every user story depends on. No story can be implemented until this phase is complete.

**⚠️ CRITICAL**: All user story phases are blocked until Phase 2 is complete.

- [x] T003 Add `IdeaAttachment` model, `ATTACHMENT_DELETED` to `AuditAction` enum, and relations on `Idea`/`User` in `innovatepam-portal/prisma/schema.prisma` (see data-model.md)
- [x] T004 Run `npm run db:migrate` then `npm run db:generate` inside `innovatepam-portal/` to apply migration and regenerate Prisma client
- [x] T005 [P] Create `innovatepam-portal/lib/validations/attachment.ts` with Zod upload request schema (MIME/extension, size ≤ 25 MB, filename sanitisation) and delete request schema (id non-empty), importing constants from `constants/allowed-mime-types.ts`

**Checkpoint**: Schema applied, Prisma client generated, validation schemas ready — user story implementation can begin.

---

## Phase 3: User Story 1 — Attachment Data Model & V1 Data Preservation (Priority: P1) 🎯 MVP

**Goal**: All previously submitted ideas with a single attached file (`attachmentPath`) have a corresponding `IdeaAttachment` record. The cascade delete relationship is in place.

**Independent Test**: Run `npx tsx --env-file=.env.local scripts/migrate-v1-attachments.ts`. Confirm logs show correct processed/created/skipped counts. Query the DB: every `Idea` with `attachmentPath IS NOT NULL` has an `IdeaAttachment` row with the matching `blobUrl`. Re-run the script and confirm counts show all rows as skipped (idempotent). Delete a test idea and confirm its `IdeaAttachment` rows are removed automatically (cascade).

- [x] T006 [US1] Create `innovatepam-portal/scripts/migrate-v1-attachments.ts`: iterate all `Idea` rows with `attachmentPath != null`, upsert `IdeaAttachment` on `(ideaId, blobUrl)` with `fileSize: 0`, `mimeType: 'application/octet-stream'`, `uploadedById: idea.authorId`, `createdAt: idea.createdAt`; log processed/created/skipped counts; exit non-zero on DB error

**Checkpoint**: V1 data preserved. User Story 1 is independently testable and complete.

---

## Phase 4: User Story 2 — Multi-File Upload on Idea Submission (Priority: P1)

**Goal**: Submitters can attach up to 10 files during idea creation. The upload area validates type and size client-side and server-side. All attachments are created atomically with the idea.

**Independent Test**: Enable `FEATURE_MULTI_ATTACHMENT_ENABLED=true`. Open `/ideas/new`. Drop three valid files onto the upload area — confirm each shows name, size, and a remove (×) button. Drop an `.exe` file — confirm it is rejected immediately. Submit the form. Navigate to the new idea's detail page and confirm all three files are listed. Disable the flag — confirm the upload area is absent.

- [x] T007 [P] [US2] Create `innovatepam-portal/app/api/ideas/upload/route.ts`: `POST` Route Handler — check feature flag → 404, check session → 401, validate `filename` query param and sanitise, validate Content-Type / extension against `ALLOWED_MIME_TYPES`/`ALLOWED_EXTENSIONS` → 400, validate Content-Length > 0 → 400 "File is empty.", validate Content-Length ≤ `MAX_FILE_SIZE_BYTES` → 413, call `put(filename, request.body, { access: 'private', addRandomSuffix: true })`, return `{ blobUrl }` on success or `{ error }` on blob SDK failure
- [x] T008 [P] [US2] Create `innovatepam-portal/components/ideas/drop-zone-uploader.tsx`: client component, drag-and-drop + click-to-browse (keyboard-accessible: Enter/Space activates browse; `aria-live` region announces file add/remove), validates file type (extension + MIME), non-zero byte size, and total size against constants before calling upload route, enforces `MAX_FILE_COUNT` and `MAX_TOTAL_SIZE_BYTES`, shows per-file name/size/remove-button list, per-file and per-batch inline error messages, calls `POST /api/ideas/upload` for each accepted file, exposes `onUploadsChange(blobUrls: string[])` callback
- [x] T009 [US2] Extend `innovatepam-portal/lib/actions/create-idea.ts` to accept `attachmentUrls: z.array(z.string().url()).max(MAX_FILE_COUNT).default([])` in its input schema (server-side count guard, FR-005); inside `prisma.$transaction`, after creating the `Idea`, call `prisma.ideaAttachment.createMany()` for each URL using the session user as `uploadedById`; if the transaction throws, call `del(...attachmentUrls)` to remove already-uploaded blobs before re-throwing (orphaned-blob cleanup, FR-009)
- [x] T010 [US2] Extend `innovatepam-portal/app/(main)/ideas/new/page.tsx`: when `env.FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'`, render `<DropZoneUploader>` in the creation form and pass the collected `blobUrls` to the `createIdea` Server Action on submit

**Checkpoint**: Submitters can upload files during idea creation. Story 2 is independently testable.

---

## Phase 5: User Story 3 — Attachment List on Idea Detail Page (Priority: P1)

**Goal**: The idea detail page displays all attachments with file name (as a download link), human-readable size, and upload date. No attachments section is shown when there are no attachments.

**Independent Test**: Open an idea with three attachments — confirm the "Attachments" section shows three rows with correct names, sizes, and dates. Click a download link — confirm the browser downloads the file and the Vercel Blob URL is never shown in the address bar or network tab. Open an idea with no attachments — confirm no "Attachments" section appears at all.

- [x] T011 [P] [US3] Create `innovatepam-portal/components/ideas/attachments-table.tsx`: accepts `attachments: IdeaAttachment[]` and `canDelete?: boolean` prop; renders nothing when array is empty; otherwise renders a table/list with file name as `<a href="/api/attachments/{id}">`, human-readable size (display "—" for `fileSize === 0`), formatted `createdAt`; truncates long filenames with ellipsis and shows full name on hover; shows delete button per row only when `canDelete === true`
- [x] T012 [US3] Extend `innovatepam-portal/app/(main)/ideas/[id]/page.tsx`: query `IdeaAttachment` records for the idea (include in the existing DB fetch); when `FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'` and attachments exist, render `<AttachmentsTable attachments={...} canDelete={false} />` below the idea body

**Checkpoint**: Attachment list visible on idea detail page. Story 3 independently testable.

---

## Phase 6: User Story 4 — Secure Private Attachment Download (Priority: P1)

**Goal**: Attachment downloads are always served through an authenticated server proxy. Raw Vercel Blob URLs are never exposed. Unauthenticated and unauthorised requests receive the correct error codes.

**Independent Test**: Sign out and request `GET /api/attachments/<id>` — confirm 401. Sign in as a user who is NOT the idea author and attempt to download an attachment on a non-public idea — confirm 403. Sign in as the idea author or any user on a public idea — confirm file downloads with correct filename and content type. Request a non-existent attachment ID — confirm 404.

- [x] T013 [US4] Create `GET` handler in `innovatepam-portal/app/api/attachments/[id]/route.ts`: check feature flag → 404, check session → 401, load `IdeaAttachment` with `idea { isPublic, authorId }` → 404 if missing, apply access control (ADMIN/SUPERADMIN always permit; public idea permits any auth user; non-public + non-author → 403), call `generateSignedUrl(blobUrl, { expiresIn: 60 })`, `fetch(signedUrl)` and stream body to `NextResponse` with `Content-Type`, `Content-Disposition: attachment; filename="..."`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff`; return 502 `{ error: 'File is no longer available.' }` on fetch failure

**Checkpoint**: Downloads are secured. Story 4 independently testable. Stories 3 + 4 together are end-to-end functional for the attachment list + download flow.

---

## Phase 7: User Story 5 — Admin Delete Individual Attachment (Priority: P2)

**Goal**: Admins can delete individual attachments from the review panel. The deletion removes both the DB record and the blob. A full audit log entry is created. Non-admin users cannot delete attachments post-submission.

**Independent Test**: Sign in as ADMIN. Open an idea with two attachments. Click the delete icon on one — confirm a confirmation dialog appears. Confirm deletion — verify only that attachment disappears from the list, the second remains, and the idea is intact. Check the Vercel Blob dashboard to confirm the file is gone. Check the audit log for an `ATTACHMENT_DELETED` entry with correct metadata. Attempt the same action as a USER role — confirm 403.

- [x] T014 [US5] Add `DELETE` handler to `innovatepam-portal/app/api/attachments/[id]/route.ts`: check feature flag → 404, check session → 401, check role (`ADMIN`/`SUPERADMIN`) → 403, load `IdeaAttachment` with `idea { id, title }` → 404, set `storageError = false`, call `del(blobUrl)` catching errors as non-fatal (set `storageError = true`), run `prisma.$transaction([ideaAttachment.delete, auditLog.create])` with `action: 'ATTACHMENT_DELETED'` and metadata `{ ideaId, ideaTitle, fileName, blobUrl, deletedByRole }`; return `204` if no storage error, or `200 { storageError: true }` if blob delete failed
- [x] T015 [P] [US5] Extend `innovatepam-portal/components/ideas/attachments-table.tsx`: when `canDelete === true`, show a trash/delete icon button per row; on click show a shadcn `AlertDialog` confirmation; on confirm call `DELETE /api/attachments/{id}` with a loading/disabled row state while in flight; on 204 or 200 remove the row from local state; on 200 response additionally show a toast warning: "Attachment record removed but the file could not be deleted from storage."
- [x] T016 [US5] Extend `innovatepam-portal/components/admin/review-action-panel.tsx`: when `FEATURE_MULTI_ATTACHMENT_ENABLED === 'true'` and the idea has attachments, render `<AttachmentsTable attachments={...} canDelete={true} />` for ADMIN/SUPERADMIN sessions

**Checkpoint**: Admin delete fully operational. Story 5 independently testable.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T017 [P] Verify `FEATURE_MULTI_ATTACHMENT_ENABLED=false` gates all surface areas: `POST /api/ideas/upload` → 404, `GET /api/attachments/[id]` → 404, `DELETE /api/attachments/[id]` → 404, upload area absent from `/ideas/new`, attachments section absent from `/ideas/[id]`
- [x] T018 Run the full quickstart.md flow end-to-end: add env vars, `npm run db:migrate`, `npm run db:generate`, optional V1 migration script, start dev server, verify upload → list → download → admin delete in sequence

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — **BLOCKS all user stories**
- **Phase 3 (US1)**: Depends on Phase 2 only — independent of all other stories
- **Phase 4 (US2)**: Depends on Phase 2 only — independent of US1
- **Phase 5 (US3)**: Depends on Phase 2 only for code implementation. End-to-end testing requires Phase 4 to have run first (to create attachments via the upload flow); component-level testing with seeded/mocked data is independent of Phase 4.
- **Phase 6 (US4)**: Depends on Phase 2 only — but practically requires Phase 5 (download links won't exist without the list UI)
- **Phase 7 (US5)**: Depends on Phase 5 (reuses `AttachmentsTable`) and Phase 6 (reuses the route file)
- **Phase 8 (Polish)**: Depends on all prior phases

### User Story Completion Order

```
Phase 1 → Phase 2 → Phase 3 (US1)  ← standalone
                   → Phase 4 (US2)  ← standalone
                   → Phase 5 (US3)  ↘
                   → Phase 6 (US4)   → Phase 7 (US5) → Phase 8
```

### Parallel Opportunities Within Phases

- **Phase 1**: T001 and T002 can run in parallel (different files)
- **Phase 2**: T005 can run in parallel with T003/T004 (new file, no schema types needed for Zod schema)
- **Phase 4**: T007 and T008 can run in parallel (route file vs. UI component)
- **Phase 5**: T011 can run in parallel with T013 (US4 route, different files entirely)
- **Phase 7**: T014 and T015 can run in parallel (route handler vs. UI extension)

---

## Parallel Example: Phase 4 (US2)

```
# Two developers can work at the same time:
Developer A → T007: app/api/ideas/upload/route.ts
Developer B → T008: components/ideas/drop-zone-uploader.tsx

# Then converge on:
Developer A or B → T009: lib/actions/create-idea.ts (depends on T007 blobUrl contract)
Developer A or B → T010: app/(main)/ideas/new/page.tsx (depends on T008 component)
```

---

## Implementation Strategy

### MVP (User Story 1 only — schema + V1 migration)

1. Complete Phase 1 (Setup)
2. Complete Phase 2 (Foundational — schema + migrate + validation)
3. Complete Phase 3 (US1 — V1 migration script)
4. **STOP and VALIDATE**: Run migration script, verify DB state
5. Deploy schema migration to staging

### Incremental Delivery

| Increment     | Delivers                | Independently testable?          |
| ------------- | ----------------------- | -------------------------------- |
| Phase 1 + 2   | Schema live in DB       | Via `prisma studio`              |
| + Phase 3     | V1 data preserved       | Run migration script, query DB   |
| + Phase 4     | Upload on creation form | Create an idea with files        |
| + Phase 5 + 6 | List + secure download  | View idea detail, download files |
| + Phase 7     | Admin delete            | Delete from review panel         |

### Single Developer Sequence

```
T001 → T002 → T003 → T004 → T005 → T006
     → T007 → T008 → T009 → T010
     → T011 → T012
     → T013
     → T014 → T015 → T016
     → T017 → T018
```

---

## Summary

| Phase                 | Tasks        | User Story | Priority |
| --------------------- | ------------ | ---------- | -------- |
| Phase 1: Setup        | T001–T002    | —          | —        |
| Phase 2: Foundational | T003–T005    | —          | Blocker  |
| Phase 3               | T006         | US1        | P1       |
| Phase 4               | T007–T010    | US2        | P1       |
| Phase 5               | T011–T012    | US3        | P1       |
| Phase 6               | T013         | US4        | P1       |
| Phase 7               | T014–T016    | US5        | P2       |
| Phase 8: Polish       | T017–T018    | —          | —        |
| **Total**             | **18 tasks** |            |          |

**Parallel opportunities identified**: 5 (T001+T002, T005, T007+T008, T011+T013, T014+T015)
**MVP scope**: Phases 1–3 (5 tasks) — schema live, V1 data preserved
