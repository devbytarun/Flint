import Link from "next/link";

import type { ProjectSummary } from "@/server/services/project-service";
import { Badge } from "@/components/ui/badge";

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ProjectCard({ project }: { project: ProjectSummary }) {
  return (
    <Link
      href={`/project/${project.slug}`}
      className="group flex flex-col rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5 transition-colors hover:border-border-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium tracking-tight text-text-primary group-hover:text-accent">
          {project.name}
        </h3>
        <Badge>{project.role}</Badge>
      </div>
      <p className="mt-2 line-clamp-2 min-h-10 text-[13px] text-text-secondary">
        {project.description || "No description"}
      </p>
      <p className="mt-4 font-mono text-xs text-text-muted">
        Created {formatDate(project.createdAt)}
      </p>
    </Link>
  );
}
