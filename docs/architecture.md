# Architecture

## Layering

```text
UI (app/, components/)                    Server Components, client forms
  ↓
Server Actions / Route Handlers           server/actions/, app/api/v1/
  ↓                                       (trust boundary: authn + zod)
Services (business logic)                 server/services/
  ↓
Data access                               db/ (Drizzle schema + client)
  ↓
PostgreSQL (Neon)
```

Rules that keep this clean:

1. **UI never talks to the database.** Pages call services; services own SQL.
2. **Actions are thin.** They authenticate, authorize, validate, delegate, and shape responses — no business rules.
3. **The evaluation engine is pure.** `lib/evaluation/` imports no database, no Next.js, no clock. It can run in the dashboard playground and the public API identically.
4. **Authorization lives in services/actions**, never only in UI visibility.

## Request flows

### Dashboard mutation (e.g. change rollout)

```text
Client form
  → POST (Next Server Action, origin-checked)
    → getCurrentUser()            session cookie → user or null
    → getProjectContext(slug)     membership join → project + role
    → hasAtLeast(role, "admin")   role gate
    → zod validation              typed payload or field errors
    → flagService.updateConfig    transaction: update + audit diff
    → revalidatePath              fresh RSC payload
```

### Public evaluation

```text
POST /api/v1/evaluate
  → extractApiToken()             Bearer or X-Flint-Key
  → authenticateApiKey()          display-prefix lookup + SHA-256 timing-safe compare
  → rateLimiter.hit(keyId)        sliding window, 120/min
  → zod body validation
  → evaluateForEnvironment()      ONE query loads env configs
  → evaluateFlag() per flag       pure engine
  → JSON response (+ rate headers)
```

## Key modules

| Path | Responsibility |
| --- | --- |
| `lib/evaluation/` | Pure evaluation engine + types (unit-tested, golden-locked) |
| `lib/validation/` | Zod schemas shared by actions and API routes |
| `server/auth/` | Password hashing, session lifecycle, current-user resolution |
| `server/authz/roles.ts` | Role hierarchy (`owner ⊃ admin ⊃ member`) |
| `server/services/` | Project, flag, API key, audit business logic |
| `server/rate-limit.ts` | In-memory sliding-window limiter (swappable backend) |
| `db/` | Drizzle schema and pooled postgres.js client |
| `sdk/flint.ts` | Zero-dependency fetch client for consumers |

## Rendering strategy

- **Everything dynamic.** Session cookies make dashboard routes request-time; the public API is inherently dynamic (`Cache-Control: no-store`). No cache-invalidation complexity is bought at the cost of a DB read per view — acceptable for a control plane where correctness beats latency.
- **Server-first forms.** Mutations use Server Actions with `useActionState`; progressive enhancement comes free.

## Failure behavior

- Evaluation degrades gracefully: malformed rules are skipped, invalid rollouts clamped, unknown flags return `FLAG_NOT_FOUND` (disabled).
- The public API fails closed but never leaks internals (generic `INTERNAL_ERROR`).
- The SDK offers opt-in fail-open (`onError: "disabled"`) because consuming apps should choose their own blast radius.
