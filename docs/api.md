# Public API (v1)

Base URL: your Flint host. All v1 endpoints are prefixed `/api/v1/`.

## Authentication

Environment-scoped API keys, presented either way:

```text
Authorization: Bearer flint.production.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
X-Flint-Key:    flint.production.xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Keys are created in the dashboard (Project → API keys) and shown exactly once. They evaluate flags; they cannot modify configuration.

## Errors

Every non-200 response uses one envelope with a stable machine code:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "…" } }
```

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Malformed JSON body or invalid fields |
| 401 | `UNAUTHORIZED` | Missing/unknown/revoked/tampered key |
| 429 | `RATE_LIMITED` | Sliding-window limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected failure (no internals leaked) |

Unknown and revoked keys are intentionally indistinguishable.

## Rate limits

120 requests / minute / key (sliding window). Responses carry `X-RateLimit-Limit` and `X-RateLimit-Remaining`; blocked requests add `Retry-After` (seconds).

## CORS

`Access-Control-Allow-Origin: *` with preflight support — evaluation is bearer-authenticated infrastructure traffic, not cookie-based browser auth, so wide CORS is safe here.

---

## POST /api/v1/evaluate

Evaluate flags for a context.

**Request**

```json
{
  "context": {
    "targetingKey": "user_123",
    "attributes": { "plan": "pro", "country": "IN" }
  },
  "flagKeys": ["new_checkout"]
}
```

- `flagKeys` omitted → every flag in the environment (bootstrap mode).
- `targetingKey` drives deterministic bucketing; without it, percentage rollouts are skipped and defaults apply (documented in [feature-flags](feature-flags.md)).

**Response**

```json
{
  "evaluations": {
    "new_checkout": { "enabled": true, "reason": "ROLLOUT_INCLUDED" }
  }
}
```

Reasons: `FLAG_NOT_FOUND`, `FLAG_DISABLED`, `TARGETING_RULE_MATCH`, `ROLLOUT_INCLUDED`, `ROLLOUT_EXCLUDED`, `DEFAULT`. Explicitly requested keys that do not exist still appear (disabled) so clients can destructure blindly.

Caching: `Cache-Control: no-store` — control-plane freshness wins over latency by design.

## GET /api/v1/flags

Flag metadata for the authenticated environment:

```json
{
  "environment": "production",
  "flags": [
    { "key": "new_checkout", "name": "New checkout", "description": null }
  ]
}
```

## TypeScript client

`sdk/flint.ts` — zero dependencies:

```ts
import { FlintClient } from "./flint";

const flint = new FlintClient({
  baseUrl: "https://flint.example.com",
  apiKey: process.env.FLINT_API_KEY!,
  onError: "disabled", // fail-open during outages
});

const { new_checkout } = await flint.evaluate(["new_checkout"], {
  targetingKey: user.id,
  attributes: { plan: user.plan },
});

if (new_checkout.enabled) renderNewCheckout();
```

## Versioning

Path-versioned (`/v1`). Breaking changes would ship as `/v2` with `/v1` kept alive for a deprecation window.
