import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border-subtle bg-surface p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}
