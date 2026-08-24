import { ScrollText } from "lucide-react";
import { notFound, redirect } from "next/navigation";

import { Badge, actionTone } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current-user";
import { listDistinctActions, listRecentAuditLogs } from "@/server/services/audit-service";
import { getProjectContext, listEnvironmentsForProject } from "@/server/services/project-service";
import { relativeTime } from "@/lib/relative-time";

export const metadata = { title: "Audit log" };

/** "flag_config.updated" → { verb: "updated", subject: "flag config" } */
function describeAction(action: string): { verb: string; subject: string } {
  const [resource, event = ""] = action.split(".");
  const subjects: Record<string, string> = {
    project: "project",
    flag: "flag",
    flag_config: "flag config",
    api_key: "API key",
  };
  return { verb: event || action, subject: subjects[resource] ?? resource };
}

export default async function AuditLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ env?: string; action?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getProjectContext(slug, user.id);
  if (!context) notFound();

  // Filters arrive as GET params — plain links/forms keep this server-only.
  const environmentKey = query.env?.trim() || undefined;
  const actionFilter = query.action?.trim() || undefined;

  const [logs, environments, actions] = await Promise.all([
    listRecentAuditLogs(context.project.id, {
      environmentKey,
      action: actionFilter,
    }),
    listEnvironmentsForProject(context.project.id),
    listDistinctActions(context.project.id),
  ]);

  const activeFilters = Boolean(environmentKey) || Boolean(actionFilter);

  return (
    <div>
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-[13px] text-text-muted">
          Append-only record of configuration changes — entries can&apos;t be edited or removed.
        </p>
      </div>

      {/* Filter bar (plain GET form — works without JavaScript) */}
      <form
        method="get"
        className="mt-6 flex flex-wrap items-center gap-2"
        aria-label="Filter audit events"
      >
        <select
          name="env"
          defaultValue={environmentKey ?? ""}
          aria-label="Filter by environment"
          className="h-9 cursor-pointer rounded-md border border-border bg-surface px-2 text-[13px] transition-colors hover:border-border-strong"
        >
          <option value="">All environments</option>
          {environments.map((env) => (
            <option key={env.id} value={env.key}>
              {env.name}
            </option>
          ))}
        </select>

        <select
          name="action"
          defaultValue={actionFilter ?? ""}
          aria-label="Filter by action"
          className="h-9 cursor-pointer rounded-md border border-border bg-surface px-2 text-[13px] transition-colors hover:border-border-strong"
        >
          <option value="">All actions</option>
          {actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        <Button type="submit" variant="secondary" size="sm">
          Apply
        </Button>
        {activeFilters ? (
          <a href={`/project/${slug}/audit`}>
            <Button variant="ghost" size="sm">
              Clear
            </Button>
          </a>
        ) : null}
      </form>

      <div className="mt-6">
        {logs.length === 0 ? (
          <EmptyState
            icon={<ScrollText aria-hidden="true" className="size-7" />}
            title={activeFilters ? "No matching events" : "No events recorded yet"}
            description={
              activeFilters
                ? "Nothing matches these filters. Clear them to see the full history."
                : "Changes you make to flags, configurations, and keys will appear here automatically."
            }
          />
        ) : (
          <ol className="space-y-0 overflow-hidden rounded-[var(--radius-card)] border border-border-subtle">
            {logs.map((log, index) => {
              const isLast = index === logs.length - 1;
              const { verb, subject } = describeAction(log.action);
              const diff = log.changes as { before?: unknown; after?: unknown } | null;

              return (
                <li
                  key={log.id}
                  className={`flex gap-4 px-4 py-3.5 transition-colors hover:bg-surface-raised/40 ${isLast ? "" : "border-b border-border-subtle"}`}
                >
                  {/* Timeline rail */}
                  <span aria-hidden="true" className="flex flex-col items-center pt-1">
                    <span className="size-2 shrink-0 rounded-full bg-border-strong" />
                    {!isLast ? <span className="w-px flex-1 bg-border-subtle" /> : null}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] leading-relaxed">
                      <span className="font-medium text-text-primary">
                        {log.actorEmail ?? "system"}
                      </span>{" "}
                      <span className="text-text-secondary">{verb}</span>{" "}
                      <Badge tone={actionTone(log.action)}>{subject}</Badge>{" "}
                      {log.resourceLabel ? (
                        <span className="font-mono text-xs text-text-primary">
                          {log.resourceLabel}
                        </span>
                      ) : null}
                      {log.environmentKey ? (
                        <span className="ml-1.5 font-mono text-xs text-text-muted">
                          @{log.environmentKey}
                        </span>
                      ) : null}
                    </p>

                    {diff && (diff.before !== undefined || diff.after !== undefined) ? (
                      <details className="group mt-1.5">
                        <summary className="cursor-pointer select-none text-xs text-text-muted hover:text-text-secondary">
                          View change
                        </summary>
                        <pre className="mt-1.5 overflow-x-auto rounded-md border border-border-subtle bg-canvas p-2.5 font-mono text-[11px] leading-relaxed text-text-secondary">
                          {JSON.stringify(diff, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>

                  <time
                    dateTime={log.createdAt.toISOString()}
                    title={log.createdAt.toLocaleString("en-US")}
                    className="shrink-0 whitespace-nowrap pt-0.5 text-xs text-text-muted"
                  >
                    {relativeTime(log.createdAt)}
                  </time>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
