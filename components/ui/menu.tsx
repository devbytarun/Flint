"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;

const contentClasses =
  "flint-menu z-50 min-w-44 overflow-hidden rounded-[var(--radius-overlay)] border border-border-subtle bg-overlay p-1 shadow-pop " +
  "data-[state=open]:animate-[flint-fade-in_120ms_ease-out]";

const itemBase =
  "flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-2 text-[13px] text-text-secondary outline-none transition-colors hover:bg-surface-raised hover:text-text-primary data-[disabled]:pointer-events-none data-[disabled]:opacity-50";

export function MenuContent({
  children,
  align = "end",
  className,
}: {
  children: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
}) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={6}
        className={cn(contentClasses, className)}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  );
}

export function MenuItem({
  children,
  onSelect,
  danger = false,
}: {
  children: ReactNode;
  onSelect?: () => void;
  danger?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Item
      onSelect={onSelect}
      className={cn(itemBase, danger && "text-danger hover:bg-danger/10 hover:text-danger")}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  );
}
