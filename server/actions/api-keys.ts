"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/server/auth/current-user";
import { hasAtLeast } from "@/server/authz/roles";
import { getProjectContext } from "@/server/services/project-service";
import { createApiKey, listApiKeys } from "@/server/services/api-key-service";
import { revokeApiKey } from "@/server/services/api-key-service";

export interface CreateKeyState {
  error?: string;
}

export type ListKeysResult = Awaited<ReturnType<typeof listApiKeys>>;

/**
 * Creates an environment-scoped API key. The raw token is returned exactly
 * once in this response and stored nowhere in plaintext.
 */
export async function createApiKeyAction(
  _prevState: CreateKeyState,
  formData: FormData,
): Promise<CreateKeyState & { token?: string; keyName?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");
  const context = await getProjectContext(slug, user.id);
  if (!context || !hasAtLeast(context.role, "admin")) {
    return { error: "You do not have permission to create API keys." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const environmentId = String(formData.get("environmentId") ?? "");
  if (name.length < 1 || name.length > 80) {
    return { error: "Provide a name up to 80 characters." };
  }
  if (!environmentId) {
    return { error: "Choose an environment." };
  }

  try {
    const { apiKey, token } = await createApiKey({
      actorId: user.id,
      actorEmail: user.email,
      projectId: context.project.id,
      environmentId,
      name,
    });
    revalidatePath(`/project/${slug}/keys`);
    return { token, keyName: apiKey.name };
  } catch {
    return { error: "Could not create the API key." };
  }
}

export async function revokeApiKeyAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const slug = String(formData.get("slug") ?? "");
  const apiKeyId = String(formData.get("apiKeyId") ?? "");

  const context = await getProjectContext(slug, user.id);
  if (!context || !hasAtLeast(context.role, "admin")) redirect(`/project/${slug}/keys`);

  try {
    await revokeApiKey({
      actorId: user.id,
      actorEmail: user.email,
      projectId: context.project.id,
      apiKeyId,
    });
  } catch {
    // Idempotent / not found — nothing to do.
  }

  revalidatePath(`/project/${slug}/keys`);
}
