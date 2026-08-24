import { computeBucket } from "./bucketing";
import type {
  EvaluationContext,
  EvaluationResult,
  FlagConfig,
  TargetingRule,
} from "./types";

/** Hard bounds for rollout percentage in basis points; used to clamp bad data defensively. */
const MIN_ROLLOUT = 0;
const MAX_ROLLOUT = 10000;

/**
 * Evaluate whether a flag is enabled for the given context.
 *
 * This function is pure: same inputs always produce the same output, no
 * clock, no randomness, no I/O. All database/API concerns live above it.
 *
 * Algorithm (in order):
 *  1. Unknown flag            → disabled (`FLAG_NOT_FOUND`)
 *  2. Flag disabled           → disabled (`FLAG_DISABLED`) — master switch wins
 *  3. Targeting rules         → first matching rule serves its value
 *                                (`TARGETING_RULE_MATCH`)
 *  4. Percentage rollout      → deterministic bucket decides
 *                                (`ROLLOUT_INCLUDED` / `ROLLOUT_EXCLUDED`);
 *                                skipped when no targeting key is present
 *  5. Default                 → enabled (`DEFAULT`)
 *
 * Failure behavior: malformed individual rules are ignored rather than
 * throwing — evaluation degrades gracefully toward the default flow instead
 * of breaking consuming applications.
 */
export function evaluateFlag(
  config: FlagConfig | undefined | null,
  context: EvaluationContext,
): EvaluationResult {
  if (!config) {
    return { enabled: false, reason: "FLAG_NOT_FOUND" };
  }

  if (!config.enabled) {
    return { enabled: false, reason: "FLAG_DISABLED" };
  }

  const attributes = context.attributes ?? {};

  for (const rule of config.rules) {
    if (isValidRule(rule) && ruleMatches(rule, attributes)) {
      return { enabled: rule.serve, reason: "TARGETING_RULE_MATCH" };
    }
  }

  // Percentage rollout requires a stable identity to bucket against.
  // Without one we cannot make a deterministic promise, so we skip to default.
  if (!context.targetingKey) {
    return { enabled: true, reason: "DEFAULT" };
  }

  const rollout = clampRollout(config.rolloutPercentage);
  const bucket = computeBucket(config.environmentId, config.flagId, context.targetingKey);

  if (bucket < rollout) {
    return { enabled: true, reason: "ROLLOUT_INCLUDED", bucket };
  }
  return { enabled: false, reason: "ROLLOUT_EXCLUDED", bucket };
}

/* -------------------------------------------------------------------------- */
/* Targeting rule matching                                                     */
/* -------------------------------------------------------------------------- */

function isValidRule(rule: unknown): rule is TargetingRule {
  if (typeof rule !== "object" || rule === null) return false;
  const r = rule as Record<string, unknown>;
  return typeof r.attribute === "string" && r.attribute.length > 0 && Array.isArray(r.values);
}

function ruleMatches(rule: TargetingRule, attributes: Record<string, string>): boolean {
  const value = attributes[rule.attribute];
  const present = value !== undefined;

  switch (rule.operator) {
    case "exists":
      return present;
    case "notExists":
      return !present;
    case "equals":
      return present && value === firstValue(rule);
    case "notEquals":
      // Negating operators only match when the attribute exists; otherwise a
      // user who simply omitted "plan=pro" would match every notEquals rule.
      return present && value !== firstValue(rule);
    case "in":
      return present && rule.values.includes(value);
    case "notIn":
      return present && !rule.values.includes(value);
    default:
      return false;
  }
}

function firstValue(rule: TargetingRule): string {
  return rule.values[0] ?? "";
}

function clampRollout(percentage: number): number {
  if (!Number.isFinite(percentage)) return MIN_ROLLOUT;
  return Math.min(MAX_ROLLOUT, Math.max(MIN_ROLLOUT, Math.trunc(percentage)));
}
