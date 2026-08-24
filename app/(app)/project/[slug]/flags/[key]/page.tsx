import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { FlagConfigEditor as ConfigEditor } from "@/components/flags/config-editor";
import { Playground } from "@/components/flags/playground";
import { DeleteFlagForm } from "@/components/flags/delete-flag-form";
import { RenameFlagForm } from "@/components/flags/rename-flag-form";
import { Card } from "@/components/ui/card";
import type { TargetingRule } from "@/lib/evaluation";
import { getCurrentUser } from "@/server/auth/current-user";
import { getProjectContext } from "@/server/services/project-service";
import { getFlagForProject } from "@/server/services/flag-service";

export const metadata = { title: "Flag" };

export default async function FlagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; key: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ slug, key }, query] = await Promise.all([params, searchParams]);
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const context = await getProjectContext(slug, user.id);
  if (!context) notFound();

  const found = await getFlagForProject(context.project.id, key);
  if (!found) notFound();

  // Editor state keyed by environment id.
  const editorEnvironments = found.configs.map((config) => ({
    id: config.id,
    key: config.environmentKey,
    name:
      config.environmentKey.charAt(0).toUpperCase() + config.environmentKey.slice(1),
    protected: false,
  }));

  const initialConfigs: Record<
    string,
    {
      enabled: boolean;
      rolloutPercentage: number;
      rules: Array<{
        attribute: string;
        operator: TargetingRule["operator"];
        values: string[];
        serve: boolean;
      }>;
    }
  > = {};

  for (const config of found.configs) {
    initialConfigs[config.id] = {
      enabled: config.enabled,
      rolloutPercentage: config.rolloutPercentage,
      rules: (config.rules as TargetingRule[]) ?? [],
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-mono text-lg font-semibold tracking-tight text-accent">
          {found.flag.key}
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {found.flag.description || "No description"}
        </p>
      </div>

      <ConfigEditor
        slug={slug}
        flagKey={key}
        environments={editorEnvironments}
        initialConfigs={initialConfigs}
      />

      <Playground
        slug={slug}
        flagKey={key}
        environments={found.configs.map((config) => ({
          id: config.id,
          key: config.environmentKey,
          name:
            config.environmentKey.charAt(0).toUpperCase() +
            config.environmentKey.slice(1),
        }))}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="font-medium">Details</h3>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            The key is immutable; it identifies the flag everywhere.
          </p>
          <div className="mt-4">
            <RenameFlagForm
              slug={slug}
              flagKey={key}
              name={found.flag.name}
              description={found.flag.description}
              canManage={context.canManage}
            />
          </div>
        </Card>

        <Card className="border-danger/25">
          <h3 className="font-medium text-danger">Danger zone</h3>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            Deleting removes the flag and all environment configurations.
            Audit history is preserved.
          </p>
          <div className="mt-4">
            <DeleteFlagForm
              slug={slug}
              flagKey={key}
              canManage={context.canManage}
              confirmFailed={query.error === "confirm"}
            />
          </div>
        </Card>
      </div>

      <Link
        href={`/project/${slug}/flags`}
        className="inline-block text-[13px] text-text-secondary hover:text-text-primary"
      >
        ← Back to flags
      </Link>
    </div>
  );
}
