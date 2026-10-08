"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export function PregnancyForm({ onSaved }: { onSaved: () => void }) {
  const [cardNumber, setCardNumber] = useState("");
  const [confirmName, setConfirmName] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [edd, setEdd] = useState("");
  const [weeks, setWeeks] = useState("");
  const [risk, setRisk] = useState("Low");
  const [nextVisit, setNextVisit] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function lookup() {
    setMsg(null);
    setConfirmName(null);
    setConfirmedId(null);
    if (!cardNumber.trim()) {
      setMsg("Type the patient card number first.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: patient, error: findErr } = await supabase
        .from("profiles")
        .select("id,full_name")
        .eq("card_number", cardNumber.trim())
        .single();
      if (findErr || !patient) throw new Error("No patient with that card number. Check it with the patient.");
      setConfirmName((patient as { full_name: string }).full_name);
      setConfirmedId((patient as { id: string }).id);
      setMsg(`Found ${(patient as { full_name: string }).full_name}. Confirm below before saving.`);
    } catch (err) {
      setMsg(friendlyError(err, "Lookup failed."));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmedId) {
      setMsg("Look up the patient first, then confirm it is the right person.");
      return;
    }
    const w = weeks === "" ? null : Number(weeks);
    if (weeks !== "" && (!Number.isInteger(w as number) || (w as number) < 0 || (w as number) > 45)) {
      setMsg("Weeks must be a whole number from 0 to 45.");
      return;
    }
    if (edd && edd < today && risk === "Low") {
      setMsg("Due date is in the past. Check it, or set risk to High if this needs follow-up.");
      return;
    }
    if (nextVisit && nextVisit < today) {
      setMsg("Next visit cannot be in the past.");
      return;
    }
    if (!window.confirm(`Save maternity record for ${confirmName}? Check card number ${cardNumber.trim()}.`)) return;
    setLoading(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("pregnancy_records").insert({
        patient_id: confirmedId,
        edd: edd || null,
        gestational_weeks: weeks ? Number(weeks) : null,
        risk_level: risk,
        next_visit: nextVisit || null,
        notes: notes.trim(),
      });
      if (error) throw error;
      setMsg(`Saved for ${confirmName}.`);
      setCardNumber("");
      setConfirmName(null);
      setConfirmedId(null);
      setEdd("");
      setWeeks("");
      setNextVisit("");
      setNotes("");
      onSaved();
    } catch (err) {
      setMsg(friendlyError(err, "Save failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="font-display text-lg font-semibold">New maternity record</h2>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Patient card number
        <span className="flex gap-2">
          <input required value={cardNumber} onChange={(e) => { setCardNumber(e.target.value); setConfirmName(null); setConfirmedId(null); }} className="h-12 min-h-[48px] flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
          <button type="button" onClick={lookup} disabled={loading} className="flex h-12 min-h-[48px] items-center rounded-[10px] border border-[var(--border)] px-4 font-semibold disabled:opacity-60">Find</button>
        </span>
      </label>
      {confirmName ? (
        <p role="status" className="rounded-[10px] border border-[var(--primary)] p-3 text-sm font-semibold">Confirm: {confirmName} — is this the right patient before saving?</p>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Due date
          <input type="date" value={edd} onChange={(e) => setEdd(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Weeks (0 to 45)
          <input type="number" min={0} max={45} value={weeks} onChange={(e) => setWeeks(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Risk
          <select value={risk} onChange={(e) => setRisk(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base">
            <option>Low</option>
            <option>High</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Next visit (today or later)
          <input type="date" value={nextVisit} min={today} onChange={(e) => setNextVisit(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base" />
      </label>
      {msg ? <div><p role="alert" className="text-sm font-medium">{msg}</p></div> : null}
      <button type="submit" disabled={loading || !confirmedId} title={!confirmedId ? "Find and confirm the patient first" : undefined} className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
        {loading ? "Saving…" : "Save record"}
      </button>
    </form>
  );
}
