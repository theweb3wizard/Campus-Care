"use client";

import { motion, useReducedMotion } from "motion/react";
import { tokens } from "./tokens";

/** Fade-in status/error message. No shake, no auto-dismiss. */
export function StatusMessage({
  children,
  role = "status",
}: {
  children: React.ReactNode;
  role?: "status" | "alert";
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <p role={role} className="text-sm font-medium">
        {children}
      </p>
    );
  }
  return (
    <motion.p
      role={role}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: tokens.notice.duration, ease: tokens.notice.ease }}
      className="text-sm font-medium"
    >
      {children}
    </motion.p>
  );
}

/** Button spinner: rotate transform only. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={className ?? "size-4 animate-spin"}
      fill="none"
    >
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      <path d="M14.5 8A6.5 6.5 0 0 0 8 1.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
