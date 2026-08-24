# Technical decisions

Real trade-offs made while building Flint, with reasoning. These are the interesting interview conversations.

## Chosen

### Drizzle ORM over Prisma
Type-safe SQL that reads like SQL, no engine binaries or codegen step, first-class Neon/serverless story, and migrations are reviewable SQL files. Prisma's schema DSL is lovely but its runtime is heavier and more magical. For a codebase meant to be *studied*, explicitness wins.

### Hand-rolled sessions over Auth.js/NextAuth
Auth.js optimizes for OAuth providers and hides the session mechanics. Flint needs exactly one flow (password + cookie sessions) done transparently: ~150 lines using battle-tested primitives (`@node-rs/argon2`, `node:crypto`, httpOnly cookies). Nothing invented cryptographically; everything readable. The alternative hid more than it taught.

### Opaque session tokens over JWTs
Server-side sessions give instant revocation, sliding expiry, and zero token-revocation headaches. JWT statelessness buys nothing here — every dashboard request already touches Postgres.

### Projects archive; flags hard-delete
Deleting a project cascades its entire audit trail away — unacceptable for an audit platform, so projects get `archived_at`. Flags delete for real because their audit rows snapshot labels and never foreign-key to flags: history survives as tombstones.

### Rollout in basis points (integers)
Percentages as floats invite drift (`0.1 + 0.2 ≠ 0.3`). Storing 0–10000 makes thresholds exact integer comparisons end-to-end: UI ×100, DB int, bucket comparison `<`.

### Environment id inside the rollout salt
Same user → different cohorts in staging vs production. This lets teams test a 50% staging rollout before mirroring it in production without cohort contamination.

### In-memory rate limiting (with an escape hatch)
A single-process deployment doesn't justify Redis. `RateLimitStore` is a two-method interface (`server/types.ts`) so multi-instance deployments swap in a Redis backend at one call site. The limitation is documented rather than hidden.

### Server Actions over REST for the dashboard
Progressive-enhancement forms, single-roundtrip revalidation, origin-checked POSTs. The *developer* API stays deliberately boring versioned REST because that's what SDKs integrate with.

### Turbopack/Next 16 defaults
The project was scaffolded on Next 16 (async request APIs, `proxy` convention, typegen route helpers). Following the framework's current direction keeps the codebase future-proof even where it differs from older training material.

## Rejected

- **Multi-variant / JSON payloads per flag** — complicates rules, audits, and UI for power most teams don't need yet. Boolean + targeting covers controlled rollout.
- **Edge-runtime evaluation with cached configs** — attractive latency win, but it forces stale-config semantics and a cache invalidation story into v1. Documented as the scaling path instead.
- **GraphQL** — one consumer shape today; REST + typed client is smaller than any GraphQL surface.
- **Membership invitations in v1** — model and checks support them; UI/time budget went to evaluation correctness and auditing instead.

## Mistakes made along the way (and caught)

- Token delimiter collision: base64url secrets contain `_`, breaking underscore-delimited parsing. Found by live e2e testing, fixed with dot delimiters.
- Unwrapping driver errors: drizzle wraps postgres errors several layers deep; top-level `code` checks silently never fired. Found by integration tests.
- First draft of project deletion contained a broken insert hack to "preserve" audit rows — thrown away in favor of archiving, which is the honest fix.
