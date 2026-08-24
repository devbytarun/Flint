"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { RolloutBar } from "@/components/ui/rollout-bar";

/**
 * Progressive rollout visualization for the landing page: the percentage
 * climbs through realistic release phases while the bar tracks it.
 * Static at 25% under prefers-reduced-motion.
 */
const PHASES = [
  { percent: 0, caption: "Ship dark — nothing changes for users" },
  { percent: 10, caption: "First 10% — watch error rates" },
  { percent: 25, caption: "Confident? Ramp to a quarter" },
  { percent: 100, caption: "Fully rolled out. Or flip it off in one click." },
] as const;

export function RolloutDemo() {
  const reducedMotion = useReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(reducedMotion ? 3 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setPhaseIndex((index) => (index + 1) % PHASES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const phase = PHASES[phaseIndex];

  return (
    <div className="rounded-[var(--radius-overlay)] border border-border-subtle bg-surface p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="size-2 rounded-full bg-success" />
          <span className="font-mono text-sm text-text-primary">new_checkout</span>
          <span className="hidden rounded-full border border-border px-2 py-0.5 text-[11px] text-text-secondary sm:inline">
            production
          </span>
        </div>
        <motion.span
          key={phase.percent}
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          className="font-mono text-2xl font-medium text-accent tabular"
        >
          {phase.percent}%
        </motion.span>
      </div>

      <div className="mt-5">
        <RolloutBar percent={phase.percent} />
      </div>

      <p className="mt-4 min-h-5 text-[13px] text-text-secondary">{phase.caption}</p>
    </div>
  );
}
