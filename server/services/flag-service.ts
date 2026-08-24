import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  auditLogs,
  environments,
  flagEnvironmentConfigs,
  flags,
  type Flag,
  type FlagEnvironmentConfig,
} from "@/db/schema";

import type { FlagConfigValues } from "@/lib/validation/flag";
import { hasPostgresCode } from "@/server/lib/db-errors";

/**
 * Feature flag business logic.
 *
 * A flag's per-environment configuration is the auditable unit: enabling,
 * disabling, rollout changes, and rule edits all produce `flag_config.updated`
 * events with structured before/after diffs scoped to the environment.
 */

/** Thrown when a flag key collides within the same project. */
export class FlagKeyTakenError extends Error {
  constructor(public key: string) {
    super(`Flag key "${key}" already exists in this project`);
    this.name = "FlagKeyTakenError";
  }
}

function configToAuditState(config: FlagEnvironmentConfig) {
  return {
    enabled: config.enabled,
    rolloutPercentage: config.rolloutPercentage,
    rules: config.rules,
  };
}

/** Create a flag and fan out a disabled configuration to every environment. */
export async function createFlag(input: {
  actorId: string;
  actorEmail: string;
  projectId: string;
  key: string;
  name: string;
  description?: string | null;
}): Promise<Flag> {
  try {
    return await db.transaction(async (tx) => {
      const [flag] = await tx
        .insert(flags)
        .values({
          projectId: input.projectId,
          key: input.key,
          name: input.name,
          description: input.description ?? null,
          createdBy: input.actorId,
        })
        .returning();

      const envRows = await tx
        .select({ id: environments.id })
        .from(environments)
        .where(eq(environments.projectId, input.projectId));

      if (envRows.length > 0) {
        await tx.insert(flagEnvironmentConfigs).values(
          envRows.map((env) => ({
            flagId: flag.id,
            environmentId: env.id,
            enabled: false,
            rolloutPercentage: 0,
            rules: [],
          })),
        );
      }

      await tx.insert(auditLogs).values({
        projectId: input.projectId,
        actorUserId: input.actorId,
        actorEmail: input.actorEmail,
        action: "flag.created",
        resourceType: "flag",
        resourceId: flag.id,
        resourceLabel: flag.key,
        changes: { after: { key: flag.key, name: flag.name } },
      });

      return flag;
    });
  } catch (error) {
    if (hasPostgresCode(error, "23505")) {
      throw new FlagKeyTakenError(input.key);
    }
    throw error;
  }
}

/** Matrix read model: every flag joined with its configuration per environment. */
export async function listFlagsWithEnvironments(projectId: string): Promise<{
  environments: Array<{ id: string; key: string; name: string }>;
  rows: Array<{ flag: Flag; configs: Record<string, FlagEnvironmentConfig> }>;
}> {
  const envRows = await db
    .select({ id: environments.id, key: environments.key, name: environments.name })
    .from(environments)
    .where(eq(environments.projectId, projectId))
    .orderBy(asc(environments.createdAt));

  const data = await db
    .select({
      flag: flags,
      environmentId: environments.id,
      environmentKey: environments.key,
      config: flagEnvironmentConfigs,
    })
    .from(flags)
    .leftJoin(
      flagEnvironmentConfigs,
      eq(flagEnvironmentConfigs.flagId, flags.id),
    )
    .leftJoin(
      environments,
      eq(environments.id, flagEnvironmentConfigs.environmentId),
    )
    .where(eq(flags.projectId, projectId))
    .orderBy(asc(flags.createdAt));

  const byFlag = new Map<string, { flag: Flag; configs: Record<string, FlagEnvironmentConfig> }>();
  for (const row of data) {
    let entry = byFlag.get(row.flag.id);
    if (!entry) {
      entry = { flag: row.flag, configs: {} };
      byFlag.set(row.flag.id, entry);
    }
    if (row.config && row.environmentId) {
      entry.configs[row.environmentId] = row.config;
    }
  }

  return { environments: envRows, rows: [...byFlag.values()] };
}

