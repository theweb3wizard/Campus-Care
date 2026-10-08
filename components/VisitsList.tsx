"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { formatSlot } from "@/lib/booking";
import { StatusPill } from "@/components/StatusPill";
import { StateBlock } from "@/components/StateBlock";
import { ConfirmDialog } from "@/components/motion/ConfirmDialog";
import { StatusMessage } from "@/components/motion/StatusMessage";
import { SlotPicker, combineDateTime } from "@/components/SlotPicker";
import { lagosDayRange } from "@/lib/booking";

export type Visit = {
  id: string;
  service: string;
  starts_at: string;
  status: string;
  reference: string;
  doctor_name: string;
  doctor_id: string;
  room: string;
};

export function VisitsList({ initial }: { initial: Visit[] }) {
  const [visits, setVisits] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingCancel, setPendingCancel] = useState<Visit | null>(null);
  const [resched, setResched] = useState<Visit | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [takenMs, setTakenMs] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  async function confirmCancel() {
    if (!pendingCancel) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("appointments").update({ status: "Cancelled" }).eq("id", pendingCancel.id);
      if (error) throw error;
      setVisits((v) => v.map((x) => (x.id === pendingCancel.id ? { ...x, status: "Cancelled" } : x)));
      setMsg("Cancelled. Book again any time.");
    } catch (err) {
      setMsg(friendlyError(err, "Update failed."));
    } finally {
      setBusy(false);
      setPendingCancel(null);
    }
  }

  function openReschedule(v: Visit) {
    setResched(v);
    setNewDate("");
    setNewTime("");
    setTakenMs(new Set());
  }

  async function loadTaken(doctorId: string, dateValue: string) {
    if (!doctorId || !dateValue) {
      setTakenMs(new Set());
      return;
    }
    try {
      const supabase = createClient();
      const { start, end } = lagosDayRange(dateValue);
      const { data } = await supabase.rpc("booked_slots", { p_doctor: doctorId, p_start: start, p_end: end });
      setTakenMs(new Set(((data ?? []) as string[]).map((s) => new Date(s).getTime())));
    } catch {
      setTakenMs(new Set());
    }
  }

  async function confirmReschedule() {
    if (!resched || !newDate || !newTime) {
      setMsg("Pick a new day and time first.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const starts = combineDateTime(newDate, newTime);
      const ends = new Date(starts.getTime() + 20 * 60 * 1000);
      const { data, error } = await supabase.rpc("reschedule_appointment", {
        p_appointment: resched.id,
        p_starts: starts.toISOString(),
        p_ends: ends.toISOString(),
      });
      if (error) throw new Error("Move failed. Try again.");
      const res = data as { success: boolean; error?: string; reference?: string };
      if (!res.success) throw new Error(res.error ?? "Move failed.");
      setVisits((vs) =>
        vs.map((x) =>
          x.id === resched.id
            ? { ...x, status: "Rescheduled" }
            : x
        )
      );
      setMsg(`Moved. Your new reference is ${res.reference}. Old booking is closed.`);
      setResched(null);
    } catch (err) {
      setMsg(friendlyError(err, "Move failed."));
    } finally {
      setBusy(false);
    }
  }

  if (visits.length === 0) {
    return <StateBlock state="visitsEmpty" href="/book" />;
  }

  return (
    <div className="flex flex-col gap-3">
      {visits.map((v) => (
        <div key={v.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{v.service} · {v.doctor_name}</strong>
            <StatusPill status={v.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {formatSlot(v.starts_at)} · {v.room} · Ref {v.reference}
          </p>
          {v.status === "Pending" || v.status === "Confirmed" ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setPendingCancel(v)}
                aria-label={`Cancel ${v.service} on ${v.starts_at}`}
                className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => openReschedule(v)}
                aria-label={`Reschedule ${v.service} on ${v.starts_at}`}
                className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold"
              >
                Reschedule
              </button>
            </div>
          ) : null}
        </div>
      ))}
      {msg ? <StatusMessage>{msg}</StatusMessage> : null}
      {resched ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="font-semibold">Move {resched.service} · {resched.doctor_name} to a new time</p>
          <div className="mt-3">
            <SlotPicker
              date={newDate}
              time={newTime}
              takenMs={takenMs}
              onDate={(d) => {
                setNewDate(d);
                setNewTime("");
                loadTaken(resched.doctor_id, d);
              }}
              onTime={setNewTime}
              idPrefix="resched"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirmReschedule}
              disabled={busy || !newDate || !newTime}
              className="flex h-12 min-h-[48px] items-center rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {busy ? "Moving…" : "Move booking"}
            </button>
            <button
              type="button"
              onClick={() => setResched(null)}
              className="flex h-12 min-h-[48px] items-center rounded-[10px] border border-[var(--border)] px-6 text-base font-semibold"
            >
              Keep as is
            </button>
          </div>
        </div>
      ) : null}
      <ConfirmDialog
        open={pendingCancel !== null}
        onOpenChange={(o) => !o && setPendingCancel(null)}
        title="Cancel this visit?"
        body={pendingCancel ? `${pendingCancel.service} · ${pendingCancel.doctor_name} · Ref ${pendingCancel.reference}. This frees your slot for another patient. You can book again any time.` : ""}
        confirmLabel="Yes, cancel visit"
        busy={busy}
        busyLabel="Cancelling…"
        onConfirm={confirmCancel}
      />
    </div>
  );
}
