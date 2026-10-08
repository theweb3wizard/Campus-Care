"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

const FIELDS = [
  { key: "clinic_name", label: "Clinic name" },
  { key: "clinic_phone", label: "Clinic phone (emergency call button)" },
  { key: "working_hours", label: "Working hours" },
  { key: "max_daily_queue", label: "Max daily queue" },
];

/** Admin-editable clinic settings. Empty phone hides the call button (form still works). */
export function ClinicSettingsForm({ initial }: { initial: Record<string, string> }) {
  const [values, setValues] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setMsg(null);
    const maxQ = (values.max_daily_queue ?? "").trim();
    if (maxQ !== "" && (!/^\d+$/.test(maxQ) || Number(maxQ) < 1 || Number(maxQ) > 1000)) {
      setMsg("Max daily queue must be a whole number from 1 to 1000. Empty means 200.");
      return;
    }
    const phone = (values.clinic_phone ?? "").trim();
    if (phone !== "" && phone.replace(/\D/g, "").length < 7) {
      setMsg("Clinic phone looks too short. Emergency call button needs at least 7 digits.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      for (const f of FIELDS) {
        const v = f.key === "max_daily_queue" ? maxQ : (values[f.key] ?? "").trim();
        const { error } = await supabase
          .from("clinic_settings")
          .update({ value: v })
          .eq("key", f.key);
        if (error) throw error;
      }
      setMsg(phone === "" ? "Saved. Note: empty phone hides the emergency call button." : "Saved. Emergency page uses the phone immediately.");
    } catch (err) {
      setMsg(friendlyError(err, "Save failed."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <h2 className="font-display text-lg font-semibold">Clinic settings</h2>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Max queue empty means 200. Empty phone hides the emergency call button.</p>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="flex flex-col gap-1 text-sm font-medium">
            {f.label}
            <input
              value={values[f.key] ?? ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
            />
          </label>
        ))}
      </div>
      <button type="button" onClick={save} disabled={busy} className="mt-3 flex h-12 min-h-[48px] items-center rounded-[10px] bg-[var(--primary)] px-6 font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
        {busy ? "Saving…" : "Save settings"}
      </button>
      {msg ? <div className="mt-2"><p role="alert" className="text-sm font-medium">{msg}</p></div> : null}
    </section>
  );
}
