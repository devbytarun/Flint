"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";
import {
  playgroundEvaluateAction,
  type PlaygroundState,
} from "@/server/actions/flags";

const initialState: PlaygroundState = {};

export interface PlaygroundEnvironment {
  id: string;
  key: string;
  name: string;
}

export function Playground({
  slug,
  flagKey,
  environments,
}: {
  slug: string;
  flagKey: string;
  environments: PlaygroundEnvironment[];
}) {
  const [state, formAction, pending] = useActionState(playgroundEvaluateAction, initialState);

  return (
    <div className="rounded-[var(--radius-card)] border border-border-subtle bg-surface p-5">
      <h3 className="font-medium">Playground</h3>
      <p className="mt-0.5 text-[13px] text-text-secondary">
        Evaluate this flag with a sample context — same code path as the public API.
      </p>

      <form action={formAction} className="mt-4 grid gap-3 sm:grid-cols-4 sm:items-end">
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="flagKey" value={flagKey} />

        <div className="space-y-1.5">
          <Label htmlFor="playground-env">Environment</Label>
          <select
            id="playground-env"
            name="environmentId"
            defaultValue={environments[0]?.id}
            className="h-9.5 w-full cursor-pointer rounded-md border border-border bg-surface px-2 text-sm hover:border-border-strong"
          >
            {environments.map((env) => (
              <option key={env.id} value={env.id}>
                {env.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="targeting-key">Targeting key</Label>
          <Input id="targeting-key" name="targetingKey" placeholder="user_123" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="attributes">Attributes (JSON)</Label>
          <Input
            id="attributes"
            name="attributes"
            className="font-mono text-[13px]"
            placeholder='{"plan":"pro"}'
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Evaluating…" : "Evaluate"}
        </Button>
      </form>

      {state.error ? (
        <p
          role="alert"
          className="mt-3 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 font-mono text-[13px] text-danger"
        >
          {state.error}
        </p>
      ) : state.summary ? (
        <p className="mt-3 rounded-md border border-border-subtle bg-surface-raised/50 px-3 py-2 font-mono text-[13px]">
          <span className={state.summary === "ON" ? "text-success" : "text-text-secondary"}>
            {state.summary}
          </span>{" "}
          <span className="text-text-muted">{state.detail}</span>
        </p>
      ) : null}
    </div>
  );
}
