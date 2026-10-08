"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarPlus, FileText, FlaskConical, House, UserRound } from "lucide-react";
import { navItems } from "@/lib/brand";

const icons: Record<string, typeof House> = {
  "/": House,
  "/book": CalendarPlus,
  "/visits": FileText,
  "/tests": FlaskConical,
  "/profile": UserRound,
};

/** Mobile bottom nav with active-tab state and icons. */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="print-hidden fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid w-full max-w-5xl grid-cols-5">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = icons[item.href] ?? House;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${
                  active
                    ? "font-semibold text-[var(--primary)]"
                    : "text-[var(--muted-foreground)]"
                }`}
              >
                <Icon size={22} aria-hidden strokeWidth={active ? 2.5 : 2} />
                <span className={active ? "underline underline-offset-4" : undefined}>
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
