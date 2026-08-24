import { z } from "zod";

import { TARGETING_OPERATORS } from "@/lib/evaluation";

/** Machine identifier: lowercase letters, digits, underscores. */
export const flagKeySchema = z
  .string()
  .trim()
  .min(1, "Key is required")
  .max(80, "Key must be at most 80 characters")
  .regex(/^[a-z0-9_]+$/, "Use lowercase letters, digits, and underscores");

export const createFlagSchema = z.object({
  key: flagKeySchema,
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(120, "Name must be at most 120 characters"),
  description: z.string().trim().max(500, "Description must be at most 500 characters").optional(),
});

export type CreateFlagValues = z.infer<typeof createFlagSchema>;

/**
 * A targeting rule as accepted from the dashboard/API. Values semantics
 * depend on the operator (see lib/evaluation/types.ts).
 */
export const targetingRuleSchema = z
  .object({
    attribute: z.string().trim().min(1, "Attribute is required").max(64),
    operator: z.enum(TARGETING_OPERATORS),
    values: z.array(z.string().max(200)).max(50, "At most 50 values per rule"),
    serve: z.boolean(),
  })
  .refine(
    (rule) => {
      if (rule.operator === "exists" || rule.operator === "notExists") return true;
      return rule.values.length >= 1 && rule.values.every((v) => v.length > 0);
    },
    { message: "Provide at least one value for this operator" },
  );

export const MAX_RULES_PER_FLAG = 20;

export const flagConfigSchema = z.object({
  enabled: z.boolean(),
  /** Basis points: 0–10000. The UI presents percentages (×100). */
  rolloutPercentage: z.number().int().min(0).max(10000),
  rules: z.array(targetingRuleSchema).max(MAX_RULES_PER_FLAG),
});

export type FlagConfigValues = z.infer<typeof flagConfigSchema>;

export const updateFlagSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
});
