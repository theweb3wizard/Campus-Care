"use client";

import { useState } from "react";
import Link from "next/link";
import type { Doctor } from "@/lib/booking";

export function ExpertFinder({ doctors }: { doctors: Doctor[] }) {
  const [q, setQ] = useState("");
  const filtered = doctors.filter((d) =>
    `${d.full_name} ${d.specialty} ${d.room}`.toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Search specialists
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search eye, dental, antenatal…"
          className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 text-base"
        />
      </label>
      {filtered.map((d) => (
        <div key={d.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <strong>{d.full_name}</strong>
          <p className="text-sm text-[var(--muted-foreground)]">{d.specialty} · {d.room}</p>
          <Link href={`/book?service=${encodeURIComponent(d.specialty)}`} className="mt-2 inline-flex min-h-[44px] items-center text-base font-semibold underline">Book {d.specialty} visit</Link>
        </div>
      ))}
      {filtered.length === 0 ? <p role="status" className="text-[var(--muted-foreground)]">No specialist matches that search.</p> : null}
    </div>
  );
}
