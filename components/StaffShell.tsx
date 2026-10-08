"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { staffGroupsFor, staffTitleFor } from "@/lib/staff";
import { LogoutButton } from "@/components/UserMenu";

export function StaffShell({
  role,
  userName,
  children,
}: {
  role: string;
  userName?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const groups = staffGroupsFor(role);
  const title = staffTitleFor(pathname);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const nav = (
    <div className="flex flex-col gap-5">
      {userName ? (
        <p className="rounded-[10px] border border-[var(--border)] p-3 text-sm">
          <span className="text-[var(--muted-foreground)]">Signed in as</span>
          <strong className="block truncate">{userName}</strong>
          <span className="text-[var(--muted-foreground)]">{role}</span>
        </p>
      ) : null}
      {groups.map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-[var(--muted-foreground)]">
            {g.title}
          </h2>
          <ul className="mt-1 flex flex-col gap-1">
            {g.links.map((l) => {
              const active = isActive(l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[48px] flex-col justify-center rounded-[10px] border px-3 py-1.5 ${
                      active
                        ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                        : "border-transparent hover:border-[var(--border)]"
                    }`}
                  >
                    <span className="text-sm font-semibold leading-tight">{l.label}</span>
                    <span className={`text-xs leading-tight ${active ? "text-white" : "text-[var(--muted-foreground)]"}`}>
                      {l.desc}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <div className="border-t border-[var(--border)] pt-3">
        <LogoutButton label="Log out" className="flex h-11 min-h-[44px] w-full items-center justify-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-60" />
      </div>
    </div>
  );

  return (
    <div className="flex gap-6">
      <aside className="print-hidden hidden w-60 shrink-0 md:block">
        <nav aria-label="Staff workspace" className="sticky top-24 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          {nav}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="print-hidden mb-3 flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-label="Open staff menu"
            className="flex h-11 min-h-[44px] items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 text-sm font-semibold"
          >
            <Menu size={20} aria-hidden />
            Staff menu
          </button>
          <p className="truncate text-sm text-[var(--muted-foreground)]" aria-current="page">
            Staff / {title}
          </p>
        </div>
        <p className="print-hidden hidden text-sm text-[var(--muted-foreground)] md:block" aria-label="Breadcrumb">
          <Link href="/profile" className="underline">Staff</Link> / <span aria-current="page">{title}</span>
        </p>
        <div className="mt-2">{children}</div>
      </div>

      {open ? (
        <div role="dialog" aria-modal="true" aria-label="Staff menu" className="print-hidden fixed inset-0 z-50 md:hidden">
          <button type="button" aria-label="Close staff menu" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-y-0 left-0 flex w-80 max-w-[85vw] flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <strong>Staff menu</strong>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close staff menu"
                className="flex size-11 items-center justify-center rounded-[10px] border border-[var(--border)]"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <div onClick={(e) => { if ((e.target as HTMLElement).closest("a,button")) setOpen(false); }}>
              {nav}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
