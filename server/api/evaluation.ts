import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { flagEnvironmentConfigs, flags } from "@/db/schema";

import { evaluateFlag } from "@/lib/evaluation";
import type { FlagConfig as EvaluableConfig } from "@/lib/evaluation";
import type { AuthenticatedApiKey } from "@/server/services/api-key-service";
import type { EvaluationContext } from "@/lib/evaluation";

/**
 * Bulk evaluation for the public API: one query loads every configuration
 * in the authenticated environment; evaluation itself is pure CPU.
 */
export async function evaluateForEnvironment(
  auth: AuthenticatedApiKey,
  context: EvaluationContext,
  requestedKeys: string[] | null,
): Promise<{
  evaluations: Record<string, { enabled: boolean; reason: string }>;
}> {
  const rows = await db
    .select({
      flagId: flags.id,
      flagKey: flags.key,
      enabled: flagEnvironmentConfigs.enabled,
      rolloutPercentage: flagEnvironmentConfigs.rolloutPercentage,
      rules: flagEnvironmentConfigs.rules,
    })
    .from(flagEnvironmentConfigs)
    .innerJoin(flags, eq(flags.id, flagEnvironmentConfigs.flagId))
    .where(
      and(
        eq(flagEnvironmentConfigs.environmentId, auth.environmentId),
        eq(flags.projectId, auth.projectId),
      ),
    )
    .orderBy(asc(flags.key));

  const keySet = requestedKeys ? new Set(requestedKeys) : null;

  const evaluations: Record<string, { enabled: boolean; reason: string }> = {};
  for (const row of rows) {
    if (keySet && !keySet.has(row.flagKey)) continue;

    const config: EvaluableConfig = {
      environmentId: auth.environmentId,
      flagId: row.flagId,
      flagKey: row.flagKey,
      enabled: row.enabled,
      rolloutPercentage: row.rolloutPercentage,
      rules: (row.rules as EvaluableConfig["rules"]) ?? [],
    };

    const result = evaluateFlag(config, context);
    evaluations[row.flagKey] = { enabled: result.enabled, reason: result.reason };
  }

  // Explicitly requested but unknown keys still get an answer — disabled.
  if (keySet) {
    for (const key of requestedKeys!) {
      evaluations[key] ??= { enabled: false, reason: "FLAG_NOT_FOUND" };
    }
  }

  return { evaluations };
}

/** Metadata list for bootstrap flows. */
export async function listEnvironmentFlags(
  auth: AuthenticatedApiKey,
): Promise<Array<{ key: string; name: string; description: string | null }>> {
  const rows = await db
    .select({
      key: flags.key,
      name: flags.name,
      description: flags.description,
    })
    .from(flagEnvironmentConfigs)
    .innerJoin(flags, eq(flags.id, flagEnvironmentConfigs.flagId))
    .where(
      and(
        eq(flagEnvironmentConfigs.environmentId, auth.environmentId),
        eq(flags.projectId, auth.projectId),
      ),
    )
    .orderBy(asc(flags.key));

  return rows;
}
