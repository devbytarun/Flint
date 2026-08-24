/**
 * Integration tests for the flag service against the real database.
 * Fixtures are uniquely named and removed after each run.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";

import { db, sql } from "@/db";
import { auditLogs, environments, flagEnvironmentConfigs, flags, users } from "@/db/schema";
import { createProject } from "@/server/services/project-service";
import {
  createFlag,
  deleteFlag,
  FlagKeyTakenError,
  getFlagForProject,
  listFlagsWithEnvironments,
  updateFlagEnvironmentConfig,
} from "@/server/services/flag-service";

const suffix = randomBytes(3).toString("hex");
const ownerEmail = `it-flags-${suffix}@example.com`;
const passwordHash = "integration-test-no-login";

let userId: string;
let projectId: string;
let envIds: Record<string, string> = {};

async function auditEvents(action: string) {
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.projectId, projectId), eq(auditLogs.action, action)));
}

beforeAll(async () => {
  const [user] = await db
    .insert(users)
    .values({ email: ownerEmail, name: "Flags Integration", passwordHash })
    .returning({ id: users.id });
  userId = user.id;

  const project = await createProject({
    ownerId: userId,
    ownerEmail,
    name: `Flags Test ${suffix}`,
  });
  projectId = project.id;

  const envRows = await db
    .select({ id: environments.id, key: environments.key })
    .from(environments)
    .where(eq(environments.projectId, projectId));

  envIds = Object.fromEntries(envRows.map((row) => [row.key, row.id]));
});

afterAll(async () => {
  await sql`delete from projects where id = ${projectId}`;
  await db.delete(users).where(eq(users.id, userId));
  await sql.end();
});

describe("flag service", () => {
  it("creates a flag with a configuration row per environment", async () => {
    const flag = await createFlag({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      key: "new_checkout",
      name: "New checkout",
    });

    const configs = await db
      .select()
      .from(flagEnvironmentConfigs)
      .where(eq(flagEnvironmentConfigs.flagId, flag.id));

    expect(configs).toHaveLength(3);
    for (const config of configs) {
      expect(config.enabled).toBe(false);
      expect(config.rolloutPercentage).toBe(0);
      expect(config.rules).toEqual([]);
    }

    expect(await auditEvents("flag.created")).toHaveLength(1);
  });

  it("reflects configurations in the matrix read model", async () => {
    const { rows } = await listFlagsWithEnvironments(projectId);
    expect(rows).toHaveLength(1);
    expect(Object.keys(rows[0].configs)).toHaveLength(3);
  });

  it("updates a configuration and records a structured diff", async () => {
    const [flag] = await db
      .select()
      .from(flags)
      .where(and(eq(flags.projectId, projectId), eq(flags.key, "new_checkout")))
      .limit(1);

    await updateFlagEnvironmentConfig({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      flagId: flag.id,
      environmentId: envIds.production,
      patch: {
        enabled: true,
        rolloutPercentage: 2500,
        rules: [
          {
            attribute: "plan",
            operator: "in",
            values: ["pro", "enterprise"],
            serve: true,
          },
        ],
      },
    });

    const found = await getFlagForProject(projectId, "new_checkout");
    const prodConfig = found?.configs.find((config) => config.environmentKey === "production");
    expect(prodConfig?.enabled).toBe(true);
    expect(prodConfig?.rolloutPercentage).toBe(2500);
    expect(prodConfig?.rules).toHaveLength(1);

    // Other environments remain untouched — environment isolation.
    const devConfig = found?.configs.find((config) => config.environmentKey === "development");
    expect(devConfig?.enabled).toBe(false);

    const events = await auditEvents("flag_config.updated");
    expect(events).toHaveLength(1);
    const changes = events[0].changes as {
      before: { enabled: boolean };
      after: { enabled: boolean; rolloutPercentage: number };
    };
    expect(changes.before.enabled).toBe(false);
    expect(changes.after.enabled).toBe(true);
    expect(changes.after.rolloutPercentage).toBe(2500);
    expect(events[0].environmentKey).toBe("production");
  });

  it("deletes a flag but preserves its audit history", async () => {
    const [flag] = await db
      .select()
      .from(flags)
      .where(and(eq(flags.projectId, projectId), eq(flags.key, "new_checkout")))
      .limit(1);

    await deleteFlag({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      flagId: flag.id,
    });

    const remaining = await db.select().from(flags).where(eq(flags.id, flag.id));
    expect(remaining).toHaveLength(0);

    // Tombstone event remains queryable.
    expect(await auditEvents("flag.deleted")).toHaveLength(1);
    expect(await auditEvents("flag.created")).toHaveLength(1);

    // Configs cascade away.
    const configs = await db
      .select()
      .from(flagEnvironmentConfigs)
      .where(eq(flagEnvironmentConfigs.flagId, flag.id));
    expect(configs).toHaveLength(0);
  });

  it("enforces project scoping on flag lookup", async () => {
    await createFlag({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      key: "scoped_flag",
      name: "Scoped",
    });

    const foundInProject = await getFlagForProject(projectId, "scoped_flag");
    expect(foundInProject).not.toBeNull();

    // A different project id must not see the flag.
    const other = await getFlagForProject(crypto.randomUUID(), "scoped_flag");
    expect(other).toBeNull();
  });

  it("rejects duplicate keys within a project", async () => {
    await createFlag({
      actorId: userId,
      actorEmail: ownerEmail,
      projectId,
      key: "dup_check",
      name: "First",
    });

    await expect(
      createFlag({
        actorId: userId,
        actorEmail: ownerEmail,
        projectId,
        key: "dup_check",
        name: "Second",
      }),
    ).rejects.toBeInstanceOf(FlagKeyTakenError);
  });
});
