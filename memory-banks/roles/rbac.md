# RBAC — Role-Based Access Control

**Last Updated**: 2026-02-27  
**Version**: 1.1 (updated for V2.0 multi-stage pipeline)  
**Owner**: Aykan Uğur

> Load this file before writing any guard, middleware check, server action auth block,
> or UI conditional that depends on a user's role. This is the authoritative RBAC matrix.

---

## 1. Roles

| Role         | Prisma Enum       | Description                                                                          |
| ------------ | ----------------- | ------------------------------------------------------------------------------------ |
| `USER`       | `Role.USER`       | Default role for all registered EPAM employees. Can submit and view ideas.           |
| `ADMIN`      | `Role.ADMIN`      | Reviewer role. Claims ideas from the queue, evaluates them, issues decisions.        |
| `SUPERADMIN` | `Role.SUPERADMIN` | Platform owner. Full access. Manages pipeline config, users, analytics, escalations. |

> There is no public/guest access. All routes require an authenticated session.  
> Role escalation path: `USER → ADMIN → SUPERADMIN` (SUPERADMIN promotes manually via `/admin/users`).

---

## 2. Permission Matrix

### Idea Management

| Action                            |   USER   | ADMIN | SUPERADMIN |
| --------------------------------- | :------: | :---: | :--------: |
| Submit new idea                   |    ✅    |  ✅   |     ✅     |
| View own ideas (`/my-ideas`)      |    ✅    |  ✅   |     ✅     |
| View all PUBLIC ideas (`/ideas`)  |    ✅    |  ✅   |     ✅     |
| View PRIVATE ideas (own only)     |    ✅    |  ✅   |     ✅     |
| View PRIVATE ideas (others)       |    ❌    |  ✅   |     ✅     |
| Edit idea (SUBMITTED status only) | ✅ (own) |  ❌   |     ✅     |
| Delete idea                       |    ❌    |  ❌   |     ✅     |

### Review Workflow

| Action                             | USER | ADMIN | SUPERADMIN |
| ---------------------------------- | :--: | :---: | :--------: |
| View admin queue (`/admin/review`) |  ❌  |  ✅   |     ✅     |
| Claim a stage (start review)       |  ❌  |  ✅   |     ✅     |
| Complete a stage (PASS / REJECT)   |  ❌  |  ✅   |     ✅     |
| Escalate to SUPERADMIN             |  ❌  |  ✅   |     ✅     |
| Resolve escalation (PASS / REJECT) |  ❌  |  ❌   |     ✅     |
| Abandon claimed stage              |  ❌  |  ✅   |     ✅     |
| Review own submitted idea          |  ❌  |  ❌   |     ❌     |

> **Self-review guard**: No admin (including SUPERADMIN) may review an idea they authored.  
> `// US-007 AC-5: SUPERADMIN cannot review their own submissions`

### Pipeline Configuration

| Action                               | USER | ADMIN | SUPERADMIN |
| ------------------------------------ | :--: | :---: | :--------: |
| View pipeline config                 |  ❌  |  ❌   |     ✅     |
| Create pipeline                      |  ❌  |  ❌   |     ✅     |
| Update pipeline (name, blind review) |  ❌  |  ❌   |     ✅     |
| Delete pipeline                      |  ❌  |  ❌   |     ✅     |
| Toggle blind review flag             |  ❌  |  ❌   |     ✅     |

### User Management

| Action                          | USER | ADMIN |    SUPERADMIN    |
| ------------------------------- | :--: | :---: | :--------------: |
| View user list (`/admin/users`) |  ❌  |  ❌   |        ✅        |
| Promote USER → ADMIN            |  ❌  |  ❌   |        ✅        |
| Demote ADMIN → USER             |  ❌  |  ❌   |        ✅        |
| Demote self (SUPERADMIN)        |  ❌  |  ❌   |        ❌        |
| Promote to SUPERADMIN           |  ❌  |  ❌   | ✅ (script only) |

> SUPERADMIN cannot demote themselves via the UI. The guard is enforced in the Server Action.

### Analytics

| Action                   | USER | ADMIN | SUPERADMIN |
| ------------------------ | :--: | :---: | :--------: |
| View analytics dashboard |  ❌  |  ✅   |     ✅     |
| Submission trend chart   |  ❌  |  ✅   |     ✅     |
| Ideas by category chart  |  ❌  |  ✅   |     ✅     |
| Top contributors table   |  ❌  |  ❌   |     ✅     |

### Settings

| Action                  | USER | ADMIN | SUPERADMIN |
| ----------------------- | :--: | :---: | :--------: |
| Update own display name |  ✅  |  ✅   |     ✅     |
| Update own email        |  ✅  |  ✅   |     ✅     |
| Update own password     |  ✅  |  ✅   |     ✅     |

---

## 3. Route Protection Map

Enforced in `proxy.ts` (Auth.js v5 middleware replacement):

| Route Pattern                          | Minimum Role  | Notes                                      |
| -------------------------------------- | ------------- | ------------------------------------------ |
| `/login`, `/register`, `/verify-email` | None (public) | Redirects to `/ideas` if already logged in |
| `/ideas`, `/ideas/[id]`, `/my-ideas`   | USER          | Any authenticated user                     |
| `/ideas/new`                           | USER          |                                            |
| `/admin/*`                             | ADMIN         | Middleware redirects USER to `/forbidden`  |
| `/admin/users`                         | SUPERADMIN    | ADMIN redirect to `/forbidden`             |
| `/admin/analytics`                     | ADMIN         |                                            |
| `/settings`                            | USER          |                                            |
| `/dashboard`                           | USER          |                                            |
| `/forbidden`                           | None          | Error page                                 |

---

## 4. Role Checks in Code

### Session Pattern (Server Components & Actions)

```typescript
import { auth } from '@/auth'
import { hasRole } from '@/lib/auth-utils'

const session = await auth()
if (!session?.user) redirect('/login')
// US-XXX AC-N: Only ADMIN and above may access
if (!hasRole(session.user.role, 'ADMIN')) {
  return { code: 'FORBIDDEN' }
}
```

### `hasRole()` Helper — `lib/auth-utils.ts`

```typescript
// Returns true if userRole meets or exceeds the required minimum role
// Role hierarchy: USER < ADMIN < SUPERADMIN
export function hasRole(userRole: Role, required: Role): boolean
```

### Re-reading Role from DB

On every sensitive admin action, role is re-read from the database (not trusted from JWT):

```typescript
const dbUser = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
if (dbUser?.role !== 'SUPERADMIN') return { code: 'FORBIDDEN' }
```

This prevents privilege escalation via stale JWT tokens.

---

## 5. Blind Review — Role-Specific Behaviour

When `FEATURE_BLIND_REVIEW_ENABLED=true` AND a pipeline's `blindReview=true`:

| Viewer Role                | Idea Status                         | Author Shown     |
| -------------------------- | ----------------------------------- | ---------------- |
| USER (submitter, own idea) | Any                                 | Real name always |
| USER (other users)         | Any                                 | Real name        |
| ADMIN                      | `UNDER_REVIEW`                      | `'Anonymous'`    |
| ADMIN                      | `SUBMITTED`, `ACCEPTED`, `REJECTED` | Real name        |
| SUPERADMIN                 | Any                                 | Real name always |

> SUPERADMIN always sees the real author — they are the escalation authority.  
> See `lib/blind-review.ts` for the `maskAuthorIfBlind()` implementation.
