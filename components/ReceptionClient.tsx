"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { makeReference, services, lagosDayRange, type Doctor } from "@/lib/booking";
import { SlotPicker, combineDateTime } from "@/components/SlotPicker";

export type PatientHit = { profileId: string; full_name: string; reg_number: string | null; card_number: string | null; phone: string | null };
export type QueueRow = { id: string; queue_number: number; status: string; patient_name: string };
export type ApptRow = { id: string; service: string; starts_at: string; doctor_id: string };

export function ReceptionClient({
  doctors,
  initialQueue,
}: {
  doctors: Doctor[];
  initialQueue: QueueRow[];
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<PatientHit[]>([]);
  const [patient, setPatient] = useState<PatientHit | null>(null);
  const [service, setService] = useState<string>("General");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [takenMs, setTakenMs] = useState<Set<number>>(new Set());
  const [cardInput, setCardInput] = useState("");
  const [ticket, setTicket] = useState<{ ref: string; slot: string } | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>(initialQueue);
  const [apptState, setApptState] = useState<{ patientId: string; list: ApptRow[] }>({ patientId: "", list: [] });
  const [busy, setBusy] = useState(false);
  const appts = apptState.patientId === patient?.profileId ? apptState.list : [];
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!doctorId || !date || doctorId.startsWith("demo-")) return;
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
  }, [doctorId, date]);

  // Patient's upcoming bookings for one-tap check-in.
  useEffect(() => {
    if (!patient) return;
    const pid = patient.profileId;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("appointments")
          .select("id,service,starts_at,doctor_id")
          .eq("patient_id", pid)
          .in("status", ["Pending", "Confirmed"])
          .gte("starts_at", new Date().toISOString())
          .order("starts_at")
          .limit(5);
        setApptState({ patientId: pid, list: (data ?? []) as ApptRow[] });
      } catch {
        setApptState({ patientId: pid, list: [] });
      }
    })();
  }, [patient]);

  async function search() {
    setMsg(null);
    try {
      const supabase = createClient();
      const term = `%${q.trim().replace(/[,()";%]/g, "")}%`;
      const { data: regs, error: e1 } = await supabase
        .from("students")
        .select("reg_number,full_name,profile_id")
        .or(`reg_number.ilike.${term},full_name.ilike.${term}`)
        .not("profile_id", "is", null)
        .limit(10);
      if (e1) throw e1;
      const ids = ((regs ?? []) as { profile_id: string }[]).map((r) => r.profile_id);
      const { data: profs, error: e2 } = await supabase
        .from("profiles")
        .select("id,full_name,card_number,phone")
        .or(`card_number.ilike.${term},phone.ilike.${term}${ids.length > 0 ? `,id.in.(${ids.join(",")})` : ""}`)
        .limit(10);
      if (e2) throw e2;
      const byId = new Map(((profs ?? []) as { id: string; full_name: string; card_number: string | null; phone: string | null }[]).map((p) => [p.id, p]));
      const merged: PatientHit[] = [];
      for (const r of (regs ?? []) as { reg_number: string; full_name: string; profile_id: string }[]) {
        const p = byId.get(r.profile_id);
        if (!p) continue;
        merged.push({ profileId: p.id, full_name: r.full_name, reg_number: r.reg_number, card_number: p.card_number, phone: p.phone });
      }
      for (const p of byId.values()) {
        if (merged.some((m) => m.profileId === p.id)) continue;
        merged.push({ profileId: p.id, full_name: p.full_name, reg_number: null, card_number: p.card_number, phone: p.phone });
      }
      setHits(merged);
      if (merged.length === 0) setMsg("No patient found. Check the spelling or search with the registered phone number.");
    } catch (err) {
      setMsg(friendlyError(err, "Search failed."));
    }
  }

  async function issueCard() {
    if (!patient || !cardInput.trim()) {
      setMsg("Type the new card number first.");
      return;
    }
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").update({ card_number: cardInput.trim() }).eq("id", patient.profileId);
      if (error) throw error;
      setPatient({ ...patient, card_number: cardInput.trim() });
      setMsg(`Card ${cardInput.trim()} issued to ${patient.full_name}.`);
    } catch (err) {
      setMsg(friendlyError(err, "Could not issue card."));
    }
  }

  async function checkIn(appointmentId: string | null, docId: string | null) {
    if (!patient) return;
    setMsg(null);
    setTicket(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("check_in_patient", {
        p_patient: patient.profileId,
        p_appointment: appointmentId,
        p_doctor: docId,
      });
      if (error) throw new Error("Check-in failed. Try again.");
      const res = data as { success: boolean; error?: string; queue_number?: number };
      if (!res.success) throw new Error(res.error ?? "Check-in failed.");
      let fileNote = "";
      try {
        const { data: fileNum } = await supabase.rpc("issue_clinic_file", { p_profile: patient.profileId });
        if (fileNum) fileNote = ` File ${fileNum}.`;
      } catch {
        // file issuance is best-effort here; reception can retry from profile
      }
      setMsg(`${patient.full_name} is No. ${res.queue_number} today.${fileNote}`);
      await refreshQueue();
    } catch (err) {
      setMsg(friendlyError(err, "Check-in failed."));
    }
  }

  async function refreshQueue() {
    try {
      const supabase = createClient();
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const { data: entries } = await supabase
        .from("queue_entries")
        .select("id,queue_number,status,visit_id")
        .eq("queue_date", todayStr)
        .order("queue_number")
        .limit(200);
      const rows = (entries ?? []) as { id: string; queue_number: number; status: string; visit_id: string }[];
      if (rows.length === 0) {
        setQueue([]);
        return;
      }
      const { data: visits } = await supabase
        .from("visits")
        .select("id,patient_id")
        .in("id", rows.map((r) => r.visit_id));
      const vmap = new Map(((visits ?? []) as { id: string; patient_id: string }[]).map((v) => [v.id, v.patient_id]));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,full_name")
        .in("id", [...new Set([...vmap.values()])]);
      const pmap = new Map(((profs ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
      setQueue(
        rows.map((r) => ({
          id: r.id,
          queue_number: r.queue_number,
          status: r.status,
          patient_name: pmap.get(vmap.get(r.visit_id) ?? "") ?? "Patient",
        }))
      );
    } catch {
      // queue refresh is best-effort
    }
  }

  async function queueAction(id: string, action: string) {
    setMsg(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("queue_transition", { p_queue: id, p_action: action });
      if (error) throw new Error("Update failed.");
      const res = data as { success: boolean; error?: string };
      if (!res.success) throw new Error(res.error ?? "Update failed.");
      await refreshQueue();
    } catch (err) {
      setMsg(friendlyError(err, "Update failed."));
    }
  }

  async function book() {
    if (!patient || !doctorId || !date || !time) {
      setMsg("Pick a patient, doctor, day, and time first.");
      return;
    }
    if (busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const starts = combineDateTime(date, time);
      const ends = new Date(starts.getTime() + 20 * 60 * 1000);
      const reference = makeReference();
      const { error } = await supabase.from("appointments").insert({
        patient_id: patient.profileId,
        doctor_id: doctorId,
        service,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        status: "Confirmed",
        reference,
      });
      if (error) {
        if (error.code === "23505") {
          const hay = `${error.message} ${error.hint ?? ""} ${error.details ?? ""}`;
          if (/one_upcoming_per_patient/.test(hay)) {
            throw new Error("This patient already has an upcoming booking.");
          }
          throw new Error("That time is now taken. Pick another time to keep the place.");
        }
        throw error;
      }
      setTicket({ ref: reference, slot: starts.toLocaleString("en-GB") });
      setMsg(`Patient booked and ticketed. Give ticket ${reference} to the patient.`);
    } catch (err) {
      setMsg(friendlyError(err, "Booking failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">1. Find patient</h2>
        <div className="mt-2 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Reg number, card number, or name"
            aria-label="Search patient"
            className="h-12 min-h-[48px] flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
          />
          <button type="button" onClick={search} className="flex h-12 min-h-[48px] items-center rounded-[10px] bg-[var(--primary)] px-5 font-semibold text-[var(--primary-foreground)]">Search</button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {hits.map((h) => (
            <button
              key={h.profileId}
              type="button"
              onClick={() => { setPatient(h); setCardInput(h.card_number ?? ""); setTicket(null); }}
              aria-pressed={patient?.profileId === h.profileId}
              className={`rounded-[10px] border px-4 py-3 text-left ${patient?.profileId === h.profileId ? "border-[var(--primary)]" : "border-[var(--border)]"}`}
            >
              <strong>{h.full_name}</strong>
              <span className="block text-sm text-[var(--muted-foreground)]">{h.reg_number ?? h.card_number ?? "No ID"} · {h.phone ?? "No phone"}</span>
            </button>
          ))}
        </div>
        {patient ? (
          <div className="mt-3 flex gap-2">
            <input
              value={cardInput}
              onChange={(e) => setCardInput(e.target.value)}
              placeholder="Card number, e.g. FCO/24/0042"
              aria-label="Card number"
              className="h-12 min-h-[48px] flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
            />
            <button type="button" onClick={issueCard} className="flex h-12 min-h-[48px] items-center rounded-[10px] border border-[var(--border)] px-4 font-semibold">Issue card</button>
          </div>
        ) : null}
      </section>

      {patient ? (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
          <h2 className="font-display text-lg font-semibold">2. Check in {patient.full_name}</h2>
          {appts.length > 0 ? (
            <div className="mt-2 flex flex-col gap-2">
              {appts.map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[10px] border border-[var(--border)] px-4 py-2.5 text-sm">
                  <span><strong>{a.service}</strong> · {new Date(a.starts_at).toLocaleString("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit" })}</span>
                  <button type="button" onClick={() => checkIn(a.id, a.doctor_id)} className="flex h-11 min-h-[44px] items-center rounded-[10px] bg-[var(--primary)] px-4 font-semibold text-[var(--primary-foreground)]">Check in</button>
                </div>
              ))}
            </div>
          ) : null}
          <button type="button" onClick={() => checkIn(null, null)} className="mt-2 flex h-12 min-h-[48px] items-center justify-center rounded-[10px] border border-[var(--border)] px-6 font-semibold">
            Check in as walk-in
          </button>
        </section>
      ) : null}

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">3. Book ahead{patient ? ` for ${patient.full_name}` : ""}</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Service
            <select value={service} onChange={(e) => setService(e.target.value)} className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base">
              {services.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Doctor
            <select value={doctorId} onChange={(e) => { setDoctorId(e.target.value); setDate(""); setTime(""); setTakenMs(new Set()); }} className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base">
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name} · {d.room}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-3">
          <SlotPicker date={date} time={time} takenMs={takenMs} onDate={(v) => { setDate(v); setTime(""); setTakenMs(new Set()); }} onTime={setTime} idPrefix="reception" />
        </div>
        <button type="button" onClick={book} disabled={busy} className="mt-3 flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 font-semibold text-[var(--primary-foreground)] disabled:opacity-60">Confirm booking</button>
        {msg ? <p role="status" className="mt-2 text-sm font-medium">{msg}</p> : null}
        {ticket && patient ? (
          <div id="ticket" className="mt-3 rounded-[10px] border border-[var(--border)] bg-white p-5 text-black">
            <p className="text-lg font-bold">Campus Care — Visit Ticket</p>
            <p className="mt-1 text-2xl font-bold">{ticket.ref}</p>
            <p className="mt-1">{patient.full_name} · {service}</p>
            <p>{ticket.slot}</p>
            <button type="button" onClick={() => window.print()} className="mt-3 flex h-11 min-h-[44px] items-center rounded-[10px] border border-black px-4 text-sm font-semibold print:hidden">Print ticket</button>
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">Today&apos;s queue ({queue.length})</h2>
        <ul className="mt-2 flex flex-col gap-2">
          {queue.map((r) => (
            <li key={r.id} className="rounded-[10px] border border-[var(--border)] px-4 py-2.5 text-sm">
              <div className="flex justify-between gap-2">
                <span><strong>No. {r.queue_number}</strong> · {r.patient_name}</span>
                <span className="text-[var(--muted-foreground)]">{r.status}</span>
              </div>
              {["waiting", "called", "skipped"].includes(r.status) ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => queueAction(r.id, "call")} aria-label={`Call number ${r.queue_number}`} className="flex h-11 min-h-[44px] items-center rounded-lg border border-[var(--border)] px-3 font-semibold">Call</button>
                  <button type="button" onClick={() => queueAction(r.id, "skip")} aria-label={`Skip number ${r.queue_number}`} className="flex h-11 min-h-[44px] items-center rounded-lg border border-[var(--border)] px-3 font-semibold">Skip</button>
                  {r.status === "skipped" ? (
                    <button type="button" onClick={() => queueAction(r.id, "recall")} aria-label={`Recall number ${r.queue_number}`} className="flex h-11 min-h-[44px] items-center rounded-lg border border-[var(--border)] px-3 font-semibold">Recall</button>
                  ) : null}
                  <button type="button" onClick={() => queueAction(r.id, "start")} aria-label={`Start visit for number ${r.queue_number}`} className="flex h-11 min-h-[44px] items-center rounded-lg bg-[var(--primary)] px-3 font-semibold text-[var(--primary-foreground)]">Start visit</button>
                  <button type="button" onClick={() => queueAction(r.id, "cancel")} aria-label={`Cancel number ${r.queue_number}`} className="flex h-11 min-h-[44px] items-center rounded-lg border border-[var(--border)] px-3 font-semibold">Cancel</button>
                </div>
              ) : null}
            </li>
          ))}
          {queue.length === 0 ? <li className="text-[var(--muted-foreground)]">Empty.</li> : null}
        </ul>
      </section>
    </div>
  );
}
