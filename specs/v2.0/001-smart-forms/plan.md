# Implementation Plan: Smart Submission Forms

**Branch**: `001-smart-forms` | **Date**: 2026-02-25 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-smart-forms/spec.md`

## Summary

Extend the InnovatEPAM idea submission form to display category-specific dynamic fields when a submitter selects a category. Field templates for 5 categories (10 fields total) are seeded into a new `CategoryFieldTemplate` model at deploy time. Submitted values are stored in a new `dynamicFields Json?` column on the `Idea` model. The dynamic fields section is pre-loaded at RSC render time and toggled client-side with zero network requests on category change. The feature is gated behind `FEATURE_SMART_FORMS_ENABLED`. All read surfaces (idea detail page, admin review panel) display the structured fields; V1 ideas with `dynamicFields = null` render cleanly.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 20 LTS  
**Primary Dependencies**: Next.js 15 (App Router, RSC, Server Actions), Prisma ORM v7, Zod, shadcn/ui, Tailwind CSS v4, Vitest, Playwright  
**Storage**: PostgreSQL (Neon) via Prisma. New `CategoryFieldTemplate` model; `dynamicFields Json?` column added to `Idea`.  
**Testing**: Vitest (unit + integration), Playwright (E2E). Coverage gate ≥ 80% on new Server Action logic.  
**Target Platform**: Vercel (Next.js full-stack deployment)  
**Project Type**: Web application (Next.js monorepo under `innovatepam-portal/`)  
**Performance Goals**: Dynamic field section appears synchronously on category change (pre-loaded; zero network round-trip; no measurable render overhead beyond page initial load)  
**Constraints**: `Idea.category` stores **slugs** (e.g., `process-improvement`); `CategoryFieldTemplate.category` must also store slugs to enable O(1) template lookup. Feature flag enforced at both page-render and Server Action layers.  
**Scale/Scope**: 5 category templates, 10 total dynamic fields, single-tenant EPAM internal tool (~hundreds of users)

---

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

The project constitution file is a blank template with no project-specific principles defined. The following universal software quality gates are applied instead:

| Gate                                                    | Status | Notes                                                                                                             |
| ------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| Feature is independently testable before adjacent epics | PASS   | EPIC-V2-03 dependency (FR-014) is a forward-compatible extension; smart forms work fully without draft management |
| No breaking changes to V1 data                          | PASS   | `dynamicFields` is nullable; existing rows unaffected; no migration backfill                                      |
| Feature flag isolates new behaviour                     | PASS   | `FEATURE_SMART_FORMS_ENABLED` enforced at render + Server Action (FR-010)                                         |
| Server-side validation mirrors client-side              | PASS   | Zod schema validates required fields, type coercion, char limits, key stripping (FR-005, FR-006, FR-016, FR-018)  |
| Accessibility compliance                                | PASS   | WCAG 2.1 AA required (FR-015) — shadcn/ui form primitives used throughout                                         |

**Re-check after Phase 1 design**: PASS — no violations introduced by data model or contract design.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-smart-forms/
├── plan.md          ✓ this file
├── research.md      ✓ Phase 0 output
├── data-model.md    ✓ Phase 1 output
├── quickstart.md    ✓ Phase 1 output
├── contracts/
│   └── server-actions.md  ✓ Phase 1 output
└── tasks.md         ← Phase 2 output (created by /speckit.tasks)
```

### Source Code (`innovatepam-portal/`)

```text
prisma/
├── schema.prisma          # Add CategoryFieldTemplate model + dynamicFields to Idea
├── seed.ts                # Add upsert loop for 5 CategoryFieldTemplate records
└── migrations/
    └── <timestamp>_smart_forms/  # Generated migration

constants/
├── categories.ts          # Existing — source of truth for category slugs
└── field-templates.ts     # NEW — CATEGORY_FIELD_TEMPLATES constant (seed source)

types/
└── field-template.ts      # NEW — FieldDefinition interface + DynamicFieldValue type

lib/
└── validations/
    └── idea.ts            # Extend CreateIdeaSchema + add DynamicFieldsSchema + buildDynamicFieldsSchema helper

lib/actions/
└── create-idea.ts         # Extend to validate + persist dynamicFields when flag on

app/
└── (main)/
    └── ideas/
        └── new/
            └── page.tsx   # Pass all 5 templates as prop to IdeaForm

components/
└── ideas/
    ├── idea-form.tsx          # Extend to render DynamicFieldSection; reset on category change
    ├── dynamic-field-section.tsx  # NEW — renders fields by type; tracks controlled state
    └── idea-detail.tsx        # Extend to render AdditionalDetailsSection
components/
└── admin/
    └── decision-card.tsx      # Extend to render AdditionalDetailsSection (confirmed target; not review-action-panel.tsx)

tests/
├── unit/
│   └── dynamic-field-section.test.tsx  # NEW
├── integration/
│   └── create-idea-dynamic.test.ts     # NEW
└── e2e/
    └── smart-forms.spec.ts             # NEW
```

**Structure Decision**: Single Next.js monolith under `innovatepam-portal/`. Feature is implemented as vertical slices — DB schema → constant → type → validation → Server Action → RSC page → client component — with no new packages or services.

---

## Complexity Tracking

> No constitution violations. No justifications required.
