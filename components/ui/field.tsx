import type { LabelHTMLAttributes } from "react";

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={`text-[13px] font-medium text-text-secondary ${className ?? ""}`}
      {...props}
    />
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p role="alert" className="text-xs text-danger">
      {messages[0]}
    </p>
  );
}
