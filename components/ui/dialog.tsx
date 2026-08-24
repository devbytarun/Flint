"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Accessible dialog on Radix primitives, styled per DESIGN.md §11.
 * Enter/exit animations run through CSS keyed on Radix `data-state`
 * (globals.css `.flint-overlay` / `.flint-dialog`); Radix waits for
 * animationend before unmounting, so exits are not clipped.
 */

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  title,
  description,
  children,
  footer,
  width = 400,
  hideClose = false,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
  /** For flows where dismissing accidentally would lose data (e.g. token reveal). */
  hideClose?: boolean;
}) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="flint-overlay fixed inset-0 z-40 bg-canvas/70 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        style={{ "--dialog-w": `${width}px` } as CSSProperties}
        className={cn(
          "flint-dialog fixed left-1/2 top-1/2 z-50 w-full max-w-[min(92vw,var(--dialog-w))] rounded-[var(--radius-overlay)] border border-border-subtle bg-surface p-6 shadow-modal outline-none",
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <DialogPrimitive.Title className="text-[15px] font-semibold tracking-tight text-text-primary">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          {hideClose ? null : (
            <DialogPrimitive.Close
              aria-label="Close"
              className="-mr-1 -mt-1 cursor-pointer rounded-md p-1 text-text-muted transition-colors hover:bg-surface-raised hover:text-text-primary"
            >
              <X aria-hidden="true" className="size-4" />
            </DialogPrimitive.Close>
          )}
        </div>

        {children ? <div className="mt-4">{children}</div> : null}
        {footer ? <div className="mt-6 flex justify-end gap-2">{footer}</div> : null}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}
