"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { makeReference, services, lagosDayRange, type Doctor } from "@/lib/booking";
import { notifyUser } from "@/lib/notify";
import { StatusMessage, Spinner } from "@/components/motion/StatusMessage";
import { StateBlock } from "@/components/StateBlock";
import { SlotPicker, combineDateTime } from "@/components/SlotPicker";

export function BookingForm({
  doctors,
  patientId,
  demoMode,
}: {
  doctors: Doctor[];
  patientId: string | null;
  demoMode: boolean;
}) {
  const [service, setService] = useState<string>("General");
  const [doctorId, setDoctorId] = useState<string>(doctors[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [takenMs, setTakenMs] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [ref, setRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = doctors.filter((d) =>
    service === "General" ? true : d.specialty === service || d.specialty === "General"
  );

  function filteredFor(s: string) {
    return doctors.filter((d) =>
      s === "General" ? true : d.specialty === s || d.specialty === "General"
    );
  }

  function selectService(s: string) {
    setService(s);
    setDoctorId(filteredFor(s)[0]?.id ?? "");
    setDate("");
    setTime("");
    setTakenMs(new Set());
  }

  function selectDoctor(id: string) {
    setDoctorId(id);
    setDate("");
    setTime("");
    setTakenMs(new Set());
  }

  function selectDate(v: string) {
    setDate(v);
    setTime("");
    setTakenMs(new Set());
  }

  // Real availability: taken slots for this doctor + day.
  useEffect(() => {
    if (demoMode || !doctorId || !date || doctorId.startsWith("demo-")) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { start, end } = lagosDayRange(date);
        const { data, error } = await supabase.rpc("booked_slots", {
          p_doctor: doctorId,
          p_start: start,
          p_end: end,
        });
        if (error) throw error;
        if (!cancelled) setTakenMs(new Set(((data ?? []) as string[]).map((s) => new Date(s).getTime())));
      } catch {
        if (!cancelled) setTakenMs(new Set());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorId, date, demoMode]);

  async function onConfirm() {
    setMsg(null);
    setRef(null);
    if (!doctorId || !date || !time) {
      setMsg("Pick a doctor, a day, and a time first.");
      return;
    }
    if (!patientId || demoMode) {
      setMsg("Log in with a connected clinic database to save a real booking. This is a preview.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const starts = combineDateTime(date, time);
      const ends = new Date(starts.getTime() + 20 * 60 * 1000);
      const reference = makeReference();
      const row = {
        patient_id: patientId,
        doctor_id: doctorId,
        service,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: "Pending",
        reference,
      };
      const { error } = await supabase.from("appointments").insert(row);
      let finalReference = reference;
      if (error) {
        if (error.code === "23505") {
          const hay = `${error.message} ${error.hint ?? ""} ${error.details ?? ""}`;
          if (/one_upcoming_per_patient/.test(hay)) {
            throw new Error("You already have an upcoming booking. Cancel or reschedule it first.");
          }
          if (/doctor_slot/.test(hay)) {
            throw new Error("That time is now taken. Pick another time to keep your place.");
          }
          // Likely a reference collision: retry once with a fresh one.
          finalReference = makeReference();
          const retry = await supabase.from("appointments").insert({ ...row, reference: finalReference });
          if (retry.error) throw new Error("That time is now taken. Pick another time to keep your place.");
        } else {
          throw error;
        }
      }
      setRef(finalReference);
      setMsg(`Done. Your appointment is booked. Reference ${finalReference}. Come with your card number.`);
      setTakenMs((s) => new Set(s).add(starts.getTime()));
      await notifyUser(patientId, "Appointment booked", `Reference ${finalReference}.`, "/visits");
    } catch (err) {
      setMsg(friendlyError(err, "Booking failed. Try again."));
    } finally {
      setLoading(false);
    }
  }

  if (doctors.length === 0) {
    return <StateBlock state="bookEmptyDoctors" href="/experts" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">1. Service</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {services.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => selectService(s)}
              aria-pressed={service === s}
              className={`flex h-12 min-h-[48px] items-center rounded-full border px-5 text-base font-medium ${
                service === s
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] bg-[var(--background)]"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">2. Doctor</h2>
        <div className="mt-3 flex flex-col gap-2">
          {filtered.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => selectDoctor(d.id)}
              aria-pressed={doctorId === d.id}
              className={`flex min-h-[56px] flex-col items-start justify-center rounded-[10px] border px-4 py-2 text-left ${
                doctorId === d.id ? "border-[var(--primary)]" : "border-[var(--border)]"
              }`}
            >
              <span className="font-semibold">{d.full_name}</span>
              <span className="text-sm text-[var(--muted-foreground)]">
                {d.specialty} · {d.room}
              </span>
            </button>
          ))}
          {filtered.length === 0 ? <p className="text-sm">No doctor for this service yet.</p> : null}
        </div>
        {demoMode ? (
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Preview doctors. Real list loads from the clinic database.</p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">3. Day and time</h2>
        <div className="mt-3">
          <SlotPicker date={date} time={time} takenMs={takenMs} onDate={selectDate} onTime={setTime} idPrefix="book" />
        </div>
      </section>

      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
      >
        {loading ? (<><Spinner /> Booking…</>) : "Confirm booking"}
      </button>
      {msg ? <StatusMessage>{msg}</StatusMessage> : null}
      {ref ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          Reference <strong>{ref}</strong>. Show this at reception or open Visits to manage it.
        </p>
      ) : null}
    </div>
  );
}
