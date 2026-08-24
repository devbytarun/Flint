import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function Input({ className, invalid, ...props }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(
        "h-9.5 w-full rounded-md border bg-surface px-3 text-sm text-text-primary",
        "placeholder:text-text-muted",
        "transition-colors focus:border-accent/60 focus:outline-none",
        invalid ? "border-danger/60" : "border-border hover:border-border-strong",
        className,
      )}
      {...props}
    />
  );
}
