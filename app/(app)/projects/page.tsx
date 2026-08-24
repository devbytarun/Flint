import { Boxes } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getCurrentUser } from "@/server/auth/current-user";
import { listProjectsForUser } from "@/server/services/project-service";

export const metadata = { title: "Projects · Flint" };

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const projects = await listProjectsForUser(user.id);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-text-secondary">
            {projects.length === 0
              ? "Create your first project to start shipping."
              : `${projects.length} project${projects.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Link href="/projects/new">
          <Button size="sm">New project</Button>
        </Link>
      </div>

      <div className="mt-8">
        {projects.length === 0 ? (
          <EmptyState
            icon={<Boxes aria-hidden="true" className="size-7" />}
            title="No projects yet"
            description="Projects isolate flags and environments per application. Development, staging, and production are provisioned automatically."
            action={
              <Link href="/projects/new">
                <Button size="sm">Create your first project</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
