"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from "lucide-react";

export type DayOption = { value: string; label: string };
export type TimeOption = { value: string; label: string; taken: boolean };

/** Booking window + clinic rules. Single place to tune flexibility for both sides. */
export const BOOKING_WINDOW_DAYS = 60;
export const SLOT_MINUTES = 20;
export const OPEN_HOUR = 9;
export const LAST_SLOT = "15:40";
export const LEAD_MINUTES = 30;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function dateKey(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseKey(value: string): { y: number; m: number; d: number } | null {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return { y, m: m - 1, d };
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSunday(y: number, m: number, d: number) {
  return new Date(y, m, d).getDay() === 0;
}

/** Is this yyyy-mm-dd selectable? Past days, Sundays, and beyond-window days are not. */
export function isDaySelectable(value: string, windowDays = BOOKING_WINDOW_DAYS): boolean {
  const p = parseKey(value);
  if (!p) return false;
  if (isSunday(p.y, p.m, p.d)) return false;
  const today = startOfDay(new Date());
  const day = new Date(p.y, p.m, p.d);
  if (day < today) return false;
  const max = new Date(today);
  max.setDate(max.getDate() + windowDays);
  if (day > max) return false;
  return true;
}

export function formatDay(value: string): string {
  const p = parseKey(value);
  if (!p) return value;
  return new Date(p.y, p.m, p.d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

/** Next 14 days, skipping Sundays. value = yyyy-mm-dd. Kept for compat. */
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
  const nowMs = Date.now() + LEAD_MINUTES * 60 * 1000;
  const out: TimeOption[] = [];
  for (let h = OPEN_HOUR; h < 16; h++) {
    for (const min of [0, SLOT_MINUTES, SLOT_MINUTES * 2]) {
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

type CalCell = { y: number; m: number; d: number; inMonth: boolean; key: string };

function monthCells(year: number, month: number): CalCell[] {
  const first = new Date(year, month, 1);
  // Monday-first grid: Sun(0) -> 6 trailing, else day-1 leading.
  const lead = (first.getDay() + 6) % 7;
  const cells: CalCell[] = [];
  for (let i = lead - 1; i >= 0; i--) {
    const dt = new Date(year, month, -i);
    cells.push({ y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate(), inMonth: false, key: dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate()) });
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ y: year, m: month, d, inMonth: true, key: dateKey(year, month, d) });
  }
  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1];
    const dt = new Date(last.y, last.m, last.d + 1);
    cells.push({ y: dt.getFullYear(), m: dt.getMonth(), d: dt.getDate(), inMonth: false, key: dateKey(dt.getFullYear(), dt.getMonth(), dt.getDate()) });
  }
  return cells;
}

/** Calendar date picker + time-slot grid. Same props as before, so booking,
 *  reception, and reschedule all gain month navigation with no other changes. */
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
  const [dateOpen, setDateOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
  const today = useMemo(() => startOfDay(new Date()), []);
  const maxDay = useMemo(() => {
    const m = startOfDay(new Date());
    m.setDate(m.getDate() + BOOKING_WINDOW_DAYS);
    return m;
  }, []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const times = useMemo(() => (date ? timesForDate(date, takenMs) : []), [date, takenMs]);
  const freeCount = times.filter((t) => !t.taken).length;
  const cells = useMemo(() => monthCells(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  const minMonth = today.getFullYear() * 12 + today.getMonth();
  const maxMonth = maxDay.getFullYear() * 12 + maxDay.getMonth();
  const viewIndex = viewYear * 12 + viewMonth;

  function moveMonth(dir: 1 | -1) {
    const next = viewIndex + dir;
    if (next < minMonth || next > maxMonth) return;
    setViewYear(Math.floor(next / 12));
    setViewMonth(next % 12);
  }

  function pickDay(key: string) {
    if (!isDaySelectable(key)) return;
    onDate(key);
    onTime("");
    setDateOpen(false);
  }

  function pickTime(v: string) {
    onTime(v);
    setTimeOpen(false);
  }

  function openCalendar() {
    const p = parseKey(date);
    if (p) {
      setViewYear(p.y);
      setViewMonth(p.m);
    } else {
      setViewYear(today.getFullYear());
      setViewMonth(today.getMonth());
    }
    setDateOpen(true);
  }

  const selectedTime = times.find((t) => t.value === time);

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="flex flex-col gap-1 text-sm font-medium">
        <span id={`${idPrefix}-date-label`}>
          Day <span className="font-normal text-[var(--muted-foreground)]">Up to {BOOKING_WINDOW_DAYS} days ahead · Closed Sundays</span>
        </span>
        <button
          type="button"
          onClick={openCalendar}
          aria-labelledby={`${idPrefix}-date-label ${idPrefix}-date-value`}
          className="flex h-12 min-h-[48px] items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-left text-base"
        >
          <CalendarDays size={20} aria-hidden className="shrink-0 text-[var(--muted-foreground)]" />
          <span id={`${idPrefix}-date-value`} className={date ? "font-semibold" : "text-[var(--muted-foreground)]"}>
            {date ? formatDay(date) : "Choose a day…"}
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-1 text-sm font-medium">
        <span id={`${idPrefix}-time-label`}>
          Time <span className="font-normal text-[var(--muted-foreground)]">{date ? `09:00 to ${LAST_SLOT}` : "Pick a day first"}</span>
        </span>
        <button
          type="button"
          onClick={() => date && setTimeOpen(true)}
          disabled={!date}
          aria-labelledby={`${idPrefix}-time-label ${idPrefix}-time-value`}
          className="flex h-12 min-h-[48px] items-center gap-2 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-left text-base disabled:opacity-60"
        >
          <Clock size={20} aria-hidden className="shrink-0 text-[var(--muted-foreground)]" />
          <span id={`${idPrefix}-time-value`} className={time ? "font-semibold" : "text-[var(--muted-foreground)]"}>
            {!date ? "Pick a day first…" : time && selectedTime ? selectedTime.label : freeCount === 0 ? "No times left — pick another day" : "Choose a time…"}
          </span>
        </button>
        {date && times.length > 0 ? (
          <span className="text-sm font-normal text-[var(--muted-foreground)]">{freeCount} of {times.length} times free</span>
        ) : null}
      </div>

      {dateOpen ? (
        <div role="dialog" aria-modal="true" aria-label="Choose a day" className="print-hidden fixed inset-0 z-50">
          <button type="button" aria-label="Close calendar" onClick={() => setDateOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:inset-0 sm:m-auto sm:h-fit sm:rounded-2xl">
            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                disabled={viewIndex <= minMonth}
                aria-label="Previous month"
                className="flex size-11 items-center justify-center rounded-[10px] border border-[var(--border)] disabled:opacity-40"
              >
                <ChevronLeft size={20} aria-hidden />
              </button>
              <strong aria-live="polite">{monthLabel}</strong>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                disabled={viewIndex >= maxMonth}
                aria-label="Next month"
                className="flex size-11 items-center justify-center rounded-[10px] border border-[var(--border)] disabled:opacity-40"
              >
                <ChevronRight size={20} aria-hidden />
              </button>
            </div>
            <div aria-hidden className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-[var(--muted-foreground)]">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <span key={d} className="py-1">{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cells.map((c) => {
                const selectable = c.inMonth && isDaySelectable(c.key);
                const selected = date === c.key;
                const sunday = isSunday(c.y, c.m, c.d);
                return (
                  <button
                    key={c.key + (c.inMonth ? "-in" : "-out")}
                    type="button"
                    disabled={!selectable}
                    onClick={() => pickDay(c.key)}
                    aria-label={`${new Date(c.y, c.m, c.d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${selected ? ", selected" : ""}${!c.inMonth ? ", outside this month" : ""}${sunday && c.inMonth ? ", closed Sunday" : ""}`}
                    aria-pressed={selected}
                    className={`flex min-h-[44px] items-center justify-center rounded-[10px] text-base ${
                      selected
                        ? "bg-[var(--primary)] font-bold text-[var(--primary-foreground)]"
                        : selectable
                          ? "border border-[var(--border)] font-medium"
                          : "text-[var(--muted-foreground)] opacity-40"
                    }`}
                  >
                    {c.d}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">Sundays closed. Grey days are past, closed, or beyond {BOOKING_WINDOW_DAYS} days.</p>
            <button
              type="button"
              onClick={() => setDateOpen(false)}
              className="mt-3 flex h-12 min-h-[48px] w-full items-center justify-center rounded-[10px] border border-[var(--border)] px-6 text-base font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}

      {timeOpen && date ? (
        <div role="dialog" aria-modal="true" aria-label={`Choose a time on ${formatDay(date)}`} className="print-hidden fixed inset-0 z-50">
          <button type="button" aria-label="Close time picker" onClick={() => setTimeOpen(false)} className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-2xl border border-[var(--border)] bg-[var(--card)] p-4 sm:inset-0 sm:m-auto sm:h-fit sm:rounded-2xl">
            <strong className="block">{formatDay(date)}</strong>
            <p className="mt-0.5 text-sm text-[var(--muted-foreground)]">{SLOT_MINUTES}-minute slots, 09:00 to {LAST_SLOT}. Taken times are disabled, never hidden.</p>
            {times.length === 0 ? (
              <p role="status" className="mt-3 rounded-[10px] border border-[var(--border)] p-3 text-sm">No times left on this day — pick another day.</p>
            ) : (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {times.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    disabled={t.taken}
                    onClick={() => pickTime(t.value)}
                    aria-pressed={time === t.value}
                    aria-label={`${t.label}${t.taken ? ", taken" : ""}`}
                    className={`flex min-h-[48px] items-center justify-center rounded-[10px] border text-base ${
                      time === t.value
                        ? "border-[var(--primary)] bg-[var(--primary)] font-bold text-[var(--primary-foreground)]"
                        : t.taken
                          ? "border-[var(--border)] text-[var(--muted-foreground)] opacity-50"
                          : "border-[var(--border)] font-medium"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              onClick={() => setTimeOpen(false)}
              className="mt-3 flex h-12 min-h-[48px] w-full items-center justify-center rounded-[10px] border border-[var(--border)] px-6 text-base font-semibold"
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Combine yyyy-mm-dd + hh:mm into a Date. */
export function combineDateTime(dateValue: string, timeValue: string): Date {
  const [y, m, d] = dateValue.split("-").map(Number);
  const [h, min] = timeValue.split(":").map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}
