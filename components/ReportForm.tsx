"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { StatusMessage } from "@/components/motion/StatusMessage";

export function ReportForm() {
  const router = useRouter();
  const params = useSearchParams();
  const appointmentId = params.get("appointment") ?? "";
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");
  const [followUp, setFollowUp] = useState("");
  const [existing, setExisting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!appointmentId) {
      setMsg("Missing appointment. Open this page from the doctor queue.");
      return;
    }
    if (diagnosis.trim().length < 3 || treatment.trim().length < 3) {
      setMsg("Write at least a few words for diagnosis and treatment. One word is not enough.");
      return;
    }
    if (followUp && followUp < today) {
      setMsg("Follow-up date cannot be in the past.");
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
      const { data: prior } = await supabase
        .from("reports")
        .select("id")
        .eq("appointment_id", appointmentId)
        .limit(1)
        .maybeSingle();
      if (prior) setExisting(true);
      const { error } = await supabase.from("reports").upsert(
        {
          appointment_id: appointmentId,
          patient_id: (appt as { patient_id: string }).patient_id,
          doctor_id: user?.id ?? null,
          diagnosis: diagnosis.trim(),
          treatment: treatment.trim(),
          follow_up_date: followUp || null,
        },
        { onConflict: "appointment_id" }
      );
      if (error) throw error;
      setMsg("Saved. Patient sees it under Reports.");
      setTimeout(() => router.push("/doctor"), 800);
    } catch (err) {
      setMsg(friendlyError(err, "Save failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
    <p className="mt-4 text-sm">
      <Link href="/doctor" className="inline-flex min-h-[44px] items-center font-semibold underline">Back to doctor queue</Link>
    </p>
    {existing ? (
      <p role="status" className="mt-3 rounded-2xl border border-[var(--warning-fg)] bg-[var(--warning-bg)] p-4 text-sm font-medium text-[var(--warning-fg)]">
        A report already exists for this visit. Saving overwrites it. Check history before overwriting.
      </p>
    ) : null}
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
        <input type="date" value={followUp} min={today} onChange={(e) => setFollowUp(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
      </label>
      {msg ? <StatusMessage role="alert">{msg}</StatusMessage> : null}
      <button type="submit" disabled={loading} className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
        {loading ? "Saving…" : existing ? "Overwrite report" : "Save report"}
      </button>
    </form>
    </>
  );
}
