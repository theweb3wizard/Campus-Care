"use client";

import { useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "motion/react";
import { tokens } from "./tokens";

function subscribe() {
  return () => {};
}

/**
 * Single-shot reveal for landing only (max 2 per page).
 * Renders content visibly first, enables animation only after hydration,
 * so pre-hydration states never hide anything.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted || reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: tokens.reveal.duration, ease: tokens.reveal.ease, delay }}
    >
      {children}
    </motion.div>
  );
}
