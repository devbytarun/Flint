import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProjectContext } from "@/server/services/project-service";
import { listFlagsWithEnvironments } from "@/server/services/flag-service";
import { toggleFlagAction } from "@/server/actions/flags";

export const metadata = { title: "Flags" };

function percentLabel(config: { enabled: boolean; rolloutPercentage: number }): string {
  if (!config.enabled) return "OFF";
  const pct = Math.round(config.rolloutPercentage / 100);
  return pct === 100 ? "ON" : `${pct}%`;
}

export default async function FlagsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getProjectContext(slug, user.id);
  if (!context) notFound();

  const { environments, rows } = await listFlagsWithEnvironments(context.project.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-text-secondary">Feature flags</h2>
          <p className="mt-1 text-[13px] text-text-muted">
            State per environment. Click a pill to toggle; click a name for full configuration.
          </p>
        </div>
        {context.canManage ? (
          <Link href={`/project/${slug}/flags/new`}>
            <Button size="sm">New flag</Button>
          </Link>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-border px-6 py-16 text-center">
          <h3 className="font-medium">No flags yet</h3>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            Flags start disabled everywhere. Flip them per environment when you are ready to ship.
          </p>
          {context.canManage ? (
            <Link href={`/project/${slug}/flags/new`} className="mt-5">
              <Button size="sm">Create your first flag</Button>
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-raised/60 text-xs text-text-secondary">
                <th className="px-4 py-2.5 font-medium">Flag</th>
                {environments.map((env) => (
                  <th key={env.id} className="px-4 py-2.5 font-medium">
                    {env.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ flag, configs }) => (
                <tr
                  key={flag.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/project/${slug}/flags/${flag.key}`}
                      className="font-mono text-accent hover:underline"
                    >
                      {flag.key}
                    </Link>
                    <span className="ml-2 text-text-muted">{flag.name}</span>
                  </td>
                  {environments.map((env) => {
                    const config = configs[env.id];
                    const state = config ? percentLabel(config) : "—";
                    const off = !config || !config.enabled;
                    return (
                      <td key={env.id} className="px-4 py-3">
                        {context.canManage && config ? (
                          <form action={toggleFlagAction}>
                            <input type="hidden" name="slug" value={slug} />
                            <input type="hidden" name="flagKey" value={flag.key} />
                            <input type="hidden" name="environmentId" value={env.id} />
                            <button
                              type="submit"
                              title={`Toggle ${flag.key} in ${env.key}`}
                              className={
                                off
                                  ? "inline-flex min-w-14 cursor-pointer justify-center rounded-full border border-border bg-surface-raised px-2 py-0.5 font-mono text-xs text-text-secondary transition-colors hover:border-danger/50 hover:text-danger"
                                  : "inline-flex min-w-14 cursor-pointer justify-center rounded-full border border-success/30 bg-success/10 px-2 py-0.5 font-mono text-xs text-success transition-colors hover:border-success/60"
                              }
                            >
                              {state}
                            </button>
                          </form>
                        ) : (
                          <Badge tone={!off ? "success" : "neutral"} className="font-mono">
                            {state}
                          </Badge>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
