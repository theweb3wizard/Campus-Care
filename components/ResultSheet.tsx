"use client";

import { useState } from "react";
import Link from "next/link";
import { FlaskConical, Droplet, ScanLine, ArrowRight } from "lucide-react";

const tabs = [
  { key: "Malaria", icon: FlaskConical, line: "Malaria RDT — Negative", date: "12 May · 10:15", status: "READY" },
  { key: "Blood", icon: Droplet, line: "Full blood count — reviewed", date: "12 May · 09:40", status: "READY" },
  { key: "X-ray", icon: ScanLine, line: "Chest X-ray — scheduled", date: "14 May · 11:00", status: "BOOKED" },
] as const;

/** Lab printout sheet with tabs. Static demo of the real /tests page. */
export function ResultSheet() {
  const [active, setActive] = useState<(typeof tabs)[number]["key"]>("Malaria");
  const current = tabs.find((t) => t.key === active)!;
  const Icon = current.icon;
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]">
      <div role="tablist" aria-label="Result types" className="flex border-b border-[var(--border)]">
        {tabs.map((t) => {
          const TabIcon = t.icon;
          const selected = t.key === active;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(t.key)}
              className={`flex h-12 min-h-[48px] flex-1 items-center justify-center gap-2 text-base font-semibold ${
                selected ? "text-[var(--foreground)]" : "text-[var(--muted-foreground)]"
              }`}
            >
              <TabIcon size={20} aria-hidden />
              {t.key}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="p-6">
        <div className="flex items-center gap-3">
          <Icon size={24} aria-hidden className="text-[var(--primary)]" />
          <p className="text-lg font-semibold">{current.line}</p>
        </div>
        <p className="mt-2 text-base text-[var(--muted-foreground)]">{current.date}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="font-slip inline-block rounded-lg border border-dashed border-[var(--secondary)] px-3 py-1.5 text-sm font-medium tracking-wide">
            {current.status}
          </span>
          <Link href="/tests" className="flex min-h-[48px] items-center gap-2 text-base font-semibold underline">
            Open in Tests
            <ArrowRight size={20} aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}
