import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProjectContext, listEnvironmentsForProject } from "@/server/services/project-service";
import type { Environment } from "@/db/schema";

export const metadata = { title: "Overview" };

export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getProjectContext(slug, user.id);
  if (!context) notFound();

  const environments: Environment[] = await listEnvironmentsForProject(context.project.id);

  return (
    <div>
      <h2 className="text-sm font-medium text-text-secondary">Environments</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {environments.map((env) => (
          <div
            key={env.id}
            className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{env.name}</h3>
              {env.protected ? <Badge tone="accent">protected</Badge> : null}
            </div>
            <p className="mt-2 text-[13px] text-text-secondary">{env.description}</p>
            <p className="mt-4 font-mono text-xs text-text-muted">{env.key}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-[var(--radius-card)] border border-dashed border-border p-6">
        <h3 className="font-medium">Feature flags</h3>
        <p className="mt-1 text-sm text-text-secondary">
          Flag management arrives with the flags milestone — creation, per-environment rollout
          configuration, and the evaluation playground.
        </p>
      </div>
    </div>
  );
}
