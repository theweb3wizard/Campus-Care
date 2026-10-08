"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Bell, CalendarCheck, ChevronDown, LogOut, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/motion/ConfirmDialog";
import { Spinner } from "@/components/motion/StatusMessage";
import { useToast } from "@/components/motion/Toaster";
import { tokens } from "@/components/motion/tokens";

export function LogoutButton({ label = "Log out", className }: { label?: string; className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();
  async function doLogout() {
    if (busy) return;
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // still leave — session cookie clears on refresh
    } finally {
      setConfirmOpen(false);
      toast({ kind: "info", title: "Signed out", body: "See you next time." });
      router.push("/login?signedout=1");
      router.refresh();
    }
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        disabled={busy}
        className={
          className ??
          "flex h-12 min-h-[48px] items-center justify-center rounded-[10px] border border-[var(--border)] px-6 text-base font-semibold disabled:opacity-60"
        }
      >
        {busy ? (
          <>
            <Spinner /> Logging out…
          </>
        ) : (
          <>
            <LogOut size={18} aria-hidden /> {label}
          </>
        )}
      </button>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Log out?"
        body="You will need your ID and password to log back in."
        confirmLabel="Log out"
        cancelLabel="Stay logged in"
        busy={busy}
        busyLabel="Logging out…"
        onConfirm={doLogout}
      />
    </>
  );
}

export function UserMenu({
  user,
}: {
  user: { full_name: string; role: string; login_id: string } | null;
}) {
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  if (!user) {
    return (
      <Link
        href="/login"
        className="flex h-11 min-h-[44px] items-center whitespace-nowrap rounded-full border border-[var(--border)] px-4 text-sm font-semibold transition-colors hover:bg-[var(--background)] sm:h-12 sm:px-5 sm:text-base"
      >
        Log in
      </Link>
    );
  }
  const initial = (user.full_name || user.login_id || "?").trim().charAt(0).toUpperCase();
  const isStaff = user.role !== "patient";
  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account: ${user.full_name}, ${user.role}. Open account menu`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--card)] px-3 text-sm font-semibold transition-colors hover:bg-[var(--background)] sm:h-12 sm:px-4 sm:text-base"
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full bg-[var(--primary)] text-sm font-bold text-[var(--primary-foreground)]"
        >
          {initial}
        </span>
        <span className="hidden max-w-24 truncate lg:inline">{user.full_name}</span>
        <span className="hidden rounded-full bg-[var(--background)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)] sm:inline">
          {user.role}
        </span>
        <ChevronDown
          size={16}
          aria-hidden
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close account menu"
              className="fixed inset-0 z-40 cursor-default"
              onClick={() => setOpen(false)}
            />
            <motion.div
              role="menu"
              aria-label="Account"
              initial={reduce ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: tokens.modal.duration, ease: tokens.modal.ease }}
              className="fixed left-4 right-4 top-[72px] z-50 w-auto origin-top rounded-2xl border border-[var(--border)] bg-[var(--card)] p-2 shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-64 sm:origin-top-right"
            >
              <p className="px-3 py-2 text-sm">
                <strong className="block truncate">{user.full_name}</strong>
                <span className="text-[var(--muted-foreground)]">
                  {user.login_id} · {user.role}
                </span>
              </p>
              <div className="my-1 border-t border-[var(--border)]" aria-hidden />
              <Link
                role="menuitem"
                href="/profile"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center gap-2 rounded-[10px] px-3 text-sm font-semibold hover:bg-[var(--background)]"
              >
                <UserRound size={18} aria-hidden /> Profile
              </Link>
              <Link
                role="menuitem"
                href="/visits"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center gap-2 rounded-[10px] px-3 text-sm font-semibold hover:bg-[var(--background)]"
              >
                <CalendarCheck size={18} aria-hidden /> My visits
              </Link>
              <Link
                role="menuitem"
                href="/notifications"
                onClick={() => setOpen(false)}
                className="flex min-h-[44px] items-center gap-2 rounded-[10px] px-3 text-sm font-semibold hover:bg-[var(--background)]"
              >
                <Bell size={18} aria-hidden /> Alerts
              </Link>
              {isStaff ? (
                <p className="px-3 py-2 text-xs text-[var(--muted-foreground)]">
                  Staff workspace lives in Profile, with sidebar on each staff page.
                </p>
              ) : null}
              <div className="px-2 py-1" onClick={() => setOpen(false)}>
                <LogoutButton
                  label="Log out"
                  className="flex h-11 min-h-[44px] w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold hover:bg-[var(--background)] disabled:opacity-60"
                />
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
