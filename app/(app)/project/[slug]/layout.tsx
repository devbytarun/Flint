import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { TabNav } from "@/components/navigation/tab-nav";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProjectContext } from "@/server/services/project-service";

/**
 * Workspace shell: resolves project access once for every nested route.
 * Non-members receive a 404 (not 403) so project existence stays private.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getProjectContext(slug, user.id);
  if (!context) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight">{context.project.name}</h1>
            <Badge>{context.role}</Badge>
          </div>
          {context.project.description ? (
            <p className="mt-1 max-w-xl text-sm text-text-secondary">
              {context.project.description}
            </p>
          ) : null}
        </div>
        <p className="font-mono text-xs text-text-muted">/{context.project.slug}</p>
      </div>

      <div className="mt-6 border-b border-border-subtle pb-2">
        <TabNav
          items={[
            { href: `/project/${slug}`, label: "Overview" },
            { href: `/project/${slug}/flags`, label: "Flags" },
            { href: `/project/${slug}/keys`, label: "API keys" },
            { href: `/project/${slug}/audit`, label: "Audit log" },
            { href: `/project/${slug}/settings`, label: "Settings" },
          ]}
        />
      </div>

      <div className="mt-8">{children}</div>
    </div>
  );
}
