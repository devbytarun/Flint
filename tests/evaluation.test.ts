import { describe, expect, it } from "vitest";

import { computeBucket, evaluateFlag } from "@/lib/evaluation";
import type { FlagConfig, TargetingRule } from "@/lib/evaluation";

/**
 * Golden values produced by the SHA-256 bucketing algorithm. If these tests
 * fail after an intentional algorithm change, regenerate and update them
 * deliberately — they exist to make silent reshuffles of user assignments
 * impossible.
 */
const GOLDEN_BUCKETS = {
  env1_flag1_user123: 141,
  env1_flag1_user456: 8628,
  env2_flag1_user123: 8633,
  env1_flag2_user123: 1704,
} as const;

function makeConfig(overrides: Partial<FlagConfig> = {}): FlagConfig {
  return {
    environmentId: "env-1",
    flagId: "flag-1",
    flagKey: "new_checkout",
    enabled: true,
    rolloutPercentage: 10000,
    rules: [],
    ...overrides,
  };
}

function rule(overrides: Partial<TargetingRule> = {}): TargetingRule {
  return {
    attribute: "plan",
    operator: "equals",
    values: ["pro"],
    serve: true,
    ...overrides,
  };
}

describe("evaluateFlag — basic states", () => {
  it("returns FLAG_NOT_FOUND with enabled=false for unknown flags", () => {
    const result = evaluateFlag(undefined, { targetingKey: "u1" });
    expect(result).toEqual({ enabled: false, reason: "FLAG_NOT_FOUND" });
  });

  it("returns FLAG_DISABLED when the flag master switch is off", () => {
    const result = evaluateFlag(makeConfig({ enabled: false }), { targetingKey: "u1" });
    expect(result).toEqual({ enabled: false, reason: "FLAG_DISABLED" });
  });

  it("disabled flag wins over targeting rules that would match", () => {
    const config = makeConfig({ enabled: false, rules: [rule()] });
    const result = evaluateFlag(config, { targetingKey: "u1", attributes: { plan: "pro" } });
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe("FLAG_DISABLED");
  });

  it("enabled flag with full rollout is on by default", () => {
    const result = evaluateFlag(makeConfig(), { targetingKey: "u1" });
    expect(result.enabled).toBe(true);
    expect(result.reason).toBe("ROLLOUT_INCLUDED");
  });

  it("handles null config like an unknown flag", () => {
    const result = evaluateFlag(null, {});
    expect(result.reason).toBe("FLAG_NOT_FOUND");
  });
});

