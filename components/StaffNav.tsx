"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/reception", label: "Reception", roles: ["receptionist", "admin", "doctor", "nurse"] },
  { href: "/doctor", label: "Queue", roles: ["doctor", "nurse", "receptionist", "admin"] },
  { href: "/lab", label: "Lab", roles: ["lab", "doctor", "nurse", "admin"] },
  { href: "/pharmacy", label: "Pharmacy", roles: ["pharmacy", "doctor", "nurse", "admin"] },
  { href: "/emergency/requests", label: "Emergencies", roles: ["doctor", "nurse", "receptionist", "admin"] },
  { href: "/admin", label: "Admin", roles: ["admin"] },
] as const;

export function StaffNav({ role }: { role: string }) {
  const pathname = usePathname();
  const visible = links.filter((l) => (l.roles as readonly string[]).includes(role));
  if (visible.length === 0) return null;
  return (
    <nav aria-label="Staff sections" className="print-hidden mt-4 flex flex-wrap gap-2">
      {visible.map((l) => {
        const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-[44px] items-center rounded-full border px-4 text-sm font-semibold ${
              active
                ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "border-[var(--border)] bg-[var(--card)]"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
