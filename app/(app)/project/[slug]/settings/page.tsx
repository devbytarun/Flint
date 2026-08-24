import { notFound, redirect } from "next/navigation";

import { ArchiveProjectForm } from "@/components/projects/archive-project-form";
import { RenameProjectForm } from "@/components/projects/rename-project-form";
import { Card } from "@/components/ui/card";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProjectContext } from "@/server/services/project-service";

export const metadata = { title: "Settings" };

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getProjectContext(slug, user.id);
  if (!context) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-lg font-semibold tracking-tight">Settings</h1>

      <Card>
        <h2 className="font-medium">General</h2>
        <p className="mt-1 text-[13px] text-text-secondary">Visible to all project members.</p>
        <div className="mt-5">
          <RenameProjectForm
            slug={context.project.slug}
            name={context.project.name}
            description={context.project.description}
            canManage={context.canManage}
          />
        </div>
      </Card>

      <Card className="border-danger/25">
        <h2 className="font-medium text-danger">Danger zone</h2>
        <p className="mt-1 text-[13px] text-text-secondary">
          Archiving hides the project from all members and disables its API keys. The audit history
          is preserved. Only owners can archive.
        </p>
        {context.canAdminister ? (
          <div className="mt-5">
            <ArchiveProjectForm slug={context.project.slug} />
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-text-muted">
            You do not have owner permission to archive this project.
          </p>
        )}
      </Card>
    </div>
  );
}