describe("evaluateFlag — percentage rollout", () => {
  it("is deterministic for the same key", () => {
    const config = makeConfig({ rolloutPercentage: 5000 });
    const a = evaluateFlag(config, { targetingKey: "user_abc" });
    const b = evaluateFlag(config, { targetingKey: "user_abc" });
    expect(a.bucket).toBe(b.bucket);
    expect(a.enabled).toBe(b.enabled);
  });

  it("matches golden buckets (algorithm lock)", () => {
    expect(computeBucket("env-1", "flag-1", "user_123")).toBe(GOLDEN_BUCKETS.env1_flag1_user123);
    expect(computeBucket("env-1", "flag-1", "user_456")).toBe(GOLDEN_BUCKETS.env1_flag1_user456);
    expect(computeBucket("env-2", "flag-1", "user_123")).toBe(GOLDEN_BUCKETS.env2_flag1_user123);
    expect(computeBucket("env-1", "flag-2", "user_123")).toBe(GOLDEN_BUCKETS.env1_flag2_user123);
  });

  it("includes users below the threshold and excludes above", () => {
    // user_123 → bucket 141 in env-1/flag-1
    const at5 = evaluateFlag(makeConfig({ rolloutPercentage: 500 }), {
      targetingKey: "user_123",
    });
    expect(at5.enabled).toBe(true);

    // user_456 → bucket 8628
    const at50 = evaluateFlag(makeConfig({ rolloutPercentage: 5000 }), {
      targetingKey: "user_456",
    });
    expect(at50.enabled).toBe(false);

    const at90 = evaluateFlag(makeConfig({ rolloutPercentage: 9000 }), {
      targetingKey: "user_456",
    });
    expect(at90.enabled).toBe(true);
  });

  it("0% rollout disables the flag without a targeting key match", () => {
    const result = evaluateFlag(makeConfig({ rolloutPercentage: 0 }), {
      targetingKey: "anyone",
    });
    expect(result).toEqual({
      enabled: false,
      reason: "ROLLOUT_EXCLUDED",
      bucket: computeBucket("env-1", "flag-1", "anyone"),
    });
  });

  it("100% rollout includes every keyed user", () => {
    for (const key of ["a", "b", "c", "user_999"]) {
      expect(evaluateFlag(makeConfig(), { targetingKey: key }).enabled).toBe(true);
    }
  });

  it("produces an approximately correct distribution", () => {
    const total = 20000;
    let included = 0;
    for (let i = 0; i < total; i++) {
      const result = evaluateFlag(makeConfig({ rolloutPercentage: 1000 }), {
        targetingKey: `user-${i}`,
      });
      if (result.enabled) included++;
    }
    // Expect ~10%; tolerate ±1.5 percentage points.
    expect(included).toBeGreaterThan(total * 0.085);
    expect(included).toBeLessThan(total * 0.115);
  });

  it("skips bucketing entirely when no targeting key is present", () => {
    const result = evaluateFlag(makeConfig({ rolloutPercentage: 10 }), {});
    expect(result).toEqual({ enabled: true, reason: "DEFAULT" });
    expect(result.bucket).toBeUndefined();
  });
});

describe("evaluateFlag — environment isolation", () => {
  it("buckets independently per environment", () => {
    const prod = evaluateFlag(makeConfig({ rolloutPercentage: 3000 }), {
      targetingKey: "user_123",
    });
    const staging = evaluateFlag(makeConfig({ environmentId: "env-2", rolloutPercentage: 3000 }), {
      targetingKey: "user_123",
    });
    // Same user can be treated differently across environments because the
    // environment id participates in the hash.
    expect(prod.bucket).not.toBe(staging.bucket);
  });

  it("renaming a flag key does not change assignments (id-based salt)", () => {
    const before = evaluateFlag(makeConfig({ flagKey: "old_name", rolloutPercentage: 5000 }), {
      targetingKey: "user_456",
    });
    const after = evaluateFlag(makeConfig({ flagKey: "new_name", rolloutPercentage: 5000 }), {
      targetingKey: "user_456",
    });
    expect(before).toEqual(after);
  });
});

describe("evaluateFlag — targeting rules", () => {
  it("first matching rule wins over later conflicting rules", () => {
    const config = makeConfig({
      rules: [
        rule({ attribute: "plan", operator: "equals", values: ["pro"], serve: false }),
        rule({ attribute: "country", operator: "equals", values: ["IN"], serve: true }),
      ],
    });
    const proUserInIndia = evaluateFlag(config, {
      targetingKey: "u1",
      attributes: { plan: "pro", country: "IN" },
    });
    expect(proUserInIndia).toEqual({ enabled: false, reason: "TARGETING_RULE_MATCH" });
  });

  it("a matching rule overrides rollout configuration", () => {
    const config = makeConfig({ rolloutPercentage: 0, rules: [rule()] });
    const result = evaluateFlag(config, { targetingKey: "u1", attributes: { plan: "pro" } });
    expect(result.enabled).toBe(true);
  });

  it("supports serving false from a rule (kill switch per segment)", () => {
    const config = makeConfig({
      rules: [rule({ attribute: "internal", operator: "exists", serve: false })],
    });
    const result = evaluateFlag(config, { targetingKey: "staffer", attributes: { internal: "1" } });
    expect(result.enabled).toBe(false);
  });

  it("falls through to rollout when no rule matches", () => {
    const config = makeConfig({
      rolloutPercentage: 0,
      rules: [rule({ attribute: "plan", operator: "equals", values: ["enterprise"] })],
    });
    const result = evaluateFlag(config, { targetingKey: "u1", attributes: { plan: "pro" } });
    expect(result.reason).toBe("ROLLOUT_EXCLUDED");
  });
});

