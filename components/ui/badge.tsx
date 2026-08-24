import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "accent" | "success" | "danger";

const tones: Record<BadgeTone, string> = {
  neutral: "border-border bg-surface-raised text-text-secondary",
  accent: "border-accent/30 bg-accent-muted text-accent",
  success: "border-success/30 bg-success/10 text-success",
  danger: "border-danger/40 bg-danger/10 text-danger",
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
  const resolved =
    tone ??
    (children === "owner" || children === "admin" || children === "member"
      ? roleTones[String(children)]
      : "neutral");
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
