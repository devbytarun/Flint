import { cn } from "@/lib/utils";

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning" | "info";

const tones: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-raised text-text-secondary",
  accent: "border-accent/30 bg-accent-muted text-accent",
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/40 bg-danger/10 text-danger",
  warning: "border-warning/30 bg-warning/10 text-warning",
  info: "border-info/30 bg-info/10 text-info",
};

const roleTones: Record<string, BadgeTone> = {
  owner: "accent",
  admin: "success",
  member: "neutral",
};

export function Badge({
  children,
  tone,
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  const resolved = tone ?? roleTones[String(children)] ?? "neutral";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        tones[resolved],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Status dot + label. Text always accompanies color (a11y). */
export function StatusDot({
  on,
  label,
  className,
}: {
  on: boolean;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px]", className)}>
      <span
        aria-hidden="true"
        className={cn("size-1.5 rounded-full", on ? "bg-success" : "bg-border-strong")}
      />
      {label}
    </span>
  );
}

/** Maps an action name like "flag_config.updated" to a badge tone. */
export function actionTone(action: string): BadgeTone {
  if (action.endsWith(".deleted") || action.endsWith(".revoked")) return "danger";
  if (action.endsWith(".created")) return "success";
  return "neutral";
}