describe("evaluateFlag — targeting operators", () => {
  const cases: Array<[TargetingRule, Record<string, string>, boolean]> = [
    [rule({ operator: "equals", attribute: "country", values: ["IN"] }), { country: "IN" }, true],
    [rule({ operator: "equals", attribute: "country", values: ["IN"] }), { country: "US" }, false],
    [rule({ operator: "equals", attribute: "country", values: ["IN"] }), {}, false],
    [
      rule({ operator: "notEquals", attribute: "country", values: ["IN"] }),
      { country: "US" },
      true,
    ],
    // Negations do not match when the attribute is missing:
    [rule({ operator: "notEquals", attribute: "country", values: ["IN"] }), {}, false],
    [rule({ operator: "in", values: ["pro", "enterprise"] }), { plan: "enterprise" }, true],
    [rule({ operator: "in", values: ["pro", "enterprise"] }), { plan: "free" }, false],
    [rule({ operator: "notIn", values: ["free"] }), { plan: "pro" }, true],
    [rule({ operator: "notIn", values: ["free"] }), {}, false],
    [rule({ operator: "exists", attribute: "beta" }), { beta: "" }, true],
    [rule({ operator: "exists", attribute: "beta" }), {}, false],
    [rule({ operator: "notExists", attribute: "beta" }), {}, true],
    [rule({ operator: "notExists", attribute: "beta" }), { beta: "1" }, false],
  ];

  for (const [targetRule, attrs, expected] of cases) {
    const label = `${targetRule.attribute} ${targetRule.operator} [${targetRule.values.join("|")}] with ${JSON.stringify(attrs)} → ${expected}`;
    it(label, () => {
      const config = makeConfig({ rolloutPercentage: 0, rules: [targetRule] });
      const result = evaluateFlag(config, { targetingKey: "u1", attributes: attrs });
      expect(result.enabled).toBe(expected);
      if (expected) expect(result.reason).toBe("TARGETING_RULE_MATCH");
    });
  }

  it("comparisons are case-sensitive", () => {
    const config = makeConfig({ rolloutPercentage: 0, rules: [rule({ values: ["PRO"] })] });
    const result = evaluateFlag(config, { targetingKey: "u1", attributes: { plan: "pro" } });
    expect(result.reason).toBe("ROLLOUT_EXCLUDED");
  });
});

describe("evaluateFlag — invalid configurations", () => {
  it("ignores malformed rules instead of throwing", () => {
    const config = makeConfig({
      rules: [
        null,
        "garbage",
        { nope: true },
        rule({ attribute: "", values: ["x"] }),
      ] as unknown as FlagConfig["rules"],
      rolloutPercentage: 10000,
    });
    const result = evaluateFlag(config, { targetingKey: "u1", attributes: { plan: "pro" } });
    expect(result.enabled).toBe(true);
  });

  it("clamps out-of-range rollout percentages", () => {
    const negative = evaluateFlag(makeConfig({ rolloutPercentage: -500 }), { targetingKey: "u1" });
    expect(negative.enabled).toBe(false);

    const overflowing = evaluateFlag(makeConfig({ rolloutPercentage: 20000 }), {
      targetingKey: "u1",
    });
    expect(overflowing.enabled).toBe(true);
  });

  it("treats non-finite rollout as fully excluded", () => {
    const result = evaluateFlag(makeConfig({ rolloutPercentage: Number.NaN }), {
      targetingKey: "u1",
    });
    expect(result.enabled).toBe(false);
  });
});
