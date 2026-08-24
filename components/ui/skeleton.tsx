import { cn } from "@/lib/utils";

/** Route-level loading skeleton building block (mirrors final layout). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}
