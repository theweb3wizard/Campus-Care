"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export function PregnancyForm({ onSaved }: { onSaved: () => void }) {
  const [cardNumber, setCardNumber] = useState("");
  const [edd, setEdd] = useState("");
  const [weeks, setWeeks] = useState("");
  const [risk, setRisk] = useState("Low");
  const [nextVisit, setNextVisit] = useState("");
  const [notes, setNotes] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const { data: patient, error: findErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("card_number", cardNumber.trim())
        .single();
      if (findErr || !patient) throw new Error("No patient with that card number.");
      const { error } = await supabase.from("pregnancy_records").insert({
        patient_id: (patient as { id: string }).id,
        edd: edd || null,
        gestational_weeks: weeks ? Number(weeks) : null,
        risk_level: risk,
        next_visit: nextVisit || null,
        notes,
      });
      if (error) throw error;
      setMsg("Saved.");
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
        <input required value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Due date
          <input type="date" value={edd} onChange={(e) => setEdd(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Weeks
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
          Next visit
          <input type="date" value={nextVisit} onChange={(e) => setNextVisit(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Notes
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base" />
      </label>
      {msg ? <p role="status" className="text-sm font-medium">{msg}</p> : null}
      <button type="submit" disabled={loading} className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
        {loading ? "Saving…" : "Save record"}
      </button>
    </form>
  );
}