export async function getFlagForProject(
  projectId: string,
  flagKey: string,
): Promise<{ flag: Flag; configs: Array<FlagEnvironmentConfig & { environmentKey: string }> } | null> {
  const [flag] = await db
    .select()
    .from(flags)
    .where(and(eq(flags.projectId, projectId), eq(flags.key, flagKey)))
    .limit(1);

  if (!flag) return null;

  const configs = await db
    .select({
      config: flagEnvironmentConfigs,
      environmentKey: environments.key,
    })
    .from(flagEnvironmentConfigs)
    .innerJoin(environments, eq(environments.id, flagEnvironmentConfigs.environmentId))
    .where(eq(flagEnvironmentConfigs.flagId, flag.id))
    .orderBy(asc(environments.createdAt));

  return {
    flag,
    configs: configs.map((row) => ({ ...row.config, environmentKey: row.environmentKey })),
  };
}

/**
 * Update a single (flag, environment) configuration. The previous state is
 * captured inside the transaction so the audit diff can never diverge from
 * what was actually replaced.
 */
export async function updateFlagEnvironmentConfig(input: {
  actorId: string;
  actorEmail: string;
  projectId: string;
  flagId: string;
  environmentId: string;
  patch: FlagConfigValues;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [before] = await tx
      .select()
      .from(flagEnvironmentConfigs)
      .where(
        and(
          eq(flagEnvironmentConfigs.flagId, input.flagId),
          eq(flagEnvironmentConfigs.environmentId, input.environmentId),
        ),
      )
      .limit(1);

    if (!before) throw new Error("Configuration not found");

    const [env] = await tx
      .select({ key: environments.key })
      .from(environments)
      .where(eq(environments.id, input.environmentId))
      .limit(1);

    await tx
      .update(flagEnvironmentConfigs)
      .set({
        enabled: input.patch.enabled,
        rolloutPercentage: input.patch.rolloutPercentage,
        rules: input.patch.rules,
        updatedAt: new Date(),
      })
      .where(eq(flagEnvironmentConfigs.id, before.id));

    await tx.insert(auditLogs).values({
      projectId: input.projectId,
      environmentId: input.environmentId,
      environmentKey: env?.key ?? null,
      actorUserId: input.actorId,
      actorEmail: input.actorEmail,
      action: "flag_config.updated",
      resourceType: "flag_config",
      resourceId: before.id,
      resourceLabel: null,
      changes: {
        before: configToAuditState(before),
        after: input.patch,
      },
    });

    // Keep the parent flag's updatedAt fresh for list ordering.
    await tx.update(flags).set({ updatedAt: new Date() }).where(eq(flags.id, input.flagId));
  });
}

export async function renameFlag(input: {
  actorId: string;
  actorEmail: string;
  projectId: string;
  flagId: string;
  name?: string;
  description?: string | null;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(flags).where(eq(flags.id, input.flagId)).limit(1);
    if (!before) throw new Error("Flag not found");

    await tx
      .update(flags)
      .set({
        name: input.name ?? before.name,
        description: input.description === undefined ? before.description : input.description,
        updatedAt: new Date(),
      })
      .where(eq(flags.id, input.flagId));

    await tx.insert(auditLogs).values({
      projectId: input.projectId,
      actorUserId: input.actorId,
      actorEmail: input.actorEmail,
      action: "flag.updated",
      resourceType: "flag",
      resourceId: before.id,
      resourceLabel: before.key,
      changes: {
        before: { name: before.name, description: before.description },
        after: {
          name: input.name ?? before.name,
          description: input.description === undefined ? before.description : input.description,
        },
      },
    });
  });
}

/**
 * Hard-delete a flag. Audit history survives because audit rows snapshot
 * labels and never reference flags via foreign keys.
 */
export async function deleteFlag(input: {
  actorId: string;
  actorEmail: string;
  projectId: string;
  flagId: string;
}): Promise<void> {
  await db.transaction(async (tx) => {
    const [before] = await tx.select().from(flags).where(eq(flags.id, input.flagId)).limit(1);
    if (!before) throw new Error("Flag not found");

    await tx.delete(flags).where(eq(flags.id, input.flagId));

    await tx.insert(auditLogs).values({
      projectId: input.projectId,
      actorUserId: input.actorId,
      actorEmail: input.actorEmail,
      action: "flag.deleted",
      resourceType: "flag",
      resourceId: before.id,
      resourceLabel: before.key,
      changes: { before: { key: before.key, name: before.name }, after: null },
    });
  });
}
