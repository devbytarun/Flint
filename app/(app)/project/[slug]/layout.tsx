import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";

import { AppHeader } from "@/components/app/app-header";
import { ProjectNav } from "@/components/navigation/project-nav";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProjectContext } from "@/server/services/project-service";

/**
 * Authenticated workspace shell. The session is resolved server-side here
 * and project access once for all nested routes; non-members receive a
 * 404 so project existence stays private.
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
    <div className="flex min-h-svh flex-col">
      <AppHeader user={user}>
        <span
          className="hidden items-center gap-2 sm:flex"
          title={context.project.description ?? undefined}
        >
          <span className="font-mono text-[13px] text-text-primary">{context.project.name}</span>
          <span className="text-xs text-text-muted">/{context.project.slug}</span>
        </span>
      </AppHeader>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 lg:flex-row">
        <div className="lg:-ml-0">
          <ProjectNav slug={slug} />
        </div>
        <main className="min-w-0 flex-1 py-8 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
