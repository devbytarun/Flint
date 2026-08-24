# Authentication

Flint uses **session-based authentication with opaque tokens**, built on mature primitives rather than a framework's magic. The full flow is small enough to read: `server/auth/` (~150 lines) and `server/actions/auth.ts`.

## Passwords

Argon2id via `@node-rs/argon2`, OWASP baseline parameters (19 MiB memory, t=2, p=1). Encoded hashes embed salt + parameters, so future parameter upgrades can re-hash per user at login without migrations.

Registration/login validation is Zod (`lib/validation/auth.ts`): email normalized to lowercase, password minimum 10 characters.

## Sessions

1. On login/register, generate 32 random bytes → base64url **token**.
2. Store `SHA-256(token)` as the session row's primary key (plus user id, expiry, IP/UA snapshot). The raw token is never persisted.
3. Set the token in cookie `flint_session`: `httpOnly`, `SameSite=Lax`, `Secure` in production, 30-day max age.
4. Every request: `getCurrentUser()` hashes the presented token and looks up the row (`expires_at > now()`).
5. **Sliding expiry**: sessions past 50% of their lifetime are refreshed on access — one write only when actually needed.
6. Logout deletes the session row and clears the cookie.

Why hashed storage matters: stealing the users table (backup leak, SQL injection elsewhere, misconfigured dump) does not yield replayable credentials — the attacker gets unsalted SHA-256 digests of high-entropy random tokens, which are not brute-forceable in practice.

## Login hardening

- Generic "Invalid email or password." for both unknown-email and wrong-password cases (no account enumeration).
- A dummy Argon2 verify runs when the email doesn't exist, keeping response timing roughly uniform.
- Rate limits per IP **and** per email: 10 attempts / 5 minutes.
- Registration is throttled per IP (20/hour) because Argon2 hashing makes sign-up an attractive DoS vector.

Expired-session pruning happens opportunistically after successful logins.

## CSRF posture

- Session cookie is `SameSite=Lax`: cross-site POSTs don't carry it.
- All mutations are Server Actions, which Next.js protects with strict origin checks on their POST endpoints; direct forged POSTs without the action protocol fail.
- The public API is bearer-token based (no ambient cookies), so cross-site request forgery does not apply there.

## Route protection

The `(app)` route group layout resolves the session server-side before rendering children; unauthenticated visitors are redirected to `/login`. `(auth)` pages redirect authenticated users to `/projects`. This is the authoritative gate — hiding UI elements is never the mechanism.

## What's deliberately out of scope (v1)

Email verification/password reset (requires mail infrastructure), MFA, OAuth. The session core supports all three being added later.
