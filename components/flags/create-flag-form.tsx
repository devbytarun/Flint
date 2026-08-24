"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createFlagAction,
  type FlagFormState,
} from "@/server/actions/flags";

const initialState: FlagFormState = {};

export function CreateFlagForm({ slug }: { slug: string }) {
  const [state, formAction, pending] = useActionState(createFlagAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {state.error}
        </p>
      ) : null}

      <input type="hidden" name="slug" value={slug} />

      <div className="space-y-1.5">
        <Label htmlFor="key">Key</Label>
        <Input
          id="key"
          name="key"
          required
          className="font-mono"
          placeholder="new_checkout"
          pattern="[a-z0-9_]+"
          invalid={Boolean(state.fieldErrors?.key)}
        />
        <p className="text-xs text-text-muted">Lowercase letters, digits, underscores. Immutable after creation.</p>
        <FieldError messages={state.fieldErrors?.key} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={120}
          placeholder="New checkout flow"
          invalid={Boolean(state.fieldErrors?.name)}
        />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Input
          id="description"
          name="description"
          maxLength={500}
          placeholder="What does this flag control?"
          invalid={Boolean(state.fieldErrors?.description)}
        />
        <FieldError messages={state.fieldErrors?.description} />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create flag"}
      </Button>
    </form>
  );
}
