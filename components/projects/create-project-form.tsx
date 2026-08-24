"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createProjectAction, type ProjectFormState } from "@/server/actions/projects";

const initialState: ProjectFormState = {};

export function CreateProjectForm() {
  const [state, formAction, pending] = useActionState(createProjectAction, initialState);

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

      <div className="space-y-1.5">
        <Label htmlFor="name">Project name</Label>
        <Input
          id="name"
          name="name"
          required
          minLength={2}
          maxLength={60}
          placeholder="Acme Web"
          defaultValue={state.values?.name}
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
          placeholder="What are you shipping?"
          defaultValue={state.values?.description}
          invalid={Boolean(state.fieldErrors?.description)}
        />
        <FieldError messages={state.fieldErrors?.description} />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating…" : "Create project"}
      </Button>
    </form>
  );
}
