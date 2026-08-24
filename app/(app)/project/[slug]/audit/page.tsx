import { notFound, redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/server/auth/current-user";
import { listRecentAuditLogs } from "@/server/services/audit-service";
import { getProjectContext } from "@/server/services/project-service";
import type { AuditLog } from "@/db/schema";

export const metadata = { title: "Audit log" };

function formatTimestamp(date: Date): string {
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function describeChanges(log: AuditLog): string | null {
  if (!log.changes) return null;
  const changes = log.changes as { before?: unknown; after?: unknown };
  const parts: string[] = [];
  if (changes.before !== undefined) {
    parts.push(JSON.stringify(changes.before));
  }
  if (changes.after !== undefined) {
    parts.push(JSON.stringify(changes.after));
  }
  return parts.join(" → ");
}

export default async function AuditLogPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getProjectContext(slug, user.id);
  if (!context) notFound();

  const logs = await listRecentAuditLogs(context.project.id);

  return (
    <div>
      <h2 className="text-sm font-medium text-text-secondary">Audit log</h2>
      <p className="mt-1 text-[13px] text-text-muted">
        Append-only record of configuration changes. Entries cannot be edited or removed.
      </p>

      {logs.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-border px-6 py-16 text-center">
          <p className="text-sm text-text-secondary">No events recorded yet.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-border-subtle">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle bg-surface-raised/60 text-xs text-text-secondary">
                <th className="px-4 py-2.5 font-medium">When</th>
                <th className="px-4 py-2.5 font-medium">Actor</th>
                <th className="px-4 py-2.5 font-medium">Action</th>
                <th className="px-4 py-2.5 font-medium">Resource</th>
                <th className="hidden px-4 py-2.5 font-medium md:table-cell">Change</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-border-subtle last:border-0 hover:bg-surface-raised/40"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-text-secondary">
                    {formatTimestamp(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">{log.actorEmail ?? "system"}</td>
                  <td className="px-4 py-3">
                    <Badge>{log.action}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {log.resourceLabel ?? log.resourceId}
                    {log.environmentKey ? (
                      <span className="ml-2 font-mono text-xs text-text-muted">
                        @{log.environmentKey}
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 font-mono text-xs text-text-muted md:table-cell">
                    {describeChanges(log)}
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
