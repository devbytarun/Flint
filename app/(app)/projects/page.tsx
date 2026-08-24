import Link from "next/link";
import { redirect } from "next/navigation";

import { ProjectCard } from "@/components/projects/project-card";
import { Button } from "@/components/ui/button";
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

      {projects.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border px-6 py-20 text-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="text-text-muted"
          >
            <path
              d="M12 1.5 15 9l7.5 3L15 15l-3 7.5L9 15 1.5 12 9 9l3-7.5Z"
              fill="currentColor"
              opacity="0.4"
            />
          </svg>
          <h2 className="mt-4 font-medium">No projects yet</h2>
          <p className="mt-1 max-w-sm text-sm text-text-secondary">
            Projects isolate flags and environments per application. You can invite teammates later.
          </p>
          <Link href="/projects/new" className="mt-6">
            <Button>Create your first project</Button>
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
