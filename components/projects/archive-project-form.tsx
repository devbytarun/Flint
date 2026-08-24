"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { archiveProjectAction, type ArchiveFormState } from "@/server/actions/projects";

const initialState: ArchiveFormState = {};

export function ArchiveProjectForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(archiveProjectAction, initialState);

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
        <Label htmlFor="confirmation">Type the project name to confirm archiving</Label>
        <Input
          id="confirmation"
          name="confirmation"
          autoComplete="off"
          placeholder="Project name"
          disabled={pending}
        />
        <FieldError messages={[state.error].filter(Boolean) as string[]} />
      </div>

      <Button variant="danger" type="submit" size="sm" disabled={pending}>
        {pending ? "Archiving…" : "Archive project"}
      </Button>
    </form>
  );
}
