# Security

A review was performed before completion; findings and fixes are listed at the bottom. Priority order: correctness > security > maintainability.

## Authentication

- Argon2id (OWASP parameters) password hashing; encoded hashes carry salt/params.
- Opaque 32-byte session tokens; only SHA-256 hashes stored — DB dumps aren't replayable.
- Cookies: `httpOnly`, `SameSite=Lax`, `Secure` in production, path-scoped.
- Generic auth errors + timing-smoothed unknown-email path → no account enumeration.
- Login rate-limited per IP and per email (10/5min); registration per IP (20/h).

## Authorization

- Membership join on every project access; roles ranked; enforced in actions/services, never only UI.
- Cross-project access attempts return 404 (no existence oracle).
- Public API keys embed project+environment scoping used in every query's WHERE clause.
- Server Actions re-authenticate on every invocation — they are reachable via direct POST by design.

## API keys & secrets

- Full token shown exactly once; stored as SHA-256 with a non-secret display prefix for direct index lookup, then constant-time (`timingSafeEqual`) hash comparison.
- Revocation is immediate and idempotent; usage tracking write-throttled.
- Secrets live in `.env.local` (gitignored); `.env.example` documents shape. No credentials are committed (verified in history during final review).

## Input handling

- Zod schemas at every trust boundary: server actions and API bodies. Rules JSON validated on write; defensively ignored if malformed at read.
- All SQL parameterized through Drizzle/postgres.js tagged templates — no string-built queries anywhere.
- React escaping everywhere; the audit viewer renders diffs as text nodes, never HTML (`dangerouslySetInnerHTML` is absent from the codebase).

## CSRF & headers

- Session cookie `SameSite=Lax` + Next.js Server Action origin checks protect dashboard mutations.
- Public API uses bearer tokens, immune to CSRF; CORS `*` is safe for header-authenticated infrastructure endpoints.
- Headers: `X-Powered-By` disabled, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, strict Referrer-Policy, minimal Permissions-Policy.

## Abuse resistance

- In-memory sliding-window limiter shared by login/register/API paths (120/min per key on the public API) with `Retry-After`.
- Evaluation fails closed without leaking internals; error envelopes use stable codes.

## Audit integrity

- Audit rows are insert-only in application code; no update/delete code paths exist for them.
- Projects archive instead of hard-delete so history survives.
- Actor identity snapshotted so user deletion can't erase attribution.

## Review findings → fixes

| # | Finding | Resolution |
| --- | --- | --- |
| 1 | Base64url secrets can contain `_`, colliding with the original token delimiter — a crafted secret could make presented keys resolve to another row's display prefix | Token scheme changed to dot-delimited (`flint.<env>.<secret>`); dots cannot occur in any component |
| 2 | ORM wraps driver errors, so top-level `code === "23505"` checks never fired (duplicate emails silently became 500s) | `hasPostgresCode()` walks the cause chain; domain errors (`FlagKeyTakenError`) mapped to field errors |
| 3 | Registration unthrottled while login was protected | Per-IP limiter added |
| 4 | Framework/version disclosure + missing hardening headers | `poweredByHeader: false`, frame/nosniff/referrer/permissions policies |

## Deployment hardening checklist (operator tasks)

1. Serve over HTTPS only (Vercel does by default).
2. Restrict database network access / use TLS (`sslmode=require` is in the connection string).
3. For multi-instance deployments, back the rate limiter with Redis — the call-site contract (`server/types.ts`) is already abstracted.
4. Optionally revoke `UPDATE`/`DELETE` on `audit_logs` from the app role at the database level for defense-in-depth beyond application discipline.
