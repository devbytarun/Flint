# Deterministic rollout

## The problem

A naive implementation rolls a die per request:

```ts
enabled: Math.random() < 0.1   // WRONG
```

Users flip on/off between requests; checkout flows appear mid-session; support cannot reproduce anything. A rollout percentage is only meaningful if **the same user consistently gets the same answer** while the configuration is unchanged.

## Flint's algorithm

```text
digest  = SHA-256("env:{environmentId}:flag:{flagId}:key:{targetingKey}")
bucket  = first 4 bytes of digest as uint32, mod 10000      // 0–9999
enabled = bucket < rolloutPercentage                         // basis points
```

Implemented in `lib/evaluation/bucketing.ts` (~25 lines).

### Why each ingredient matters

| Ingredient | Consequence if omitted |
| --- | --- |
| `targetingKey` | No stable identity → users would reshuffle |
| `flagId` (not `flagKey`) | Renaming a flag would reshuffle its users |
| `environmentId` | Staging and production would have identical cohorts — you couldn't test a rollout in staging independently |
| SHA-256 | Uniform distribution + cheap + universally available |
| 10,000 buckets | 0.01% granularity with integer math (basis points end-to-end) |

### Properties

- **Deterministic** across processes, restarts, regions, runtimes.
- **Independent per flag/environment**: inclusion in one flag says nothing about another; independent gradual rollouts compose.
- **Monotonic ramp**: increasing the percentage only ever *adds* buckets (users never fall out when you raise a rollout). Lowering removes the highest buckets first.
- **No secret salt**: bucketing isn't a security mechanism; there's nothing to reverse-engineer beyond what the dashboard already shows.

Modulo bias: 2³² mod 10000 = 296, so buckets 0–295 receive ~7×10⁻⁸ relative excess probability. Measured distribution over 20k synthetic keys lands within ±1.5pp of target (`tests/evaluation.test.ts`).

## Requests without a targeting key

Rollout requires an identity to be deterministic about. Keyless requests skip step 4 entirely and receive the default (`DEFAULT`), which keeps anonymous health checks and server-side calls predictable rather than coin-flippy. Consumers should always pass something stable — user id, session id, or a random-but-persisted anonymous id.

## Operational semantics

- **Changing rollout %**: instant, no migration; assignment changes are exactly "buckets added/removed".
- **Renaming a flag key**: zero effect on assignments (id-based salt).
- **Deleting + recreating a flag**: new flag id → full reshuffle for that flag (unavoidable; documented).
- **Multi-variant flags**: out of scope v1 by design — boolean flags cover the rollout use case without complicating the audit diff format.

## Related reading

[feature-evaluation](feature-evaluation.md) · golden-value tests in `tests/evaluation.test.ts`
