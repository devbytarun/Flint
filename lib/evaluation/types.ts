/**
 * Domain types for feature evaluation.
 *
 * These types describe the *runtime shape* of configuration as consumed by
 * the evaluator. They intentionally mirror `db/schema.ts` tables
 * (`flagEnvironmentConfigs`) but are decoupled from the database so the
 * evaluator stays a pure function usable anywhere (dashboard playground,
 * public API, future edge runtime).
 */

/** Operators supported by targeting rules. All comparisons are case-sensitive string comparisons. */
export const TARGETING_OPERATORS = [
  "equals",
  "notEquals",
  "in",
  "notIn",
  "exists",
  "notExists",
] as const;

export type TargetingOperator = (typeof TARGETING_OPERATORS)[number];

/**
 * A single ordered targeting rule.
 *
 * Example: `{ attribute: "plan", operator: "in", values: ["pro", "enterprise"], serve: true }`
 * enables the flag for pro and enterprise users regardless of rollout.
 */
export interface TargetingRule {
  /** Context attribute to test, e.g. "country" or "plan". */
  attribute: string;
  operator: TargetingOperator;
  /**
   * Operands. Semantics per operator:
   *  - equals/notEquals: values[0] is compared against the attribute
   *  - in/notIn: membership test against the full list
   *  - exists/notExists: values are ignored
   */
  values: string[];
  /** Value served when the rule matches. */
  serve: boolean;
}

/**
 * Per-environment configuration for a single flag. One instance is what an
 * environment's API evaluates; environment isolation is structural because
 * an evaluation never sees configs from other environments.
 */
export interface FlagConfig {
  /** Environment owning this configuration. Part of the bucketing salt. */
  environmentId: string;
  /**
   * Stable flag identifier. Bucketing uses this instead of `flagKey`, so
   * renaming a flag never reshuffles which users are in which bucket.
   */
  flagId: string;
  /** Machine name of the flag, e.g. "new_checkout". Informational at eval time. */
  flagKey: string;
  /** Master switch. When false, the flag evaluates to disabled immediately. */
  enabled: boolean;
  /**
   * Percentage rollout expressed in basis points (0–10000). Applied after
   * targeting rules; 10000 means "all remaining users".
   */
  rolloutPercentage: number;
  /** Ordered rules; the first match wins. */
  rules: TargetingRule[];
}

/**
 * Request context supplied by the consuming application.
 *
 * `targetingKey` identifies *who* is being evaluated (user id, session id,
 * anonymous id…). It drives deterministic bucket assignment. Requests
 * without one can still match targeting rules but never enter a percentage
 * rollout — they receive the configured default.
 */
export interface EvaluationContext {
  targetingKey?: string;
  attributes?: Record<string, string>;
}

/** Why an evaluation produced its result. Useful for debugging and audit trails. */
export type EvaluationReason =
  | "FLAG_NOT_FOUND"
  | "FLAG_DISABLED"
  | "TARGETING_RULE_MATCH"
  | "ROLLOUT_INCLUDED"
  | "ROLLOUT_EXCLUDED"
  | "DEFAULT";

export interface EvaluationResult {
  enabled: boolean;
  reason: EvaluationReason;
  /**
   * Deterministic bucket (0–9999) assigned to the targeting key for this
   * flag/environment. Present whenever bucketing was performed.
   */
  bucket?: number;
}
