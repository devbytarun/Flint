import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Empty state pattern per DESIGN.md §16:
 * what is missing + why it matters + primary action when permitted.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-border px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? <div className="text-text-muted">{icon}</div> : null}
      <h3 className="mt-3 font-medium text-text-primary">{title}</h3>
      <p className="mt-1 max-w-sm text-[13px] leading-relaxed text-text-secondary">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
