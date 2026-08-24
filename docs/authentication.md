# Authentication & authorization

## Authentication

Flint uses **session-based authentication with opaque tokens**, built on mature primitives rather than a framework's magic. The full flow is small enough to read: `server/auth/` (~150 lines) and `server/actions/auth.ts`.

### Passwords

Argon2id via `@node-rs/argon2`, OWASP baseline parameters (19 MiB memory, t=2, p=1). Encoded hashes embed salt + parameters, so future parameter upgrades can re-hash per user at login without migrations.

Registration/login validation is Zod (`lib/validation/auth.ts`): email normalized to lowercase, password minimum 10 characters.

### Sessions

1. On login/register, generate 32 random bytes → base64url **token**.
2. Store `SHA-256(token)` as the session row's primary key (plus user id, expiry, IP/UA snapshot). The raw token is never persisted.
3. Set the token in cookie `flint_session`: `httpOnly`, `SameSite=Lax`, `Secure` in production, 30-day max age.
4. Every request: `getCurrentUser()` hashes the presented token and looks up the row (`expires_at > now()`).
5. **Sliding expiry**: sessions past 50% of their lifetime are refreshed on access — one write only when actually needed.
6. Logout deletes the session row and clears the cookie.

Why hashed storage matters: stealing the users table (backup leak, SQL injection elsewhere, misconfigured dump) does not yield replayable credentials — the attacker gets unsalted SHA-256 digests of high-entropy random tokens, which are not brute-forceable in practice.

### Login hardening

- Generic "Invalid email or password." for both unknown-email and wrong-password cases (no account enumeration).
- A dummy Argon2 verify runs when the email doesn't exist, keeping response timing roughly uniform.
- Rate limits per IP **and** per email: 10 attempts / 5 minutes.
- Registration is throttled per IP (20/hour) because Argon2 hashing makes sign-up an attractive DoS vector.

Expired-session pruning happens opportunistically after successful logins.

### CSRF posture

- Session cookie is `SameSite=Lax`: cross-site POSTs don't carry it.
- All mutations are Server Actions, which Next.js protects with strict origin checks on their POST endpoints; direct forged POSTs without the action protocol fail.
- The public API is bearer-token based (no ambient cookies), so cross-site request forgery does not apply there.

### Route protection

The `(app)` route group layout resolves the session server-side before rendering children; unauthenticated visitors are redirected to `/login`. `(auth)` pages redirect authenticated users to `/projects`. This is the authoritative gate — hiding UI elements is never the mechanism.

---

## Authorization

Authorization is **membership-based, hierarchical, and enforced server-side** at every mutation and read path.

### Roles

| Role | Can do |
| --- | --- |
| `member` | Read everything in the project (flags, configs, keys metadata, audit trail) |
| `admin` | + create/edit/delete flags and environment configs; manage API keys; edit project details |
| `owner` | + archive the project |

`server/authz/roles.ts` encodes this as a rank comparison (`hasAtLeast(role, required)`), so adding a role later is a one-line change.

### How access is resolved

Every project-scoped entry point calls:

```ts
const context = await getProjectContext(slug, user.id);
// → { project, role, canManage: role≥admin, canAdminister: role=owner } | null
```

The membership check happens **in the same SQL join** that fetches the project — there is no "fetch project by id" path that skips authorization. Non-members (and unknown slugs) both get `null`, rendered as a 404: project existence is not disclosed to outsiders.

### Enforcement points

| Surface | Mechanism |
| --- | --- |
| Page rendering | `(app)` layout requires a session; project layout resolves context once for nested routes |
| Server Actions | Each action independently re-runs `getCurrentUser()` + `getProjectContext()` + role gate before validation. Actions are reachable via forged direct POSTs, so nothing about the caller can be assumed |
| Public API | Key row carries `project_id` + `environment_id`; every query filters by both. A key can never read another project/environment |

### Design rules

1. **UI hiding is UX, not security.** Members see disabled controls; the server rejects the request anyway if tampered.
2. **No client-supplied trust anchors.** Flag lookups take `(projectId from membership, flagKey)`; API queries take `(projectId, environmentId from the key row)`.
3. **Fail closed.** Missing/ambiguous permission = deny.
4. **404 over 403** for cross-tenant reads to avoid existence oracles.

### Known limitation

Members cannot be invited yet through the UI (the data model and checks fully support it); projects are single-owner-plus-you in practice for v1. Membership management is the first planned v2 feature — see [technical decisions](technical-decisions.md).

## What's deliberately out of scope (v1)

Email verification/password reset (requires mail infrastructure), MFA, OAuth. The session core supports all three being added later.
