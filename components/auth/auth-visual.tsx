"use client";

import { motion, useReducedMotion } from "motion/react";
import { GitBranch, ShieldCheck, Target } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * Auth split-screen visual: Flint's core idea — progressive rollout —
 * rendered as a 10×10 user-bucket grid filling in phases.
 * Honors prefers-reduced-motion by rendering one static state.
 */

const GRID_SIZE = 100;
const PHASES = [
  { percent: 10, caption: "Roll out to 10% of users" },
  { percent: 25, caption: "Ramp to 25% when metrics look good" },
  { percent: 60, caption: "Expand confidently to 60%" },
] as const;

const POINTS = [
  { icon: ShieldCheck, text: "Instant kill switches" },
  { icon: Target, text: "Target the exact users you want" },
  { icon: GitBranch, text: "Isolated environments" },
];

export function AuthVisual() {
  const reducedMotion = useReducedMotion();
  const [phaseIndex, setPhaseIndex] = useState(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = setInterval(() => {
      setPhaseIndex((index) => (index + 1) % PHASES.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [reducedMotion]);

  const phase = PHASES[phaseIndex];
  const filledCount = Math.round((phase.percent / 100) * GRID_SIZE);

  return (
    <div className="flex h-full flex-col justify-between">
      <div>
        <h2 className="max-w-sm text-2xl font-semibold leading-snug tracking-tight text-text-primary">
          Ship features with control.
        </h2>
        <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-text-secondary">
          Progressive rollouts, precise targeting, and instant kill switches — without redeploying.
        </p>
      </div>

      {/* Bucket grid */}
      <div aria-hidden="true" className="my-8">
        <div className="grid w-full max-w-[300px] grid-cols-10 gap-[5px]">
          {Array.from({ length: GRID_SIZE }, (_, index) => {
            const filled = index < filledCount;
            return (
              <motion.span
                key={index}
                initial={false}
                animate={{
                  backgroundColor: filled ? "var(--color-accent)" : "var(--color-surface-raised)",
                  scale: filled ? 1 : 0.85,
                }}
                transition={{
                  duration: reducedMotion ? 0 : 0.25,
                  delay: reducedMotion ? 0 : Math.abs(index - filledCount) * 0.004,
                  ease: "easeOut",
                }}
                className="aspect-square rounded-[3px]"
              />
            );
          })}
        </div>

        <div
          className="mt-4 flex items-baseline justify-between font-mono text-xs text-text-muted tabular"
          style={{ maxWidth: 300 }}
        >
          <motion.span
            key={`caption-${phaseIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.3 }}
          >
            {phase.caption}
          </motion.span>
          <span className="text-accent">{phase.percent}%</span>
        </div>
      </div>

      <ul className="space-y-2.5">
        {POINTS.map((point) => (
          <li
            key={point.text}
            className="flex items-center gap-2.5 text-[13px] text-text-secondary"
          >
            <point.icon aria-hidden="true" className="size-4 text-accent" />
            {point.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
