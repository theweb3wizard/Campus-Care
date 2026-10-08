"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function LogoutButton({ label = "Log out", className }: { label?: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function onClick() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // still leave — session cookie clears on refresh
    } finally {
      router.push("/login");
      router.refresh();
    }
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        className ??
        "flex h-12 min-h-[48px] items-center justify-center rounded-[10px] border border-[var(--border)] px-6 text-base font-semibold disabled:opacity-60"
      }
    >
      {busy ? "Logging out…" : label}
    </button>
  );
}

export function UserMenu({
  user,
}: {
  user: { full_name: string; role: string; login_id: string } | null;
}) {
  const [open, setOpen] = useState(false);
  if (!user) {
    return (
      <Link
        href="/login"
        className="flex h-11 min-h-[44px] items-center whitespace-nowrap rounded-full border border-[var(--border)] px-4 text-sm font-semibold sm:h-12 sm:px-5 sm:text-base"
      >
        Log in
      </Link>
    );
  }
  const initial = (user.full_name || user.login_id || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${user.full_name}, ${user.role}. Open account menu`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border border-[var(--border)] px-3 text-sm font-semibold sm:h-12 sm:px-4 sm:text-base"
      >
        <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]">
          {initial}
        </span>
        <span className="hidden max-w-24 truncate lg:inline">{user.full_name}</span>
        <span className="hidden rounded-full bg-[var(--background)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)] sm:inline">
          {user.role}
        </span>
      </button>
      {open ? (
        <>
          <button
            type="button"
            aria-label="Close account menu"
            className="fixed inset-0 z-40 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div role="menu" aria-label="Account" className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-none">
            <p className="px-3 py-2 text-sm">
              <strong className="block truncate">{user.full_name}</strong>
              <span className="text-[var(--muted-foreground)]">{user.login_id} · {user.role}</span>
            </p>
            <Link
              role="menuitem"
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex min-h-[44px] items-center rounded-[10px] px-3 text-sm font-semibold hover:bg-[var(--background)]"
            >
              Profile
            </Link>
            <div className="px-3 py-1" onClick={() => setOpen(false)}>
              <LogoutButton label="Log out" className="flex h-11 min-h-[44px] w-full items-center justify-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-60" />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
