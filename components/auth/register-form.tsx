"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { FieldError, Label } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerAction, type AuthFormState } from "@/server/actions/auth";

const initialState: AuthFormState = {};

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialState);

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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          placeholder="Ada Lovelace"
          defaultValue={state.values?.name}
          invalid={Boolean(state.fieldErrors?.name)}
        />
        <FieldError messages={state.fieldErrors?.name} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          defaultValue={state.values?.email}
          invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError messages={state.fieldErrors?.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          placeholder="At least 10 characters"
          invalid={Boolean(state.fieldErrors?.password)}
        />
        <FieldError messages={state.fieldErrors?.password} />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
