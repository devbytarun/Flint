import { cn } from "@/lib/utils";

/**
 * Rollout visualization (DESIGN.md §11 / prompt §11): a restrained track
 * showing the configured share, with quarter ticks for orientation.
 * Server-safe; the landing page wraps it in Motion for entrance timing.
 */
export function RolloutBar({
  percent,
  disabled = false,
  showTicks = true,
  className,
}: {
  /** 0–100 */
  percent: number;
  /** Renders the track empty (flag off) while keeping layout stable. */
  disabled?: boolean;
  showTicks?: boolean;
  className?: string;
}) {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn("w-full", className)}>
      <div
        role="img"
        aria-label={disabled ? "Flag disabled" : `Rolling out to ${clamped}% of users`}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-raised"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300 ease-out",
            disabled ? "bg-border-strong" : "bg-accent",
          )}
          style={{ width: `${disabled ? 0 : clamped}%` }}
        />
      </div>
      {showTicks ? (
        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-text-muted tabular">
          <span>0%</span>
          <span>25%</span>
          <span>50%</span>
          <span>75%</span>
          <span>100%</span>
        </div>
      ) : null}
    </div>
  );
}
