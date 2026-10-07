"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export function ReportForm() {
  const router = useRouter();
  const params = useSearchParams();
  const appointmentId = params.get("appointment") ?? "";
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appointmentId) {
      setMsg("Missing appointment. Open this page from the doctor queue.");
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      // Resolve patient for this appointment (staff can read appointments)
      const { data: appt, error: apptErr } = await supabase
        .from("appointments")
        .select("id,patient_id")
        .eq("id", appointmentId)
        .single();
      if (apptErr || !appt) throw new Error("Appointment not found.");
      const { error } = await supabase.from("reports").upsert(
        {
          appointment_id: appointmentId,
          patient_id: (appt as { patient_id: string }).patient_id,
          doctor_id: user?.id ?? null,
          diagnosis,
          treatment,
          follow_up_date: followUp || null,
        },
        { onConflict: "appointment_id" }
      );
      if (error) throw error;
      setMsg("Saved. Patient sees it under Reports.");
      router.push("/doctor");
    } catch (err) {
      setMsg(friendlyError(err, "Save failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Diagnosis
        <textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} required rows={2} className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Treatment
        <textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} required rows={2} className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Follow-up date
        <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
      </label>
      {msg ? <p role="status" className="text-sm font-medium">{msg}</p> : null}
      <button type="submit" disabled={loading} className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
        {loading ? "Saving…" : "Save report"}
      </button>
    </form>
  );
}
