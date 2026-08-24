/**
 * Integration tests for project authorization boundaries.
 *
 * These run against the real development database (DATABASE_URL in
 * .env.local). Each run creates uniquely-named fixtures and removes them,
 * so the suite is safe to execute repeatedly.
 */
import { randomBytes } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";

import { db, sql } from "@/db";
import { auditLogs, users } from "@/db/schema";
import {
  archiveProject,
  createProject,
  getProjectContext,
  listProjectsForUser,
  listEnvironmentsForProject,
} from "@/server/services/project-service";
import { hasAtLeast } from "@/server/authz/roles";

const suffix = randomBytes(3).toString("hex");
const ownerEmail = `it-owner-${suffix}@example.com`;
const outsiderEmail = `it-outsider-${suffix}@example.com`;
const passwordHash = "integration-test-no-login"; // never authenticated

let ownerId: string;
let outsiderId: string;
let projectId: string;
let projectSlug: string;

async function createUser(email: string): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({ email, name: "Integration", passwordHash })
    .returning({ id: users.id });
  return user.id;
}

beforeAll(async () => {
  ownerId = await createUser(ownerEmail);
  outsiderId = await createUser(outsiderEmail);

  const project = await createProject({
    ownerId,
    ownerEmail,
    name: `Boundary Test ${suffix}`,
    description: "Created by integration tests",
  });
  projectId = project.id;
  projectSlug = project.slug;
});

afterAll(async () => {
  // Remove fixtures bottom-up; audit logs cascade with the project.
  await sql`delete from projects where id = ${projectId}`;
  await db.delete(users).where(eq(users.id, ownerId));
  await db.delete(users).where(eq(users.id, outsiderId));
  await sql.end();
});

describe("project service — authorization boundaries", () => {
  it("creates a project with an owner membership and default environments", async () => {
    const context = await getProjectContext(projectSlug, ownerId);
    expect(context).not.toBeNull();
    expect(context?.role).toBe("owner");
    expect(context?.canAdminister).toBe(true);
    expect(context?.canManage).toBe(true);

    const environments = await listEnvironmentsForProject(projectId);
    expect(environments.map((e) => e.key)).toEqual(["development", "staging", "production"]);
    expect(environments.find((e) => e.key === "production")?.protected).toBe(true);

    // Project creation is an auditable event and must be recorded.
    const [createdEvent] = await db
      .select({ id: auditLogs.id })
      .from(auditLogs)
      .where(eq(auditLogs.projectId, projectId));
    expect(createdEvent).toBeDefined();
  });

  it("returns null for non-members instead of exposing the project", async () => {
    const context = await getProjectContext(projectSlug, outsiderId);
    expect(context).toBeNull();
  });

  it("lists owned projects for the owner and hides archived ones", async () => {
    const before = await listProjectsForUser(ownerId);
    expect(before.some((p) => p.slug === projectSlug)).toBe(true);

    await archiveProject({
      projectId,
      actorId: ownerId,
      actorEmail: ownerEmail,
    });

    const after = await listProjectsForUser(ownerId);
    expect(after.some((p) => p.slug === projectSlug)).toBe(false);

    // Archived projects are inaccessible through the context resolver too.
    const archivedContext = await getProjectContext(projectSlug, ownerId);
    expect(archivedContext).toBeNull();
  });
});

describe("role hierarchy", () => {
  it("orders roles strictly", () => {
    expect(hasAtLeast("owner", "admin")).toBe(true);
    expect(hasAtLeast("admin", "member")).toBe(true);
    expect(hasAtLeast("member", "admin")).toBe(false);
    expect(hasAtLeast("admin", "owner")).toBe(false);
  });
});
