# Testing

Run everything with `npm test` (Vitest, Node environment). 53 tests across 5 suites.

## Philosophy

Coverage effort concentrates where correctness matters most: the evaluation engine and authorization boundaries. No arbitrary percentage targets; UI flows are verified by build-time type safety plus live smoke tests rather than brittle snapshot suites.

## Suites

### tests/evaluation.test.ts — 35 unit tests (pure, no DB)

- Basic states: unknown flag, disabled master switch, full rollout default.
- **Determinism**: same key → same bucket/result; **golden hash values lock the algorithm** — changing the salt format fails loudly instead of silently reshuffling users.
- Rollout boundaries: threshold inclusion/exclusion with known buckets, 0%/100%, clamping of invalid values.
- Distribution sanity: 20,000 synthetic keys at 10% must land within ±1.5pp.
- Environment isolation: same user, different environment id → different bucket.
- Rename safety: `flagKey` changes never affect assignments.
- Targeting operators: table-driven matrix including negation-with-missing-attribute semantics and case sensitivity.
- Rule precedence: first match wins; rules override rollout.
- Invalid configs: malformed rules ignored safely.

### tests/project-service.test.ts — integration (real database)

Project creation transactionally provisions owner membership + three environments + an audit event. Authorization boundaries: non-members get `null`; archived projects vanish from lists and context. Role hierarchy ordering.

### tests/flag-service.test.ts — integration

Config fan-out per environment on creation; environment isolation on updates (production change leaves development untouched); structured audit diffs (`before.enabled=false → after.rolloutPercentage=2500`); deletion tombstones keep audit history while configs cascade away; project-scoped lookups reject foreign project ids; duplicate keys raise `FlagKeyTakenError`.

### tests/api-key-service.test.ts — integration

Round-trip create → authenticate with raw token; uniform rejection of null/garbage/tampered tokens; revocation idempotence + immediate invalidation + audit event; listings expose display prefixes but never hashes.

### tests/rate-limit.test.ts — unit

Window behavior, per-key independence, remaining counts, recovery after expiry.

## Integration test hygiene

Suites run against the development database via `tests/setup-env.ts` (loads `.env.local`). Fixtures use random suffixes and are removed in `afterAll`, so runs are repeatable and safe against shared data. Timeout is raised to 20s to absorb remote-database latency.

## Manual verification performed

- Production build compiles all routes (`next build`).
- Live HTTP checks: unauthenticated `/projects` → 307 → login; member sees projects/environments/audit; non-member gets 404.
- Public API end-to-end: valid token → correct evaluation JSON; missing/tampered token → 401 envelope.

## Gaps (honest list)

- No browser E2E suite yet; Playwright would cover register→create-project→create-flag→toggle.
- Public API lacks its own route-level integration tests (covered indirectly through service tests + manual e2e).
- Load testing not performed; rate limiter behavior under concurrency is single-process only.
