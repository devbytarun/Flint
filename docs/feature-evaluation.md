# Feature evaluation

The engine lives in `lib/evaluation/` and is a **pure function**:

```ts
evaluateFlag(config: FlagConfig | null, context: EvaluationContext): EvaluationResult
```

No database, no clock, no randomness — identical inputs always produce identical outputs. Both the dashboard playground and the public API call the exact same code.

## Inputs

```ts
interface FlagConfig {           // one row per (flag, environment)
  environmentId: string;
  flagId: string;                // stable identity used for bucketing
  flagKey: string;               // informational at eval time
  enabled: boolean;
  rolloutPercentage: number;     // basis points 0–10000
  rules: TargetingRule[];        // ordered
}

interface EvaluationContext {
  targetingKey?: string;         // "who" — user id / session id / anonymous id
  attributes?: Record<string, string>;   // e.g. plan, country
}
```

## Algorithm (in order)

1. **Unknown flag** → `{ enabled: false, reason: FLAG_NOT_FOUND }`
2. **Master switch off** → disabled (`FLAG_DISABLED`). Rules and rollout are irrelevant.
3. **Targeting rules** → first matching rule serves its `serve` value (`TARGETING_RULE_MATCH`) and overrides everything below.
4. **Percentage rollout** → deterministic bucket decides (`ROLLOUT_INCLUDED` / `ROLLOUT_EXCLUDED`). Requires a targeting key.
5. **Default** → enabled (`DEFAULT`).

## Targeting rules

```ts
{ attribute: "plan", operator: "in", values: ["pro", "enterprise"], serve: true }
```

Operators: `equals`, `notEquals`, `in`, `notIn`, `exists`, `notExists`. Comparisons are case-sensitive strings.

Semantic decisions worth knowing:

- **Negations require presence.** `notEquals`/`notIn` only match when the attribute exists — otherwise every user who simply omitted `plan` would match `plan notEquals pro`.
- **First match wins**, including rules that serve `false` (per-segment kill switches).
- Rules are validated by Zod on write; the evaluator additionally ignores malformed entries at read time so bad data degrades instead of throwing.

## Edge cases

| Situation | Result |
| --- | --- |
| No targeting key | Rollout skipped → default (step 5) with reason `DEFAULT` |
| Rollout out of range (`-500`, `20000`, NaN) | Clamped to [0, 10000] defensively |
| Unknown flag requested via API | Included in response as disabled + `FLAG_NOT_FOUND` |

## Testing

35 unit tests cover states, operators (table-driven), rule precedence, invalid configs, environment isolation, and distribution sanity (20k keys ≈ expected share ±1.5pp). Golden hash values lock the bucketing algorithm — any accidental change to the salt format fails CI loudly. See `tests/evaluation.test.ts`.
