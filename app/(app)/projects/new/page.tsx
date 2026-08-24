import Link from "next/link";

import { CreateProjectForm } from "@/components/projects/create-project-form";
import { Card } from "@/components/ui/card";

export const metadata = { title: "New project · Flint" };

export default function NewProjectPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <Card>
        <h1 className="text-lg font-semibold tracking-tight">Create a project</h1>
        <p className="mt-1 text-sm text-text-secondary">
          A project groups your flags, environments, and API keys. Development, Staging, and
          Production are provisioned automatically.
        </p>
        <div className="mt-6">
          <CreateProjectForm />
        </div>
      </Card>
      <p className="mt-4 text-center text-[13px] text-text-secondary">
        <Link href="/projects" className="hover:text-text-primary">
          ← Back to projects
        </Link>
      </p>
    </div>
  );
}
