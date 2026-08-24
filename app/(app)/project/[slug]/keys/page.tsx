import { notFound, redirect } from "next/navigation";

import { CreateApiKeyForm } from "@/components/api-keys/create-api-key-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current-user";
import { revokeApiKeyAction } from "@/server/actions/api-keys";
import { listApiKeys } from "@/server/services/api-key-service";
import { getProjectContext, listEnvironmentsForProject } from "@/server/services/project-service";

export const metadata = { title: "API keys" };

function formatDate(date: Date | null): string {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

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
        <h2 className="text-sm font-medium text-text-secondary">API keys</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          Keys are scoped to a single environment and evaluate flags only — they cannot change
          configuration.
        </p>
      </div>

      <div className="mt-4 rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
        <CreateApiKeyForm
          slug={slug}
          environments={environments.map((env) => ({ id: env.id, key: env.key, name: env.name }))}
        />
      </div>

      <h3 className="mt-8 text-sm font-medium text-text-secondary">
        Existing keys{keys.length > 0 ? ` (${keys.length})` : ""}
      </h3>

      {keys.length === 0 ? (
        <p className="mt-3 rounded-[var(--radius-card)] border border-dashed border-border px-4 py-10 text-center text-sm text-text-muted">
          No API keys yet. Create one so your application can start evaluating flags.
        </p>
      ) : (
        <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] border border-border-subtle">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-raised/60 text-xs text-text-secondary">
                <th className="px-4 py-2.5 font-medium">Name</th>
                <th className="hidden px-4 py-2.5 font-medium sm:table-cell">Token</th>
                <th className="px-4 py-2.5 font-medium">Environment</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Last used</th>
                <th className="px-4 py-2.5 text-right font-medium">Status</th>
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
                  <td className="px-4 py-3">{environment.name}</td>
                  <td className="hidden px-4 py-3 text-text-muted md:table-cell">
                    {formatDate(apiKey.lastUsedAt)}
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
                          className="text-danger hover:text-danger"
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
  );
}
