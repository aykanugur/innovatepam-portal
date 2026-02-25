# User Story: Draft Expiry Cron Job

**Story ID**: US-030
**Epic**: EPIC-V2-03 — Draft Management
**Author**: Aykan Uğur
**Created**: 2026-02-25
**Last Updated**: 2026-02-25
**Status**: Draft
**Priority**: P2 (Should)
**Estimate**: XS
**Sprint**: Phase 4 — Step 5
**Assignee**: Aykan Uğur

---

## Story Statement

**As a** portal operator,
**I want** expired drafts to be automatically deleted daily,
**so that** the database does not accumulate abandoned `DRAFT` ideas indefinitely.

---

## Context & Motivation

Drafts have a 30-day expiry (`draftExpiresAt`). Without automated cleanup, expired drafts pile up in the database forever — consuming storage and cluttering any diagnostic queries. A daily cron job running at midnight UTC deletes all `DRAFT` ideas where `draftExpiresAt < now()`.

---

## Acceptance Criteria

1. **Given** the Vercel cron is configured,
   **When** the cron fires daily at midnight UTC,
   **Then** `GET /api/cron/expire-drafts` is called with the `CRON_SECRET` header.

2. **Given** the Route Handler receives the request with a valid `Authorization: Bearer <CRON_SECRET>` header,
   **When** the handler runs,
   **Then** all `Idea` records with `status=DRAFT` and `draftExpiresAt < new Date()` are deleted and the count of deleted records is returned in the JSON response.

3. **Given** the Route Handler receives a request without the correct `CRON_SECRET`,
   **When** the handler runs,
   **Then** it returns `401 Unauthorized` without touching the database.

4. **Given** zero drafts have expired,
   **When** the cron fires,
   **Then** the handler returns `{ deleted: 0 }` with HTTP `200` — no errors.

5. **Given** `FEATURE_DRAFT_ENABLED=false`,
   **When** the cron fires,
   **Then** the handler still runs and cleans up any `DRAFT` records in the DB (clean-up is independent of the feature flag).

---

## Edge Cases & Negative Scenarios

| #   | Scenario                                                                                                  | Expected Behavior                                                                                                                                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | A submitter is in the middle of editing a draft at exactly the moment the cron runs and the draft expires | The draft is deleted by the cron. The next `saveDraft` call from the submitter will get a `404` on update (no matching `DRAFT` with that ID) — the Server Action creates a new draft instead                       |
| 2   | Cascading deletes on `IdeaAttachment`                                                                     | `IdeaAttachment.onDelete: Cascade` (from US-021) automatically deletes attachment records when the parent `Idea` is deleted — blobs in Vercel Blob are NOT automatically deleted by the cron (acceptable for V2.0) |
| 3   | The cron route is called without `vercel.json` schedule (manual trigger in testing)                       | The Route Handler validates only the `CRON_SECRET` — it does not verify the caller is Vercel; manual `GET` with correct secret works the same way                                                                  |

---

## UI / UX Notes

No user-facing UI. The cron runs entirely on the server. Vercel's cron log in the dashboard provides observability.

---

## Technical Notes

- Route Handler: `app/api/cron/expire-drafts/route.ts`
- `vercel.json` cron configuration:
  ```json
  {
    "crons": [
      {
        "path": "/api/cron/expire-drafts",
        "schedule": "0 0 * * *"
      }
    ]
  }
  ```
- Route Handler logic:
  1. Check `Authorization` header: `Bearer ${process.env.CRON_SECRET}` → `401` if mismatch
  2. `const result = await prisma.idea.deleteMany({ where: { status: 'DRAFT', draftExpiresAt: { lt: new Date() } } })`
  3. Return `NextResponse.json({ deleted: result.count })`
- `CRON_SECRET` must be added to `lib/env.ts` (Zod schema) and `.env.example`.
- Blob cleanup of expired draft attachments: deferred to V3.0. Mark as a known debt item in a code comment.
- **Feature Flag**: not applicable — clean-up runs regardless.

---

## Dependencies

| Dependency                                                           | Type  | Status                                  | Blocker? |
| -------------------------------------------------------------------- | ----- | --------------------------------------- | -------- |
| US-026 — `DRAFT` status + `draftExpiresAt`                           | Story | Must be done first                      | Yes      |
| `CRON_SECRET` env var                                                | Infra | Must be set in Vercel before deployment | Yes      |
| Vercel Hobby/Pro plan (cron jobs require Pro for < 1/hour frequency) | Infra | Daily cron is available on Hobby        | No       |

---

## Test Plan

### Manual Testing

- [ ] Create a draft with `draftExpiresAt` in the past → call `GET /api/cron/expire-drafts` with correct secret → draft deleted, `{ deleted: 1 }` returned
- [ ] Call with incorrect secret → `401`
- [ ] No expired drafts → `{ deleted: 0 }` returned

### Automated Testing

- [ ] Integration: Route Handler with correct `CRON_SECRET` deletes expired drafts
- [ ] Integration: Route Handler with wrong secret returns `401`
- [ ] Integration: `deleteMany` query does not delete `DRAFT` ideas where `draftExpiresAt > now()`

---

## Definition of Done

- [ ] `app/api/cron/expire-drafts/route.ts` created
- [ ] `vercel.json` cron schedule configured (`0 0 * * *`)
- [ ] `CRON_SECRET` documented in `lib/env.ts` and `.env.example`
- [ ] Blob cleanup noted as V3.0 debt with a code comment
- [ ] `git commit: feat(drafts): draft expiry cron job`
