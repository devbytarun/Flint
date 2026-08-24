"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/field";
import { deleteFlagAction } from "@/server/actions/flags";

export function DeleteFlagForm({
  slug,
  flagKey,
  canManage,
  confirmFailed,
}: {
  slug: string;
  flagKey: string;
  canManage: boolean;
  confirmFailed?: boolean;
}) {
  return (
    <form action={deleteFlagAction} className="space-y-3">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="flagKey" value={flagKey} />

      {confirmFailed ? (
        <p role="alert" className="text-[13px] text-danger">
          Confirmation did not match the flag key.
        </p>
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="flag-delete-confirmation">Type the flag key to confirm</Label>
        <Input
          id="flag-delete-confirmation"
          name="confirmation"
          autoComplete="off"
          placeholder={flagKey}
          disabled={!canManage}
          className="max-w-xs font-mono"
        />
      </div>

      <Button variant="danger" type="submit" size="sm" disabled={!canManage}>
        Delete flag
      </Button>
    </form>
  );
}
