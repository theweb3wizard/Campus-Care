"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { makeReference, services, type Doctor } from "@/lib/booking";
import { StatusMessage, Spinner } from "@/components/motion/StatusMessage";
import { StateBlock } from "@/components/StateBlock";
import { SlotPicker, combineDateTime } from "@/components/SlotPicker";

export function BookingForm({
  doctors,
  patientId,
  demoMode,
  initialService = "General",
}: {
  doctors: Doctor[];
  patientId: string | null;
  demoMode: boolean;
  initialService?: string;
}) {
  const [service, setService] = useState<string>(
    (services as readonly string[]).includes(initialService) ? initialService : "General"
  );
  const [doctorId, setDoctorId] = useState<string>(() => {
    const list = (services as readonly string[]).includes(initialService) && initialService !== "General"
      ? doctors.filter((d) => d.specialty === initialService || d.specialty === "General")
      : doctors;
    return list[0]?.id ?? doctors[0]?.id ?? "";
  });
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [takenMs, setTakenMs] = useState<Set<number>>(new Set());
  const [takenError, setTakenError] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [msgRole, setMsgRole] = useState<"status" | "alert">("status");
  const [ref, setRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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
  // DB signature is booked_slots(p_doctor uuid, p_day date). Frontend matches DB, no DB change.
  useEffect(() => {
    if (demoMode || !doctorId || !date || doctorId.startsWith("demo-")) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase.rpc("booked_slots", {
          p_doctor: doctorId,
          p_day: date,
        });
        if (error) throw error;
        if (!cancelled) {
          setTakenMs(new Set(((data ?? []) as string[]).map((s) => new Date(s).getTime())));
          setTakenError(false);
        }
      } catch {
        if (!cancelled) {
          setTakenMs(new Set());
          setTakenError(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doctorId, date, demoMode]);

  function fail(message: string) {
    setMsg(message);
    setMsgRole("alert");
  }

  async function onConfirm() {
    if (loading) return;
    setMsg(null);
    setMsgRole("status");
    setRef(null);
    setCopied(false);
    if (!doctorId || !date || !time) {
      fail("Pick a doctor, a day, and a time first.");
      return;
    }
    if (!patientId || demoMode) {
      fail("Log in to confirm a real booking. Your picks stay on this page.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      fail("You are offline. Reconnect, then confirm. Your picks stay on this page.");
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
            throw new Error("You already have an upcoming booking. Cancel or reschedule it in Visits first.");
          }
          if (/doctor_slot/.test(hay)) {
            throw new Error("That time was just taken. Pick another time.");
          }
          // Likely a reference collision: retry once with a fresh one.
          finalReference = makeReference();
          const retry = await supabase.from("appointments").insert({ ...row, reference: finalReference });
          if (retry.error) {
            const retryHay = `${retry.error.message} ${retry.error.hint ?? ""} ${retry.error.details ?? ""}`;
            if (/one_upcoming_per_patient/.test(retryHay)) {
              throw new Error("You already have an upcoming booking. Cancel or reschedule it in Visits first.");
            }
            throw new Error("That time was just taken. Pick another time.");
          }
        } else {
          throw error;
        }
      }
      setRef(finalReference);
      setMsgRole("status");
      setMsg(`Done. ${service} with ${doctors.find((d) => d.id === doctorId)?.full_name ?? "doctor"} on ${date} at ${time}. Reference ${finalReference}.`);
      setTakenMs((s) => new Set(s).add(starts.getTime()));
      // NOTE (DB mapping): notifications inserts are staff-only per 0005_security.sql, so a patient-side
      // booking alert would fail RLS. Frontend no longer calls notifyUser here to avoid a false bell promise.
      // If you want a booking bell, tell me and I will propose a DB trigger (needs your approval).
    } catch (err) {
      fail(friendlyError(err, "Booking failed. Try again."));
    } finally {
      setLoading(false);
    }
  }

  async function copyRef() {
    if (!ref) return;
    try {
      await navigator.clipboard.writeText(ref);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const summary = doctorId && date && time
    ? `${service} with ${selectedDoctor?.full_name ?? "doctor"} on ${date} at ${time}`
    : null;

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
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">20-minute slots, 09:00 to 15:40. Closed Sundays. Taken times show as taken.</p>
        <div className="mt-3">
          <SlotPicker date={date} time={time} takenMs={takenMs} onDate={selectDate} onTime={setTime} idPrefix="book" />
        </div>
        {takenError ? (
          <p role="alert" className="mt-2 text-sm font-medium text-[var(--warning-fg)]">Could not load taken times. Slots may look free. Check your connection before confirming.</p>
        ) : null}
      </section>

      {summary ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          Review: <strong>{summary}</strong>. Confirm once. Changing service or doctor clears day and time.
        </p>
      ) : null}
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
      >
        {loading ? (<><Spinner /> Booking…</>) : "Confirm booking"}
      </button>
      {msg ? <StatusMessage role={msgRole}>{msg}</StatusMessage> : null}
      {!patientId || demoMode ? (
        msg ? (
          <p className="text-sm">
            <Link href={`/login?next=${encodeURIComponent(`/book?service=${encodeURIComponent(service)}`)}`} className="font-semibold underline">Log in</Link>
            {" or "}
            <Link href="/signup" className="font-semibold underline">create account</Link>
            {" to save it. Then come back — your picks stay here."}
          </p>
        ) : null
      ) : null}
      {ref ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">Booking ticket — show at reception</p>
          <p className="font-slip mt-1 text-2xl font-bold tracking-wide">{ref}</p>
          <p className="mt-1 text-sm">New here with no card number? Come anyway — reception issues cards at check-in.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={copyRef} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold">
              {copied ? "Copied" : "Copy reference"}
            </button>
            <Link href="/visits" className="flex h-11 min-h-[44px] items-center rounded-[10px] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">
              Open Visits
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
