import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center px-6 text-center">
      <p className="font-mono text-sm text-accent">404</p>
      <h1 className="mt-3 text-xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        The link may be outdated, or you may not have access to this resource.
      </p>
      <Link href="/projects" className="mt-6">
        <Button variant="secondary" size="sm">
          Back to projects
        </Button>
      </Link>
    </div>
  );
}
