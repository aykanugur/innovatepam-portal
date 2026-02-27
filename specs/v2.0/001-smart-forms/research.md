# Research: Smart Submission Forms

**Feature**: 001-smart-forms
**Date**: 2026-02-25
**Status**: Complete — all NEEDS CLARIFICATION items resolved

---

## Research Finding 1 — Category Identifier: Slug vs. Label String

**Question**: `Idea.category` stores slugs (e.g., `process-improvement`) per `constants/categories.ts` and `CreateIdeaSchema`. PRD §5.2 documents field templates using display label strings (e.g., `Process Improvement`). Which value should `CategoryFieldTemplate.category` store?

**Decision**: `CategoryFieldTemplate.category` stores **slugs** (e.g., `process-improvement`), matching `Idea.category`.

**Rationale**: The lookup at submission time is `WHERE category = idea.category`. Using slugs produces an exact-match join with zero transformation. Using labels would require a mapping step on every submission, introducing a point of failure if label strings ever diverge from the constant. Slugs are already validated by `categorySlugSchema` in `CreateIdeaSchema`.

**Alternatives considered**:

- Store label strings as category key: rejected — `Idea.category` stores slugs; mismatch would require a runtime translation map.
- Add a separate `slug` column on `CategoryFieldTemplate`: rejected — `category` IS the slug; a second column is redundant.

**Seed mapping** (PRD §5.2 label → slug):

| PRD Label            | Slug in DB             |
| -------------------- | ---------------------- |
| Process Improvement  | `process-improvement`  |
| New Product/Service  | `new-product-service`  |
| Cost Reduction       | `cost-reduction`       |
| Employee Experience  | `employee-experience`  |
| Technical Innovation | `technical-innovation` |

---

## Research Finding 2 — Template Pre-Load Pattern (Server-Side Props)

**Question**: How should the 5 field templates reach the client-side form component without a network request on category change?

**Decision**: The RSC page component (`app/(main)/ideas/new/page.tsx`) fetches all 5 `CategoryFieldTemplate` records at request time using Prisma, maps them to a `Record<CategorySlug, FieldDefinition[]>` object, and passes this as a prop to the client `IdeaForm` component.

**Rationale**: RSC pages can read from the database directly. The 5 templates are small (< 2 KB serialized), static between deploys, and needed immediately on page load. Passing them as a serialized prop avoids any client-side fetch and keeps the form interactive from the first paint.

**Alternatives considered**:

- `unstable_cache` with short TTL: overkill for data that only changes on deploy; adds cache-invalidation complexity.
- Client-side `useEffect` fetch on mount: requires a loading state, adds a waterfall for a page-blocking resource.
- Embed templates in `constants/field-templates.ts` and skip the DB entirely: valid for V2.0 since templates are seeded from this constant. However, keeping templates in the DB preserves the V3.0 admin-edit upgrade path. The RSC prop approach bridges both — the constant seeds the DB, the DB is the read source.

---

## Research Finding 3 — Dynamic Fields Validation Architecture

**Question**: How should the Server Action validate dynamic fields given that the schema depends on the submitted category?

**Decision**: Build a dynamic Zod schema at runtime inside `createIdeaAction()`:

1. Read `category` from the form payload.
2. Query `CategoryFieldTemplate` for that slug (single DB call, < 1 ms).
3. Construct a `z.object({...})` from the template's field definitions using field ID as key.
4. Apply type-specific validators per field type (`z.string().max(255)`, `z.string().max(2000)`, `z.coerce.number()`, `z.enum([...options])`).
5. Apply `.optional()` or `.min(1, 'required')` based on the `required` flag.
6. Strip unknown keys via `z.object({}).strip()` (satisfies FR-018).

**Rationale**: Zod supports dynamic schema construction at runtime. This approach uses a single source of truth (the seeded template) for both client rendering and server validation. No static schema can cover all categories simultaneously without coupling all templates into one union type.

**Alternatives considered**:

- Static Zod union type (one schema per category): combinatorial explosion for future new categories; requires code change when PRD §5.2 changes. Rejected.
- Manual loop validation without Zod: loses standardised error shape and chain composition. Rejected.

---

## Research Finding 4 — Audit Log Integration Pattern

**Question**: How to include `dynamicFields` in the existing `IDEA_SUBMITTED` audit log entry without breaking the existing `AuditLog.metadata` shape?

**Decision**: Extend the `metadata` JSON on the existing `IDEA_CREATED` audit log entry (the enum is `IDEA_CREATED`, not `IDEA_SUBMITTED` — confirmed from schema). Add a `dynamicFields` key alongside existing metadata fields when `FEATURE_SMART_FORMS_ENABLED=true`.

**Finding**: The existing `AuditAction` enum uses `IDEA_CREATED`, not `IDEA_SUBMITTED` (confirmed from `prisma/schema.prisma`). The spec's clarification answer referenced "IDEA_SUBMITTED" — this is resolved as `IDEA_CREATED`.

**Rationale**: `AuditLog.metadata` is `Json?` — it is already an open-ended map. Adding a `dynamicFields` key is backward-compatible; existing consumers of the audit log that ignore unknown metadata keys are unaffected.

---

## Research Finding 5 — EPIC-V2-03 Draft Integration Contract

**Question**: What specific change does FR-014 require so that EPIC-V2-03 draft management handles `dynamicFields` correctly?

**Decision**: `dynamicFields` on the `Idea` model is nullable `Json?`. Draft save/restore are standard Prisma update/read operations. No special handling is needed in the smart forms implementation — EPIC-V2-03 will write and read `dynamicFields` the same way it writes/reads `title`, `description`, etc. The smart forms feature exposes the field; EPIC-V2-03 consumes it as a first-class attribute.

**Contract to document for EPIC-V2-03**: When restoring a draft, the `idea-form.tsx` form must be initialized with `defaultValues.dynamicFields` set to the stored JSON map. The `DynamicFieldSection` component must accept `initialValues: Record<string, string | number>` to support pre-population on draft resume.

---

## Research Finding 6 — Feature Flag Enforcement Layers

**Question**: Where exactly is `FEATURE_SMART_FORMS_ENABLED` checked?

**Decision**: Two enforcement points:

1. **RSC page layer** (`app/(main)/ideas/new/page.tsx`): If flag is off, no templates are fetched and `IdeaForm` receives `templates = null`. The `DynamicFieldSection` renders nothing when `templates` is null.
2. **Server Action layer** (`createIdeaAction`): If flag is off, `formData.get('dynamicFields')` is ignored entirely — dynamic fields from the payload are stripped before the Prisma write.

**Read path flag** (idea detail + admin review panel): `DynamicFieldSection` / `AdditionalDetailsSection` also checks the flag at render time — if off, section is absent even for ideas with stored data.

---

## Resolved NEEDS CLARIFICATION Summary

| ID   | Question                        | Resolution                                                     |
| ---- | ------------------------------- | -------------------------------------------------------------- |
| NC-1 | Category key: slug or label?    | Slug — matches `Idea.category`                                 |
| NC-2 | Template delivery pattern       | RSC page prop — all 5 pre-loaded at render time                |
| NC-3 | Dynamic Zod schema construction | Runtime schema from DB template                                |
| NC-4 | Audit log action name           | `IDEA_CREATED` (not `IDEA_SUBMITTED`)                          |
| NC-5 | EPIC-V2-03 contract             | `initialValues` prop on `DynamicFieldSection` for draft resume |
| NC-6 | Flag enforcement layers         | RSC page + Server Action + read-path render                    |
