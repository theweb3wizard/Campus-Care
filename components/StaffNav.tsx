"use client";

import Link from "next/link";

// Deprecated pill nav removed in favor of StaffShell (sidebar + drawer).
// This file now only exports StaffGate. Staff groups live in lib/staff.ts.

export function StaffGate({
  message,
  loginNext,
}: {
  message: string;
  loginNext: string;
}) {
  return (
    <div role="alert" className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <p className="font-medium">{message}</p>
      <p className="mt-3 text-sm">
        <Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="font-semibold underline">
          Log in with staff ID
        </Link>
        {" · "}
        <Link href="/profile" className="font-semibold underline">
          Back to profile
        </Link>
      </p>
    </div>
  );
}
