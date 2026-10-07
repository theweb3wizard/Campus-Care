"use client";

import { useMemo } from "react";

export type DayOption = { value: string; label: string };
export type TimeOption = { value: string; label: string; taken: boolean };

/** Next 14 days, skipping Sundays. value = yyyy-mm-dd. */
export function nextDays(count = 14): DayOption[] {
  const out: DayOption[] = [];
  const now = new Date();
  for (let d = 0; d < count; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    if (day.getDay() === 0) continue;
    const value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const label = day.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    out.push({ value, label: d === 0 ? `Today · ${label}` : d === 1 ? `Tomorrow · ${label}` : label });
  }
  return out;
}

/** 20-minute slots 09:00–15:40 for a yyyy-mm-dd date. Past times removed for today. */
export function timesForDate(dateValue: string, takenMs: Set<number>): TimeOption[] {
  const [y, m, d] = dateValue.split("-").map(Number);
  const nowMs = Date.now() + 30 * 60 * 1000;
  const out: TimeOption[] = [];
  for (let h = 9; h < 16; h++) {
    for (const min of [0, 20, 40]) {
      const dt = new Date(y, m - 1, d, h, min, 0, 0);
      if (dt.getTime() < nowMs) continue;
      const label = dt.toLocaleTimeString("en-GB", { hour: "numeric", minute: "2-digit" });
      out.push({
        value: `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`,
        label,
        taken: takenMs.has(dt.getTime()),
      });
    }
  }
  return out;
}

/** Date → Time dropdowns. Taken times are disabled, never hidden. */
export function SlotPicker({
  date,
  time,
  takenMs,
  onDate,
  onTime,
  idPrefix,
}: {
  date: string;
  time: string;
  takenMs: Set<number>;
  onDate: (v: string) => void;
  onTime: (v: string) => void;
  idPrefix: string;
}) {
  const days = useMemo(() => nextDays(), []);
  const times = useMemo(() => (date ? timesForDate(date, takenMs) : []), [date, takenMs]);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={`${idPrefix}-date`}>
        Day
        <select
          id={`${idPrefix}-date`}
          value={date}
          onChange={(e) => {
            onDate(e.target.value);
            onTime("");
          }}
          className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
        >
          <option value="">Choose a day…</option>
          {days.map((d) => (
            <option key={d.value} value={d.value}>{d.label}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium" htmlFor={`${idPrefix}-time`}>
        Time
        <select
          id={`${idPrefix}-time`}
          value={time}
          onChange={(e) => onTime(e.target.value)}
          disabled={!date}
          className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base disabled:opacity-60"
        >
          <option value="">{date ? "Choose a time…" : "Pick a day first…"}</option>
          {times.map((t) => (
            <option key={t.value} value={t.value} disabled={t.taken}>
              {t.label}{t.taken ? " — taken" : ""}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/** Combine yyyy-mm-dd + hh:mm into a Date. */
export function combineDateTime(dateValue: string, timeValue: string): Date {
  const [y, m, d] = dateValue.split("-").map(Number);
  const [h, min] = timeValue.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}
