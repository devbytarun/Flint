"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";
import { createApiKeyAction } from "@/server/actions/api-keys";

const initialState: Awaited<ReturnType<typeof createApiKeyAction>> = {};
export interface KeyEnvironment {
  id: string;
  key: string;
  name: string;
}

export function CreateApiKeyForm({
  slug,
  environments,
}: {
  slug: string;
  environments: KeyEnvironment[];
}) {
  const [state, formAction, pending] = useActionState(createApiKeyAction, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />

      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-44 flex-1 space-y-1.5">
          <Label htmlFor="key-name">Key name</Label>
          <Input
            id="key-name"
            name="name"
            required
            maxLength={80}
            placeholder="web-backend"
            disabled={pending || Boolean(state.token)}
          />
        </div>
        <div className="min-w-40 space-y-1.5">
          <Label htmlFor="key-env">Environment</Label>
          <select
            id="key-env"
            name="environmentId"
            defaultValue={environments[0]?.id}
            disabled={pending || Boolean(state.token)}
            className="h-9.5 w-full cursor-pointer rounded-md border border-border bg-surface px-2 text-sm hover:border-border-strong"
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>
        {!state.token ? (
          <Button type="submit" size="md" disabled={pending}>
            {pending ? "Creating…" : "Create key"}
          </Button>
        ) : null}
      </div>

      {state.token ? (
        <div
          role="status"
          className="rounded-[var(--radius-card)] border border-accent/40 bg-accent-muted/40 p-4"
        >
          <p className="text-[13px] font-medium text-accent">
            “{state.keyName}” created — copy the token now, it will not be shown again.
          </p>
          <code className="mt-2 block overflow-x-auto rounded-md border border-border-subtle bg-canvas px-3 py-2 font-mono text-[13px] text-text-primary">
            {state.token}
          </code>
          <Button type="submit" variant="ghost" size="sm" className="mt-2">
            Done — create another key
          </Button>
        </div>
      ) : null}
    </form>
  );
}
