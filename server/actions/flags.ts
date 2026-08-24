"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  createFlagSchema,
  flagConfigSchema,
  updateFlagSchema,
  type FlagConfigValues,
} from "@/lib/validation/flag";
import { evaluateFlag } from "@/lib/evaluation";
import type { FlagConfig as EvaluableFlagConfig } from "@/lib/evaluation";
import { getCurrentUser } from "@/server/auth/current-user";
import { hasAtLeast } from "@/server/authz/roles";
import { getProjectContext } from "@/server/services/project-service";
import {
  createFlag,
  deleteFlag,
  getFlagForProject,
  renameFlag,
  updateFlagEnvironmentConfig,
  FlagKeyTakenError,
} from "@/server/services/flag-service";

/**
 * Flag management actions. Every mutation re-resolves project membership
 * server-side; UI affordances are never the security mechanism.
 */

export interface FlagFormState {
  error?: string;
  fieldErrors?: Partial<Record<"key" | "name" | "description" | "config", string[]>>;
  values?: Partial<{ name: string; description: string }>;
}

function fieldErrorsFrom(error: {
  issues: Array<{ path: Array<string | number | symbol>; message: string }>;
}): FlagFormState["fieldErrors"] {
  const result: NonNullable<FlagFormState["fieldErrors"]> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (field === "key" || field === "name" || field === "description") {
      result[field] ??= [];
      result[field].push(issue.message);
    }
  }
  return result;
}

export async function createFlagAction(
  _prevState: FlagFormState,
  formData: FormData,
): Promise<FlagFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");
  const context = await getProjectContext(slug, user.id);
  if (!context || !hasAtLeast(context.role, "admin")) {
    return { error: "You do not have permission to create flags in this project." };
  }

  const parsed = createFlagSchema.safeParse({
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error) };
  }

  try {
    const flag = await createFlag({
      actorId: user.id,
      actorEmail: user.email,
      projectId: context.project.id,
      key: parsed.data.key,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
    });
    revalidatePath(`/project/${slug}/flags`);
    redirect(`/project/${slug}/flags/${flag.key}`);
  } catch (error) {
    if (error instanceof FlagKeyTakenError) {
      return { fieldErrors: { key: ["A flag with this key already exists"] } };
    }
    throw error;
  }
}

/**
 * Persist a full per-environment configuration (enabled, rollout, rules).
 * Called from the flag detail editor.
 */
export async function updateFlagConfigAction(
  _prevState: FlagFormState,
  formData: FormData,
): Promise<FlagFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");
  const flagKey = String(formData.get("flagKey") ?? "");
  const environmentId = String(formData.get("environmentId") ?? "");

  const context = await getProjectContext(slug, user.id);
  if (!context || !hasAtLeast(context.role, "admin")) {
    return { error: "You do not have permission to modify flags in this project." };
  }

  const found = await getFlagForProject(context.project.id, flagKey);
  if (!found) return { error: "Flag not found." };

  let configJson: unknown;
  try {
    configJson = JSON.parse(String(formData.get("config") ?? "{}"));
  } catch {
    return { error: "Malformed configuration payload." };
  }

  const parsed = flagConfigSchema.safeParse(configJson);
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Invalid configuration.",
      fieldErrors: { config: [parsed.error.issues[0]?.message ?? "Invalid configuration."] },
    };
  }

  const environmentIds = new Set(found.configs.map((config) => config.id));
  if (!environmentIds.has(environmentId)) {
    return { error: "Unknown environment for this flag." };
  }

  await updateFlagEnvironmentConfig({
    actorId: user.id,
    actorEmail: user.email,
    projectId: context.project.id,
    flagId: found.flag.id,
    environmentId,
    patch: parsed.data,
  });

  revalidatePath(`/project/${slug}/flags`);
  revalidatePath(`/project/${slug}/flags/${flagKey}`);
  return {};
}

/** Quick toggle used by the flags matrix. */
export async function toggleFlagAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");
  const flagKey = String(formData.get("flagKey") ?? "");
  const environmentId = String(formData.get("environmentId") ?? "");

  const context = await getProjectContext(slug, user.id);
  if (!context || !hasAtLeast(context.role, "admin")) redirect(`/project/${slug}/flags`);

  const found = await getFlagForProject(context.project.id, flagKey);
  const current = found?.configs.find((config) => config.id === environmentId);
  if (!found || !current) redirect(`/project/${slug}/flags`);

  // Toggling preserves rollout and rules exactly as configured.
  await updateFlagEnvironmentConfig({
    actorId: user.id,
    actorEmail: user.email,
    projectId: context.project.id,
    flagId: found.flag.id,
    environmentId,
    patch: {
      enabled: !current.enabled,
      rolloutPercentage: current.rolloutPercentage,
      rules: current.rules as FlagConfigValues["rules"],
    },
  });

  revalidatePath(`/project/${slug}/flags`);
}

