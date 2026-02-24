# API Contracts: Authentication & Role Management

**Feature**: 001-auth-rbac | **Base URL**: `/api` | **Auth**: Auth.js v5 JWT cookie

All endpoints return JSON. All error responses follow the shape:

```json
{ "error": "Human-readable message" }
```

---

## POST /api/auth/register

**Story**: US-004 — User Registration  
**Auth**: None (unauthenticated)

### Request

```
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "email": "john.doe@epam.com",
  "password": "MySecurePass1!",
  "displayName": "John Doe"
}
```

| Field         | Type   | Required | Constraints                                                         |
| ------------- | ------ | -------- | ------------------------------------------------------------------- |
| `email`       | string | Yes      | Must end with `@epam.com`; max 255 chars; lowercased before storage |
| `password`    | string | Yes      | Min 8 chars, max 72 chars                                           |
| `displayName` | string | No       | Max 100 chars; auto-derived from email local-part if omitted        |

### Responses

**201 Created** — User registered (email verification sent or immediate if flag off)

```json
{
  "message": "Registration successful. Please check your email to verify your account."
}
```

**400 Bad Request** — Validation failure

```json
{ "error": "Email must be an @epam.com address" }
```

```json
{ "error": "Password must be at least 8 characters" }
```

**409 Conflict** — Email already registered

```json
{ "error": "An account with this email already exists" }
```

**500 Internal Server Error** — Unexpected failure

```json
{ "error": "Registration failed. Please try again." }
```

---

## GET /api/auth/verify-email

**Story**: US-005 — Email Verification  
**Auth**: None (token in query string)

### Request

```
GET /api/auth/verify-email?token=<64-char-hex>
```

| Param   | Type   | Required | Description                               |
| ------- | ------ | -------- | ----------------------------------------- |
| `token` | string | Yes      | 64-char hex verification token from email |

### Responses

**302 Redirect** — `Location: /login?verified=1`  
(token valid and not expired — account activated)

**400 Bad Request** — Token expired

```json
{ "error": "Verification link has expired. Please register again." }
```

**404 Not Found** — Token not found

```json
{ "error": "Invalid verification link." }
```

**200 Already Verified**

```json
{ "message": "Email already verified. You can log in." }
```

---

## POST /api/auth/[...nextauth]

**Story**: US-006 — Login  
**Auth**: None (credentials in body)

Handled by Auth.js v5. The `CredentialsProvider.authorize` function:

1. Looks up user by email (`prisma.user.findUnique`)
2. Returns `null` if user not found → Auth.js 401
3. Returns `null` if `emailVerified = false` → Auth.js 401
4. Compares password with `bcryptjs.compare` → Auth.js 401 if mismatch
5. Returns user object on success → JWT issued

**Rate limiting** (FR-018): Applied in the Route Handler wrapper around `signIn`, keyed by normalized email. After 5 failures within 15 minutes:

```json
{ "error": "Too many login attempts. Try again in 15 minutes." }
```

### Login request (Auth.js standard)

```
POST /api/auth/callback/credentials
Content-Type: application/x-www-form-urlencoded

email=john.doe%40epam.com&password=MySecurePass1!&csrfToken=<token>
```

### Error redirect

On failure: `302 Location: /login?error=CredentialsSignin`

On rate limit: `302 Location: /login?error=RateLimited`

### Session cookie (on success)

```
Set-Cookie: authjs.session-token=<JWT>; HttpOnly; SameSite=Lax; Path=/
```

Session expires: 1 hour from creation. Non-persistent (no `Max-Age` / `Expires` on cookie → browser-session cookie).

---

## DELETE /api/auth/[...nextauth] (signOut)

**Story**: US-006 — Logout  
**Auth**: Authenticated session required

Auth.js standard signOut — clears `authjs.session-token` cookie.

```
POST /api/auth/signout    (Auth.js v5 uses POST for signOut)
```

**Response**: `302 Redirect: /login`

---

## PATCH /api/admin/users/:id/role

**Story**: US-007 — Role Management  
**Auth**: SUPERADMIN role required (JWT + DB re-verify)  
**Feature flag**: `FEATURE_USER_MANAGEMENT_ENABLED=true`

### Request

```
PATCH /api/admin/users/:id/role
Content-Type: application/json
Authorization: Cookie (authjs.session-token)
```

```json
{
  "role": "ADMIN"
}
```

| Field  | Type   | Required | Constraints                                                              |
| ------ | ------ | -------- | ------------------------------------------------------------------------ |
| `role` | string | Yes      | One of `"SUBMITTER"`, `"ADMIN"` (cannot promote to `SUPERADMIN` via API) |

### Responses

**200 OK**

```json
{
  "id": "cm…",
  "email": "jane.smith@epam.com",
  "role": "ADMIN"
}
```

**400 Bad Request** — Invalid role value

```json
{ "error": "Invalid role. Must be SUBMITTER or ADMIN." }
```

**403 Forbidden** — Caller is not SUPERADMIN

```json
{ "error": "Forbidden" }
```

**404 Not Found** — User ID not found

```json
{ "error": "User not found." }
```

**503 Service Unavailable** — Feature flag disabled

```json
{ "error": "Feature not enabled." }
```

---

## GET /api/admin/users

**Story**: US-007 — View Users  
**Auth**: ADMIN or SUPERADMIN role required  
**Feature flag**: `FEATURE_USER_MANAGEMENT_ENABLED=true`

### Request

```
GET /api/admin/users?page=1&limit=50
Authorization: Cookie (authjs.session-token)
```

| Param   | Type   | Default | Constraints |
| ------- | ------ | ------- | ----------- |
| `page`  | number | 1       | Min 1       |
| `limit` | number | 50      | Max 100     |

### Response

**200 OK**

```json
{
  "users": [
    {
      "id": "cm…",
      "email": "john.doe@epam.com",
      "displayName": "john.doe",
      "role": "SUBMITTER",
      "emailVerified": true,
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 50
}
```

**403 Forbidden** — Caller is not ADMIN/SUPERADMIN

```json
{ "error": "Forbidden" }
```

---

## Structured Log Events (FR-019)

All auth events are logged to stdout as JSON:

```json
{ "event": "register.success",   "email": "john@epam.com", "ts": "2025-01-15T10:30:00Z" }
{ "event": "register.fail",      "email": "bad@gmail.com", "reason": "invalid_domain", "ts": "…" }
{ "event": "login.success",      "email": "john@epam.com", "ts": "…" }
{ "event": "login.fail",         "email": "john@epam.com", "reason": "invalid_credentials", "ts": "…" }
{ "event": "login.rate_limited", "email": "john@epam.com", "ts": "…" }
{ "event": "verify.success",     "email": "john@epam.com", "ts": "…" }
{ "event": "verify.expired",     "token": "…first8chars…", "ts": "…" }
{ "event": "logout",             "userId": "cm…",          "ts": "…" }
{ "event": "role.changed",       "targetId": "cm…", "newRole": "ADMIN", "by": "cm…", "ts": "…" }
```

No PII beyond email in log payloads. Token logged as first 8 chars only.
