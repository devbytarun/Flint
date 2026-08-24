"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createProjectSchema, updateProjectSchema } from "@/lib/validation/project";
import { getCurrentUser } from "@/server/auth/current-user";
import { hasAtLeast } from "@/server/authz/roles";
import {
  archiveProject,
  createProject,
  getProjectContext,
  renameProject,
} from "@/server/services/project-service";

/**
 * Server actions for project management. Each action independently
 * re-verifies authentication and authorization — being reachable through
 * direct POSTs means nothing about the caller can be trusted.
 */

export interface ProjectFormState {
  error?: string;
  fieldErrors?: Partial<Record<"name" | "description", string[]>>;
  values?: Partial<{ name: string; description: string }>;
}

function fieldErrorsFrom(error: {
  issues: Array<{ path: Array<string | number | symbol>; message: string }>;
}): ProjectFormState["fieldErrors"] {
  const result: NonNullable<ProjectFormState["fieldErrors"]> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "name" || field === "description") {
      result[field] ??= [];
      result[field].push(issue.message);
    }
  }
  return result;
}

export async function createProjectAction(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { name: String(formData.get("name") ?? "") },
    };
  }

  const project = await createProject({
    ownerId: user.id,
    ownerEmail: user.email,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
  });

  revalidatePath("/projects");
  redirect(`/project/${project.slug}`);
}

export async function updateProjectAction(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");

  // Authorization first, validation second: do not leak parse results to
  // non-members.
  const context = await getProjectContext(slug, user.id);
  if (!context || !hasAtLeast(context.role, "admin")) {
    return { error: "You do not have permission to modify this project." };
  }

  const parsed = updateProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return {
      fieldErrors: fieldErrorsFrom(parsed.error),
      values: { name: String(formData.get("name") ?? "") },
    };
  }

  await renameProject({
    projectId: context.project.id,
    actorId: user.id,
    actorEmail: user.email,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
  });

  revalidatePath(`/project/${slug}`);
  return { values: parsed.data };
}

export interface ArchiveFormState {
  error?: string;
}

export async function archiveProjectAction(
  _prevState: ArchiveFormState,
  formData: FormData,
): Promise<ArchiveFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  const context = await getProjectContext(slug, user.id);
  if (!context || !context.canAdminister) {
    return { error: "Only project owners can archive this project." };
  }

  // Type-to-confirm guard against destructive accidents.
  if (confirmation !== context.project.name) {
    return { error: `Type the project name "${context.project.name}" to confirm.` };
  }

  await archiveProject({
    projectId: context.project.id,
    actorId: user.id,
    actorEmail: user.email,
  });

  revalidatePath("/projects");
  redirect("/projects");
}
