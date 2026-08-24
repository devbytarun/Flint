# Interview preparation

Everything here maps to real code in this repository — file references included so claims can be defended line-by-line.

## Beginner

**What is Flint?**
A feature flag and controlled rollout platform: teams register flags, then toggle/target/ramp them per environment remotely. Consuming apps ask `POST /api/v1/evaluate` whether a feature is enabled for a given user.

**What is a feature flag?**
A runtime switch decoupling *deploy* from *release*. In Flint: a `flags` row (identity) plus per-environment configuration (`flag_environment_configs`: enabled, rollout, rules).

**Why are they useful?**
Kill switches without redeploys, gradual exposure to limit blast radius, testing in production with targeted cohorts, trunk-based development.

**How does a flag get evaluated?**
Ordered pipeline in `lib/evaluation/evaluate.ts`: unknown → disabled → first matching targeting rule → deterministic rollout bucket → default. Pure function, same code for dashboard playground and public API.

## Intermediate

**How does authentication work?** (`server/auth/`)
Opaque 32-byte token in an httpOnly/SameSite=Lax cookie; the DB stores only SHA-256(token) as the session primary key. Sliding 30-day expiry refreshes past-50% sessions. Passwords are Argon2id (OWASP params). Login errors are generic + timing-smoothed to prevent enumeration, and rate-limited per IP and per email.

**How is authorization enforced?**
Membership join on every access (`getProjectContext`), hierarchical roles (`hasAtLeast`), enforced inside every Server Action and service call — never only UI. Cross-project reads return 404, not 403, to avoid existence oracles. API keys embed project+environment scoping used in every query's WHERE clause.

**How does percentage rollout work? Why deterministic?**
`bucket = uint32(SHA-256("env:{envId}:flag:{flagId}:key:{targetingKey}")[0..4]) mod 10000`; enabled iff `bucket < rolloutPercentage` (basis points). Non-deterministic rollouts flip users between requests, break checkout funnels, and make support impossible. Determinism gives stable cohorts, monotonic ramps (raising % only adds buckets), and reproducible support answers. Golden tests lock the algorithm (`tests/evaluation.test.ts`).

**Why is flagId in the hash instead of flagKey?**
Renaming a key would silently reshuffle users. Ids never change.

**Why PostgreSQL?**
Transactional multi-table writes (project bootstrap = project+membership+environments+audit atomically), strong constraints/uniques that back authorization assumptions, JSONB for ordered rule arrays, mature indexing. Feature flags are exactly the "small rows, strong consistency" workload Postgres loves.

**How are API keys handled?**
`flint.<env>.<secret>` shown once; only SHA-256 stored alongside a non-secret display prefix. Lookup by prefix → constant-time hash compare → revocation check. Environment-scoped; last-used tracking write-throttled. (`server/services/api-key-service.ts`)

**How does the public API work?**
Bearer auth → per-key sliding-window rate limit (120/min) → Zod body validation → one query loads all env configs → pure evaluation per flag → JSON envelope with rate headers. Errors use stable codes; CORS is open because auth is header-based, not cookie-based.

## Advanced

**What happens if Flint goes down?**
Consuming apps fail closed by default (unknown = disabled) or opt into fail-open via `onError: "disabled"` in `sdk/flint.ts`. Mitigations beyond the SDK: evaluate-all bootstrap responses can be cached briefly by consumers; the control plane (dashboard) tolerates downtime trivially since flags only change there.

**Where does caching help, and why was it avoided in v1?**
Evaluation configs are tiny and change rarely — an edge-cached snapshot with short TTL would remove the DB read entirely. Rejected for v1 because it introduces staleness semantics (a kill switch that takes seconds/minutes to propagate) and cache invalidation complexity; correctness-first means no-store today. The natural evolution: pub/sub invalidation on config writes.

**Where can race conditions occur?**
(1) Two admins saving the same config concurrently — last-write-wins; audit diffs capture both transitions honestly since before-state is read inside the transaction. (2) Duplicate flag keys — caught by unique constraint + error unwrapping (`FlagKeyTakenError`). (3) Revoking a key while its request is mid-flight — revocation check happens after hash verification within the request; a revoked key may complete one in-flight request, which is acceptable.

**How would you scale evaluation to 100k+ rps?**
The endpoint already does a single indexed query per call. Next steps: cache environment configs in memory keyed by a config version bumped on writes (seconds-fresh), move rate limiting to Redis, shard Neon/read replicas, then edge-evaluate against versioned snapshots. The pure engine needs zero changes for any of these — that was a design goal.

**Main security risks?**
Session theft (mitigated: hashed storage, httpOnly, short-ish sliding expiry); key leakage in client code (documented: server-side evaluation preferred); brute force (rate limits + Argon2); cross-tenant access (membership joins + scoped queries + 404s). Full list with fixes in docs/security.md.

**Multi-region?**
Control plane stays single-primary Postgres (writes are rare); read replicas near regions for evaluation; eventually config snapshots pushed to regional caches with version vectors. Audit writes remain centralized — compliance beats latency there.

**What would you redesign?**
1. Membership invitations + role management UI (model ready, UI missing).
2. Evaluation response should include config version to enable consumer caching safely.
3. Rate limiter interface is clean but the in-memory store resets on deploy.
4. Flag detail page state lives client-side in one big component — fine at current scope, would split with a form library at scale.

## War stories from this build (real bugs)

1. **Token delimiter collision** — base64url secrets contain `_`, so underscore-delimited tokens parsed ambiguously and valid keys authenticated as garbage. Caught by live e2e testing; fixed with dot delimiters (dots ∉ base64url). Lesson: format choices need alphabet analysis, not vibes.
2. **Wrapped driver errors** — drizzle wraps postgres errors, so `error.code === '23505'` checks silently never fired and duplicate emails returned 500s. Integration tests caught it; fix walks the cause chain generically. Lesson: test error paths through the ORM, not just happy paths.
3. **The deletion hack I threw away** — first project-delete implementation tried inserting audit rows against a cascade-deleted FK inside the transaction. The honest design (archive projects) removed the problem class instead of patching it.

## Trade-off one-liners

| Decision | Gave up | Got |
| --- | --- | --- |
| Hand-rolled sessions | OAuth breadth | Auditable ~150-line auth core |
| No eval caching (v1) | Latency | Kill-switch immediacy |
| In-memory rate limits | Multi-instance honesty-free scaling | Zero deps, swappable interface |
| Archive projects | Row-count hygiene | Immutable audit history |
| Basis points everywhere | Familiar percentages | Exact integer thresholds |

## Limitations & v2 backlog

Email verification/password reset · MFA · member invitations · multi-variant flags · per-key scopes · webhooks on flag changes · Terraform/CLI tooling · OpenTelemetry traces on evaluation · Redis-backed limiting · edge evaluation with versioned snapshots.
