"use client";

import { cn } from "@/lib/utils";

/**
 * Accessible switch (DESIGN.md §19): role=switch, aria-checked, and an
 * accessible name that always includes the target ("… in production").
 */
export function Switch({
  checked,
  onToggle,
  label,
  disabled = false,
  className,
}: {
  checked: boolean;
  onToggle: () => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-150",
        checked ? "bg-success/80" : "bg-border-strong",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-0.5 size-5 rounded-full bg-canvas transition-transform duration-150 ease-out",
          checked ? "translate-x-[22px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
