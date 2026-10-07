"use client";

import { motion, useReducedMotion } from "motion/react";

/** Tap feedback wrapper: scale 1 → 0.97 in 120ms. Inert when reduced motion is on. */
export function Pressable({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.span
      className={className}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.12, ease: [0.2, 0, 0, 1] }}
      style={{ display: "contents" }}
    >
      {children}
    </motion.span>
  );
}
