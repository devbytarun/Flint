"use client";

import { Flag, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { RolloutBar } from "@/components/ui/rollout-bar";
import { relativeTime } from "@/lib/relative-time";
import { toggleFlagAction } from "@/server/actions/flags";

export interface MatrixEnvironment {
  id: string;
  key: string;
  name: string;
  protected: boolean;
}

export interface MatrixRow {
  flagKey: string;
  flagName: string;
  updatedAt: string; // ISO string
  configs: Record<string, { enabled: boolean; rolloutPercentage: number } | undefined>;
}

/**
 * The flags matrix: one row per flag, one column per environment.
 * Client-side because search/filtering is instant interaction; all data is
 * server-fetched and scoped before it gets here.
 */
export function FlagsMatrix({
  slug,
  environments,
  rows,
  canManage,
}: {
  slug: string;
  environments: MatrixEnvironment[];
  rows: MatrixRow[];
  canManage: boolean;
}) {
  const [query, setQuery] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(flagKey: string, environmentId: string): void {
    const formData = new FormData();
    formData.set("slug", slug);
    formData.set("flagKey", flagKey);
    formData.set("environmentId", environmentId);
    setPendingKey(`${flagKey}:${environmentId}`);
    startTransition(async () => {
      await toggleFlagAction(formData);
      setPendingKey(null);
    });
  }

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.flagKey.toLowerCase().includes(needle) || row.flagName.toLowerCase().includes(needle),
    );
  }, [rows, query]);

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Flag aria-hidden="true" className="size-7" />}
        title="No flags yet"
        description="Flags start disabled in every environment. Flip them per environment when you're ready to ship."
      />
    );
  }

  return (
    <div>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by key or name…"
          aria-label="Filter flags"
          className="h-9 w-full max-w-xs rounded-md border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-text-muted focus:border-accent/60 focus:outline-none"
        />
      </div>

      <div className="mt-4 overflow-x-auto rounded-[var(--radius-card)] border border-border-subtle">
        <table className="w-full min-w-[640px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-raised/60 text-xs text-text-secondary">
              <th scope="col" className="px-4 py-2.5 font-medium">
                Flag
              </th>
              {environments.map((env) => (
                <th key={env.id} scope="col" className="px-4 py-2.5 font-medium">
                  <span className="flex items-center gap-1.5">
                    {env.name}
                    {env.protected ? (
                      <span
                        aria-label="(protected environment)"
                        title="Protected environment — production traffic"
                        className="inline-block size-1.5 rounded-full bg-accent"
                      />
                    ) : null}
                  </span>
                </th>
              ))}
              <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">
                Updated
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={environments.length + 2}
                  className="px-4 py-10 text-center text-text-muted"
                >
                  No flags match “{query.trim()}”.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.flagKey}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/40"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/project/${slug}/flags/${row.flagKey}`}
                      className="font-mono text-[13px] text-accent hover:underline"
                    >
                      {row.flagKey}
                    </Link>
                    <span className="ml-2 text-text-muted">{row.flagName}</span>
                  </td>
                  {environments.map((env) => {
                    const config = row.configs[env.id];
                    if (!config) {
                      return (
                        <td key={env.id} className="px-4 py-3 text-text-muted">
                          —
                        </td>
                      );
                    }
                    const pct = Math.round(config.rolloutPercentage / 100);
                    const label = !config.enabled ? "Off" : pct === 100 ? "On" : `${pct}%`;
                    return (
                      <td key={env.id} className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className={
                              config.enabled && pct > 0
                                ? "size-1.5 shrink-0 rounded-full bg-success"
                                : "size-1.5 shrink-0 rounded-full bg-border-strong"
                            }
                          />
                          <span className="w-12 shrink-0 font-mono text-xs tabular">{label}</span>
                          <div className="hidden w-20 sm:block">
                            <RolloutBar
                              percent={pct}
                              disabled={!config.enabled}
                              showTicks={false}
                            />
                          </div>
                        </div>
                        {canManage ? (
                          <button
                            type="button"
                            disabled={pendingKey === `${row.flagKey}:${env.id}`}
                            onClick={() => toggle(row.flagKey, env.id)}
                            data-tooltip={`Toggle ${label} in ${env.name}`}
                            className="mt-1.5 cursor-pointer rounded border border-transparent px-1 text-[11px] text-text-muted transition-colors hover:border-border hover:text-text-secondary disabled:opacity-50"
                          >
                            toggle
                          </button>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="hidden whitespace-nowrap px-4 py-3 text-text-muted md:table-cell">
                    {relativeTime(new Date(row.updatedAt))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
