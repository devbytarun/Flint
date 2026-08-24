import { KeyRound, ScrollText } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";

import { db } from "@/db";
import { apiKeys } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProjectContext } from "@/server/services/project-service";
import { getProjectFlagStats, listFlagsWithEnvironments } from "@/server/services/flag-service";

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

  const [stats, { rows: flagRows }, [keyCount]] = await Promise.all([
    getProjectFlagStats(context.project.id),
    listFlagsWithEnvironments(context.project.id),
    db.select({ count: count() }).from(apiKeys).where(eq(apiKeys.projectId, context.project.id)),
  ]);

  const production = stats.byEnvironment.find((env) => env.key === "production");

  return (
    <div>
      {/* Real numbers only — each links to where the user acts on them */}
      <dl className="grid grid-cols-3 gap-4">
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
          <dt className="text-xs text-text-secondary">Flags</dt>
          <dd className="mt-1 font-mono text-2xl font-medium text-text-primary tabular">
            {stats.totalFlags}
          </dd>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
          <dt className="text-xs text-text-secondary">Enabled in production</dt>
          <dd className="mt-1 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-medium text-text-primary tabular">
              {production?.enabled ?? 0}
            </span>
            <span className="font-mono text-xs text-text-muted tabular">
              of {production?.total ?? 0}
            </span>
          </dd>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
          <dt className="text-xs text-text-secondary">API keys</dt>
          <dd className="mt-1 font-mono text-2xl font-medium text-text-primary tabular">
            {keyCount?.count ?? 0}
          </dd>
        </div>
      </dl>

      {/* Environments */}
      <h2 className="mt-10 text-sm font-medium text-text-secondary">Environments</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-3">
        {stats.byEnvironment.map((env) => (
          <div
            key={env.key}
            className={
              env.protected
                ? "rounded-[var(--radius-card)] border border-accent/25 bg-surface p-5"
                : "rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5"
            }
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-medium">{env.name}</h3>
              {env.protected ? <Badge tone="accent">protected</Badge> : null}
            </div>
            <p className="mt-3 flex items-center gap-2 text-[13px] text-text-secondary">
              <span
                aria-hidden="true"
                className={
                  env.enabled > 0
                    ? "size-1.5 rounded-full bg-success"
                    : "size-1.5 rounded-full bg-border-strong"
                }
              />
              <span className="font-mono text-xs tabular">
                {env.enabled} / {env.total}
              </span>
              enabled
            </p>
            <p className="mt-3 font-mono text-xs text-text-muted">{env.key}</p>
          </div>
        ))}
      </div>

      {/* Recent activity teaser — full trail lives in Audit log */}
      <h2 className="mt-10 text-sm font-medium text-text-secondary">Recently changed flags</h2>
      <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] border border-border-subtle">
        {flagRows.length === 0 ? (
          <p className="px-4 py-8 text-center text-[13px] text-text-muted">
            No flags yet — create one to start rolling out.
          </p>
        ) : (
          <ul>
            {[...flagRows]
              .sort((a, b) => b.flag.updatedAt.getTime() - a.flag.updatedAt.getTime())
              .slice(0, 5)
              .map(({ flag }) => (
                <li
                  key={flag.id}
                  className="flex items-center justify-between border-b border-border-subtle px-4 py-3 text-[13px] last:border-0"
                >
                  <span className="font-mono text-accent">{flag.key}</span>
                  <span className="text-xs text-text-muted">{flag.name}</span>
                </li>
              ))}
          </ul>
        )}
      </div>

      <div className="mt-8 flex flex-wrap gap-4 text-[13px] text-text-secondary">
        <a
          href={`/project/${slug}/audit`}
          className="flex items-center gap-1.5 hover:text-text-primary"
        >
          <ScrollText aria-hidden="true" className="size-4" />
          View audit log
        </a>
        <a
          href={`/project/${slug}/keys`}
          className="flex items-center gap-1.5 hover:text-text-primary"
        >
          <KeyRound aria-hidden="true" className="size-4" />
          Manage API keys
        </a>
      </div>
    </div>
  );
}
