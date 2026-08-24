"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

/**
 * Route error boundary (DESIGN.md §16): names the failure, offers retry.
 * The digest lets operators correlate with server logs.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <AlertTriangle aria-hidden="true" className="size-8 text-warning" />
      <h1 className="mt-4 text-lg font-semibold tracking-tight">This page couldn&apos;t load</h1>
      <p className="mt-2 text-[13px] leading-relaxed text-text-secondary">
        Something failed while loading this view. Your data is safe — retrying usually resolves it.
        {error.digest ? (
          <>
            {" "}
            Reference: <span className="font-mono text-text-muted">{error.digest}</span>
          </>
        ) : null}
      </p>
      <Button onClick={reset} variant="secondary" size="sm" className="mt-6">
        <RotateCcw aria-hidden="true" className="size-3.5" />
        Try again
      </Button>
    </div>
  );
}
