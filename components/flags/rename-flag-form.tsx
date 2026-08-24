"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateFlagDetailsAction } from "@/server/actions/flags";

export function RenameFlagForm({
  slug,
  flagKey,
  name,
  description,
  canManage,
}: {
  slug: string;
  flagKey: string;
  name: string;
  description: string | null;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateFlagDetailsAction, {
    values: { name },
  });

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p
          role="alert"
          className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger"
        >
          {state.error}
        </p>
      ) : null}

      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="flagKey" value={flagKey} />

      <div className="space-y-1.5">
        <Label htmlFor="flag-name">Display name</Label>
        <Input
          id="flag-name"
          name="name"
          defaultValue={state.values?.name ?? name}
          maxLength={120}
          disabled={!canManage || pending}
        />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="flag-description">Description</Label>
        <Input
          id="flag-description"
          name="description"
          defaultValue={description ?? ""}
          maxLength={500}
          disabled={!canManage || pending}
        />
        <FieldError messages={state.fieldErrors?.description} />
      </div>

      <Button type="submit" size="sm" variant="secondary" disabled={!canManage || pending}>
        {pending ? "Saving…" : "Save details"}
      </Button>
    </form>
  );
}
