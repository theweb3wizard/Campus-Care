"use client";

import { useRouter } from "next/navigation";

/** Inline data-failure block with retry. Never a blank list, never silent. */
export function QueryError({ message }: { message?: string }) {
  const router = useRouter();
  return (
    <div role="alert" className="rounded-2xl border border-[var(--destructive-fg)] bg-[var(--destructive-bg)] p-5 text-center">
      <p className="font-display text-lg font-semibold text-[var(--destructive-fg)]">Could not load this</p>
      <p className="mx-auto mt-1 max-w-md text-base text-[var(--destructive-fg)]">
        {message ?? "Check your connection and try again."}
      </p>
      <button
        type="button"
        onClick={() => router.refresh()}
        className="mx-auto mt-4 flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)]"
      >
        Try again
      </button>
    </div>
  );
}
