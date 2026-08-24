import { Flag } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FlagsMatrix, type MatrixRow } from "@/components/flags/flags-matrix";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProjectContext } from "@/server/services/project-service";
import { listFlagsWithEnvironments } from "@/server/services/flag-service";

export const metadata = { title: "Flags" };

export default async function FlagsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getProjectContext(slug, user.id);
  if (!context) notFound();

  const { environments, rows } = await listFlagsWithEnvironments(context.project.id);

  const matrixRows: MatrixRow[] = rows.map(({ flag, configs }) => ({
    flagKey: flag.key,
    flagName: flag.name,
    updatedAt: flag.updatedAt.toISOString(),
    configs: Object.fromEntries(
      Object.entries(configs).map(([envId, config]) => [
        envId,
        config
          ? { enabled: config.enabled, rolloutPercentage: config.rolloutPercentage }
          : undefined,
      ]),
    ),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Feature flags</h1>
          <p className="mt-1 text-[13px] text-text-muted">
            State per environment. Open a flag for rollout and targeting.
          </p>
        </div>
        {context.canManage ? (
          <Link href={`/project/${slug}/flags/new`}>
            <Button size="sm">New flag</Button>
          </Link>
        ) : null}
      </div>

      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState
            icon={<Flag aria-hidden="true" className="size-7" />}
            title="No flags yet"
            description="Flags start disabled in every environment. Flip them per environment when you're ready to ship."
            action={
              context.canManage ? (
                <Link href={`/project/${slug}/flags/new`}>
                  <Button size="sm">Create your first flag</Button>
                </Link>
              ) : null
            }
          />
        ) : (
          <FlagsMatrix
            slug={slug}
            canManage={context.canManage}
            environments={environments.map((env) => ({
              id: env.id,
              key: env.key,
              name: env.name,
              protected: env.protected,
            }))}
            rows={matrixRows}
          />
        )}
      </div>
    </div>
  );
}
