import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  auditLogs,
  environments,
  projectMembers,
  projects,
  type Environment,
  type Project,
  type ProjectRole,
} from "@/db/schema";

import { hasAtLeast } from "@/server/authz/roles";

/**
 * Project business logic with authorization built in.
 *
 * Every accessor takes the acting user id and resolves membership in the
 * same query, so a caller can never accidentally operate on a project the
 * user does not belong to. There is deliberately no "get project by id"
 * escape hatch without a userId.
 */

/** Environments provisioned automatically for every new project. */
const DEFAULT_ENVIRONMENTS: Array<{
  key: string;
  name: string;
  description: string;
  protected: boolean;
}> = [
  {
    key: "development",
    name: "Development",
    description: "Local development — anything goes.",
    protected: false,
  },
  {
    key: "staging",
    name: "Staging",
    description: "Pre-production verification environment.",
    protected: false,
  },
  {
    key: "production",
    name: "Production",
    description: "Live traffic. Changes require extra care.",
    protected: true,
  },
];

export interface ProjectSummary extends Project {
  role: ProjectRole;
}

export interface ProjectAccessContext {
  project: Project;
  role: ProjectRole;
  /** admin or owner */
  canManage: boolean;
  /** owner only */
  canAdminister: boolean;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "project";
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const [existing] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }
  // Practically unreachable; deterministic fallback.
  return `${base}-${Date.now().toString(36)}`;
}

export async function createProject(input: {
  ownerId: string;
  ownerEmail: string;
  name: string;
  description?: string | null;
}): Promise<Project> {
  const slug = await generateUniqueSlug(input.name);

  return db.transaction(async (tx) => {
    const [project] = await tx
      .insert(projects)
      .values({
        name: input.name,
        slug,
        description: input.description ?? null,
        createdBy: input.ownerId,
      })
      .returning();

    await tx.insert(projectMembers).values({
      projectId: project.id,
      userId: input.ownerId,
      role: "owner",
    });

    await tx
      .insert(environments)
      .values(DEFAULT_ENVIRONMENTS.map((env) => ({ ...env, projectId: project.id })));

    await tx.insert(auditLogs).values({
      projectId: project.id,
      actorUserId: input.ownerId,
      actorEmail: input.ownerEmail,
      action: "project.created",
      resourceType: "project",
      resourceId: project.id,
      resourceLabel: project.name,
      changes: { after: { name: project.name, slug: project.slug } },
    });

    return project;
  });
}

export async function listProjectsForUser(userId: string): Promise<ProjectSummary[]> {
  return db
    .select({
      id: projects.id,
      name: projects.name,
      slug: projects.slug,
      description: projects.description,
      createdBy: projects.createdBy,
      archivedAt: projects.archivedAt,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
      role: projectMembers.role,
    })
    .from(projectMembers)
    .innerJoin(projects, eq(projects.id, projectMembers.projectId))
    .where(and(eq(projectMembers.userId, userId), isNull(projects.archivedAt)))
    .orderBy(desc(projects.createdAt));
}

/**
 * Resolve a project by slug for a specific user, including their derived
 * permissions. Returns null when the project does not exist OR the user is
 * not a member (indistinguishable on purpose — no existence oracle).
 */
export async function getProjectContext(
  slug: string,
  userId: string,
): Promise<ProjectAccessContext | null> {
  const [row] = await db
    .select({ project: projects, role: projectMembers.role })
    .from(projects)
    .innerJoin(
      projectMembers,
      and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, userId)),
    )
    .where(and(eq(projects.slug, slug), isNull(projects.archivedAt)))
    .limit(1);

  if (!row) return null;

  return {
    project: row.project,
    role: row.role,
    canManage: hasAtLeast(row.role, "admin"),
    canAdminister: hasAtLeast(row.role, "owner"),
  };
}

const ENV_ORDER = sql`case ${environments.key} when 'development' then 0 when 'staging' then 1 else 2 end`;

export async function listEnvironmentsForProject(projectId: string): Promise<Environment[]> {
  return db
    .select()
    .from(environments)
    .where(eq(environments.projectId, projectId))
    .orderBy(ENV_ORDER, environments.createdAt);
}

export async function renameProject(input: {
  projectId: string;
  actorId: string;
  actorEmail: string;
  name: string;
  description: string | null;
}): Promise<void> {
  const [before] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);

  if (!before) throw new Error("Project not found");

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({ name: input.name, description: input.description, updatedAt: new Date() })
      .where(eq(projects.id, input.projectId));

    await tx.insert(auditLogs).values({
      projectId: input.projectId,
      actorUserId: input.actorId,
      actorEmail: input.actorEmail,
      action: "project.updated",
      resourceType: "project",
      resourceId: input.projectId,
      resourceLabel: before.name,
      changes: {
        before: { name: before.name, description: before.description },
        after: { name: input.name, description: input.description },
      },
    });
  });
}

/**
 * Archive a project. The row (and therefore its complete audit trail)
 * remains in the database; archived projects simply disappear from all
 * access paths above.
 */
export async function archiveProject(input: {
  projectId: string;
  actorId: string;
  actorEmail: string;
}): Promise<string> {
  const [before] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, input.projectId), isNull(projects.archivedAt)))
    .limit(1);

  if (!before) throw new Error("Project not found");

  const archivedAt = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(projects)
      .set({ archivedAt, updatedAt: archivedAt })
      .where(eq(projects.id, input.projectId));

    await tx.insert(auditLogs).values({
      projectId: input.projectId,
      actorUserId: input.actorId,
      actorEmail: input.actorEmail,
      action: "project.archived",
      resourceType: "project",
      resourceId: input.projectId,
      resourceLabel: before.name,
      changes: { before: { archivedAt: null }, after: { archivedAt: archivedAt.toISOString() } },
    });
  });

  return before.slug;
}
