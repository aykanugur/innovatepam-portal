# User Story: Next.js Project Scaffold

**Story ID**: US-001  
**Epic**: EPIC-01 — Foundation & Infrastructure  
**Author**: Aykan Uğur  
**Created**: 2026-02-24  
**Last Updated**: 2026-02-24  
**Status**: Draft  
**Priority**: P1 (Must)  
**Estimate**: XS  
**Sprint**: Day 1 — AM  
**Assignee**: Aykan Uğur  

---

## Story Statement

**As a** developer,  
**I want to** initialize the Next.js 15 project with TypeScript, Tailwind CSS v4, shadcn/ui, ESLint, and Prettier,  
**so that** all subsequent feature work starts from a consistent, production-ready foundation.

---

## Context & Motivation

Every feature in the InnovatEPAM Portal depends on a correct project scaffold. A misconfigured TypeScript setup or missing tooling will cause rework across every subsequent story. This story must be completed first and verified before anything else is built.

---

## Acceptance Criteria

1. **Given** the project is initialized,  
   **When** `npm run build` is executed,  
   **Then** the build completes with zero TypeScript errors and zero Next.js build warnings.

2. **Given** the project is initialized,  
   **When** `npm run lint` is executed,  
   **Then** ESLint reports zero errors and zero warnings.

3. **Given** the project is initialized,  
   **When** a shadcn/ui component (e.g., `Button`) is imported and rendered on `/`,  
   **Then** it renders correctly with Tailwind styles applied.

4. **Given** the project is initialized,  
   **When** a `.ts` or `.tsx` file is saved,  
   **Then** Prettier auto-formats it on save (VS Code settings configured).

---

## Edge Cases & Negative Scenarios

| # | Scenario | Expected Behavior |
|---|---------|------------------|
| 1 | shadcn/ui conflicts with Tailwind v4 | Pin shadcn/ui to latest stable; check release notes; resolve before proceeding |
| 2 | TypeScript strict mode catches implicit `any` | Fix all implicit-any errors; do not use `// @ts-ignore` |

---

## UI / UX Notes

N/A — no user-facing UI in this story. Placeholder `/` route returns HTTP 200 only.

---

## Technical Notes

- `npx create-next-app@latest innovatepam --typescript --tailwind --app --eslint --src-dir`
- Install shadcn/ui: `npx shadcn@latest init`
- Configure `tsconfig.json` with `"strict": true`
- Configure Prettier: `.prettierrc` with `{ "semi": false, "singleQuote": true, "tabWidth": 2 }`
- Add `lint-staged` + `husky` pre-commit hook: runs `eslint --fix` and `prettier --write`
- **Feature Flag**: None

---

## Dependencies

| Dependency | Type | Status | Blocker? |
|-----------|------|--------|----------|
| Node.js 20+ installed locally | System | Required | Yes |
| GitHub repo created | Internal | Must exist before Day 1 | Yes |

---

## Test Plan

### Manual Testing
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes with zero warnings
- [ ] `Button` from shadcn/ui renders on `/` with correct styles

### Automated Testing
- [ ] No automated tests for scaffold; verified by build + lint passing

---

## Definition of Done

- [ ] `npm run build` passes
- [ ] `npm run lint` passes
- [ ] shadcn/ui component renders correctly
- [ ] `.prettierrc` and `.eslintrc` committed
- [ ] `git log` shows first conventional commit: `chore: initialize Next.js 15 project`
