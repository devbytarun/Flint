"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateProjectAction, type ProjectFormState } from "@/server/actions/projects";

export function RenameProjectForm({
  slug,
  name,
  description,
  canManage,
}: {
  slug: string;
  name: string;
  description: string | null;
  canManage: boolean;
}) {
  const [state, formAction, pending] = useActionState(updateProjectAction, {
    values: { name, description: description ?? "" },
  } satisfies ProjectFormState);

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

      <div className="space-y-1.5">
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={60}
          defaultValue={state.values?.name}
          disabled={!canManage || pending}
          invalid={Boolean(state.fieldErrors?.name)}
        />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          maxLength={300}
          defaultValue={state.values?.description}
          disabled={!canManage || pending}
          invalid={Boolean(state.fieldErrors?.description)}
        />
        <FieldError messages={state.fieldErrors?.description} />
      </div>

      <Button type="submit" size="sm" disabled={!canManage || pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
