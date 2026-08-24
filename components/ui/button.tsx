import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-accent text-canvas font-medium hover:bg-accent-hover disabled:hover:bg-accent",
  secondary:
    "bg-surface-raised text-text-primary border border-border hover:border-border-strong hover:bg-overlay",
  ghost: "text-text-secondary hover:text-text-primary hover:bg-surface-raised",
  danger: "bg-transparent border border-danger/40 text-danger hover:bg-danger/10",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-9.5 px-4 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  type = "button",
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "inline-flex cursor-pointer items-center justify-center gap-2 rounded-md transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
}
