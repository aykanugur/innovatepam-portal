# Contract: Idea Categories

**Feature**: Foundation & Infrastructure (`001-foundation`)  
**Spec reference**: FR-016  
**File**: `constants/idea-categories.ts`

---

## Definition

`Idea.category` is a `String` column in PostgreSQL. The allowed values are **not** enforced by a database enum or check constraint — they are enforced at the **application layer** using Zod before any database insert or update. This design means adding or removing a category requires no database migration (FR-016).

---

## Contract Rules

1. **Single source of truth**: All allowed category values live exclusively in `constants/idea-categories.ts`. No other file may hard-code category strings.
2. **Zod enforcement**: Every code path that writes `Idea.category` to the database MUST validate against `ideaCategorySchema` before calling Prisma. Invalid values MUST throw a Zod validation error — not a database error.
3. **Adding a category**: Add the string to `IDEA_CATEGORIES` in `constants/idea-categories.ts`. No migration required.
4. **Removing a category**: Remove from `IDEA_CATEGORIES`. Existing rows with the old value remain valid in the DB; they will fail `ideaCategorySchema.parse()` if re-submitted through a form. Handle via data migration or keep as legacy.

---

## Canonical Implementation

Location: `constants/idea-categories.ts`

```ts
import { z } from 'zod'

/**
 * Predefined list of valid Idea categories.
 * Add new values here — no database migration required.
 * Used for: Zod validation (app layer), UI select options, API docs.
 */
export const IDEA_CATEGORIES = [
  'Process Improvement',
  'Technology & Tools',
  'Culture & Wellbeing',
  'Customer Experience',
  'Cost Reduction',
  'Learning & Development',
  'Other',
] as const

/** TypeScript type derived from the constant array */
export type IdeaCategory = (typeof IDEA_CATEGORIES)[number]

/** Zod schema — validates Idea.category in Server Actions and API routes */
export const ideaCategorySchema = z.enum(IDEA_CATEGORIES)
```

---

## Allowed Values (at time of writing)

| Value | Description |
|---|---|
| `Process Improvement` | Ideas that streamline internal workflows or reduce friction |
| `Technology & Tools` | Ideas related to developer tooling, platforms, or tech stack improvements |
| `Culture & Wellbeing` | Ideas to improve team culture, inclusion, mental health, or work-life balance |
| `Customer Experience` | Ideas that directly improve the experience of external clients or end users |
| `Cost Reduction` | Ideas that reduce project or operational costs |
| `Learning & Development` | Ideas for training, knowledge sharing, or skill development |
| `Other` | Ideas that do not fit the above categories |

---

## Usage Example

### Server Action (idea creation)

```ts
'use server'
import { ideaCategorySchema, IDEA_CATEGORIES } from '@/constants/idea-categories'
import { z } from 'zod'

const createIdeaSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(10),
  category: ideaCategorySchema,   // rejects any value not in IDEA_CATEGORIES
  visibility: z.enum(['PUBLIC', 'PRIVATE']),
})

export async function createIdea(data: unknown) {
  const parsed = createIdeaSchema.parse(data) // throws ZodError if category invalid
  // ... call db.idea.create(...)
}
```

### UI Select (form component)

```tsx
import { IDEA_CATEGORIES } from '@/constants/idea-categories'

<select name="category">
  {IDEA_CATEGORIES.map((c) => (
    <option key={c} value={c}>{c}</option>
  ))}
</select>
```

---

## Testing Requirement

A unit test MUST verify:
1. Valid categories pass `ideaCategorySchema.parse()` without error.
2. An invalid string (e.g. `"Nonsense"`) throws a `ZodError`.
3. An empty string throws a `ZodError`.
