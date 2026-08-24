import Link from "next/link";

import { CreateFlagForm } from "@/components/flags/create-flag-form";
import { Card } from "@/components/ui/card";

export const metadata = { title: "New flag" };

export default async function NewFlagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="mx-auto max-w-md">
      <Card>
        <h2 className="text-lg font-semibold tracking-tight">Create a flag</h2>
        <p className="mt-1 text-sm text-text-secondary">It starts disabled in every environment.</p>
        <div className="mt-6">
          <CreateFlagForm slug={slug} />
        </div>
      </Card>
      <p className="mt-4 text-center text-[13px] text-text-secondary">
        <Link href={`/project/${slug}/flags`} className="hover:text-text-primary">
          ← Back to flags
        </Link>
      </p>
    </div>
  );
}
