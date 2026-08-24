"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
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
  const [dismissedToken, setDismissedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Dialog is derived state: open while a fresh token exists and hasn't
  // been explicitly dismissed. No effects required.
  const revealed = Boolean(state.token) && state.token !== dismissedToken;

  async function copyToken(): Promise<void> {
    if (!state.token) return;
    await navigator.clipboard.writeText(state.token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function dismiss(): void {
    setDismissedToken(state.token ?? null);
    setCopied(false);
  }

  return (
    <>
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
              disabled={pending || Boolean(revealed)}
            />
          </div>
          <div className="min-w-40 space-y-1.5">
            <Label htmlFor="key-env">Environment</Label>
            <select
              id="key-env"
              name="environmentId"
              defaultValue={environments[0]?.id}
              disabled={pending || Boolean(revealed)}
              aria-label="Key environment"
              className="h-9.5 w-full cursor-pointer rounded-md border border-border bg-surface px-2 text-sm transition-colors hover:border-border-strong"
            >
              {environments.map((env) => (
                <option key={env.id} value={env.id}>
                  {env.name}
                </option>
              ))}
            </select>
          </div>
          {!revealed ? (
            <Button type="submit" loading={pending}>
              <KeyRound aria-hidden="true" className="size-4" />
              Create key
            </Button>
          ) : null}
        </div>
      </form>{" "}
      {/* One-time token reveal — the only place the secret ever appears */}
      <Dialog open={revealed && Boolean(state.token)}>
        <DialogContent
          title="API key created"
          description={`“${state.keyName ?? ""}” is ready. This token is stored only as a hash — copy it now; it will never be shown again.`}
          width={480}
          hideClose
          footer={
            <>
              <button
                type="button"
                onClick={() => void copyToken()}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-surface-raised px-3 text-sm text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
              >
                {copied ? (
                  <>
                    <Check aria-hidden="true" className="size-4 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" className="size-4" />
                    Copy
                  </>
                )}
              </button>
              <DialogClose asChild>
                <Button onClick={dismiss}>Done — I saved it</Button>
              </DialogClose>
            </>
          }
        >
          <code className="block overflow-x-auto rounded-md border border-border-subtle bg-canvas px-3 py-2.5 font-mono text-[13px] break-all text-accent select-all">
            {state.token}
          </code>
        </DialogContent>
      </Dialog>
    </>
  );
}
