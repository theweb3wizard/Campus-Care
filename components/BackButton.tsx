"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

/** Back to the previous page. Falls back to `fallback` when history is empty. */
export function BackButton({
  fallback = "/",
  label = "Back",
  className,
}: {
  fallback?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  function onClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallback);
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go back to previous page"
      className={
        className ??
        "print-hidden inline-flex h-11 min-h-[44px] items-center gap-1 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold hover:bg-[var(--background)]"
      }
    >
      <ChevronLeft size={20} aria-hidden />
      {label}
    </button>
  );
}