export async function updateFlagDetailsAction(
  _prevState: FlagFormState,
  formData: FormData,
): Promise<FlagFormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");
  const flagKey = String(formData.get("flagKey") ?? "");

  const context = await getProjectContext(slug, user.id);
  if (!context || !hasAtLeast(context.role, "admin")) {
    return { error: "You do not have permission to modify this flag." };
  }

  const found = await getFlagForProject(context.project.id, flagKey);
  if (!found) return { error: "Flag not found." };

  const parsed = updateFlagSchema.safeParse({
    name: String(formData.get("name") ?? "").trim() || undefined,
    description: String(formData.get("description") ?? "").trim() || null,
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFrom(parsed.error) };

  await renameFlag({
    actorId: user.id,
    actorEmail: user.email,
    projectId: context.project.id,
    flagId: found.flag.id,
    name: parsed.data.name,
    description: parsed.data.description ?? null,
  });

  revalidatePath(`/project/${slug}/flags`);
  revalidatePath(`/project/${slug}/flags/${flagKey}`);
  return {};
}

export async function deleteFlagAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");
  const flagKey = String(formData.get("flagKey") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  const context = await getProjectContext(slug, user.id);
  if (!context || !hasAtLeast(context.role, "admin")) redirect(`/project/${slug}/flags`);
  if (confirmation !== flagKey) redirect(`/project/${slug}/flags/${flagKey}?error=confirm`);

  const found = await getFlagForProject(context.project.id, flagKey);
  if (!found) redirect(`/project/${slug}/flags`);

  await deleteFlag({
    actorId: user.id,
    actorEmail: user.email,
    projectId: context.project.id,
    flagId: found.flag.id,
  });

  revalidatePath(`/project/${slug}/flags`);
  redirect(`/project/${slug}/flags`);
}

/* -------------------------------------------------------------------------- */
/* Playground                                                                  */
/* -------------------------------------------------------------------------- */

export interface PlaygroundState {
  summary?: string;
  detail?: string;
  error?: string;
}

/**
 * Evaluate the flag exactly like the public API does, but scoped to a
 * dashboard session. Useful for verifying rules before shipping them.
 */
export async function playgroundEvaluateAction(
  _prevState: PlaygroundState,
  formData: FormData,
): Promise<PlaygroundState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");
  const flagKey = String(formData.get("flagKey") ?? "");

  const context = await getProjectContext(slug, user.id);
  if (!context) return { error: "Access denied." };

  const found = await getFlagForProject(context.project.id, flagKey);
  if (!found) return { error: "Flag not found." };

  const environmentId = String(formData.get("environmentId") ?? "");
  const configRow = found.configs.find((config) => config.id === environmentId);
  if (!configRow) return { error: "Unknown environment." };
  const targetingKey = String(formData.get("targetingKey") ?? "").trim();

  let attributes: unknown;
  try {
    const raw = String(formData.get("attributes") ?? "{}").trim() || "{}";
    attributes = JSON.parse(raw);
  } catch {
    return { error: 'Attributes must be valid JSON, e.g. {"plan":"pro"}' };
  }

  if (attributes === null || typeof attributes !== "object" || Array.isArray(attributes)) {
    return { error: 'Attributes must be a JSON object, e.g. {"plan":"pro"}' };
  }

  const evaluableConfig: EvaluableFlagConfig = {
    environmentId: configRow.id,
    flagId: found.flag.id,
    flagKey: found.flag.key,
    enabled: configRow.enabled,
    rolloutPercentage: configRow.rolloutPercentage,
    rules: (configRow.rules as EvaluableFlagConfig["rules"]) ?? [],
  };

  const result = evaluateFlag(evaluableConfig, {
    targetingKey: targetingKey || undefined,
    attributes: attributes as Record<string, string>,
  });

  return {
    summary: result.enabled ? "ON" : "OFF",
    detail:
      `reason=${result.reason}` +
      (result.bucket !== undefined ? ` bucket=${result.bucket}` : "") +
      ` environment=${configRow.environmentKey}`,
  };
}
