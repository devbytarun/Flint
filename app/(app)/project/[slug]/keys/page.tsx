import { KeyRound } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { CreateApiKeyForm } from "@/components/api-keys/create-api-key-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/server/auth/current-user";
import { revokeApiKeyAction } from "@/server/actions/api-keys";
import { listApiKeys } from "@/server/services/api-key-service";
import { getProjectContext, listEnvironmentsForProject } from "@/server/services/project-service";
import { relativeTime } from "@/lib/relative-time";

export const metadata = { title: "API keys" };

export default async function ApiKeysPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getProjectContext(slug, user.id);
  if (!context) notFound();

  const [keys, environments] = await Promise.all([
    listApiKeys(context.project.id),
    listEnvironmentsForProject(context.project.id),
  ]);

  return (
    <div className="max-w-3xl">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">API keys</h1>
        <p className="mt-1 text-[13px] text-text-muted">
          Keys are scoped to a single environment and can only evaluate flags — they never modify
          configuration.
        </p>
      </div>

      <div className="mt-6 rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
        <CreateApiKeyForm
          slug={slug}
          environments={environments.map((env) => ({ id: env.id, key: env.key, name: env.name }))}
        />
      </div>

      <h2 className="mt-10 text-sm font-medium text-text-secondary">
        Existing keys{keys.length > 0 ? ` (${keys.length})` : ""}
      </h2>

      <div className="mt-3">
        {keys.length === 0 ? (
          <EmptyState
            icon={<KeyRound aria-hidden="true" className="size-7" />}
            title="No API keys yet"
            description="Create one so your application can start evaluating flags against this project."
          />
        ) : (
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-border-subtle">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-border-subtle bg-surface-raised/60 text-xs text-text-secondary">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Name
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">
                    Token
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Environment
                  </th>
                  <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
                    Last used
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {keys.map(({ apiKey, environment }) => (
                  <tr
                    key={apiKey.id}
                    className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/40"
                  >
                    <td className="px-4 py-3">{apiKey.name}</td>
                    <td className="hidden px-4 py-3 font-mono text-xs text-text-muted sm:table-cell">
                      {apiKey.displayToken}…
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        {environment.name}
                        {environment.key === "production" ? (
                          <span
                            aria-label="(protected environment)"
                            data-tooltip="Protected environment"
                            className="inline-block size-1.5 rounded-full bg-accent"
                          />
                        ) : null}
                      </span>
                    </td>
                    <td className="hidden whitespace-nowrap px-4 py-3 text-text-muted md:table-cell">
                      {apiKey.lastUsedAt ? relativeTime(apiKey.lastUsedAt) : "never"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {apiKey.revokedAt ? (
                        <Badge tone="danger">revoked</Badge>
                      ) : context.canManage ? (
                        <form action={revokeApiKeyAction}>
                          <input type="hidden" name="slug" value={slug} />
                          <input type="hidden" name="apiKeyId" value={apiKey.id} />
                          <Button
                            variant="ghost"
                            size="sm"
                            type="submit"
                            className="text-danger hover:bg-danger/10 hover:text-danger"
                          >
                            Revoke
                          </Button>
                        </form>
                      ) : (
                        <Badge tone="success">active</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-4 rounded-[var(--radius-card)] border border-dashed border-border px-4 py-3 text-xs leading-relaxed text-text-muted">
        Tokens are stored as SHA-256 hashes — nobody (including us) can recover one after creation.
        If a key leaks, revoke it and create a new one.
      </p>
    </div>
  );
}
