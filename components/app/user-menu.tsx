"use client";

import { ChevronDown, LogOut } from "lucide-react";

import { DropdownMenu, DropdownMenuTrigger, MenuContent, MenuItem } from "@/components/ui/menu";
import { logoutAction } from "@/server/actions/auth";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-1.5 py-1 transition-colors hover:border-border hover:bg-surface-raised data-[state=open]:border-border data-[state=open]:bg-surface-raised"
      >
        <span
          aria-hidden="true"
          className="flex size-7 items-center justify-center rounded-full border border-border bg-surface-raised text-[11px] font-medium text-text-secondary"
        >
          {initials || "U"}
        </span>
        <span className="hidden max-w-32 truncate text-[13px] text-text-secondary sm:inline">
          {name}
        </span>
        <ChevronDown aria-hidden="true" className="size-3.5 text-text-muted" />
      </DropdownMenuTrigger>

      <MenuContent>
        <div className="px-2.5 py-2">
          <p className="truncate text-[13px] font-medium text-text-primary">{name}</p>
          <p className="mt-0.5 truncate text-xs text-text-muted">{email}</p>
        </div>
        <div className="my-1 h-px bg-border-subtle" />
        <MenuItem
          danger
          onSelect={() => {
            void logoutAction();
          }}
        >
          <LogOut aria-hidden="true" className="size-3.5" />
          Sign out
        </MenuItem>
      </MenuContent>
    </DropdownMenu>
  );
}
