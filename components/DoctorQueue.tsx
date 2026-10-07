"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { formatSlot } from "@/lib/booking";
import { StatusPill } from "@/components/StatusPill";

export type QueueItem = {
  id: string;
  service: string;
  starts_at: string;
  status: string;
  reference: string;
  patient_name: string;
  patient_id: string;
};

export function DoctorQueue({ initial }: { initial: QueueItem[] }) {
  const [items, setItems] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [testName, setTestName] = useState<Record<string, string>>({});
  const [rx, setRx] = useState<Record<string, { name: string; dosage: string }>>({});

  async function setStatus(id: string, status: "Confirmed" | "Completed" | "Cancelled") {
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
      if (error) throw error;
      // Keep the visit in step: a completed appointment closes any linked visit,
      // unless drugs are still waiting at pharmacy.
      if (status === "Completed" || status === "Cancelled") {
        await supabase
          .from("visits")
          .update({ status: status === "Completed" ? "completed" : "cancelled" })
          .eq("appointment_id", id)
          .in("status", ["checked_in", "in_consultation"]);
        // Best-effort: move the physical queue entry with it (reception owns the queue,
        // so a failure here is fine — the queue runner stays authoritative).
        try {
          const { data: visit } = await supabase
            .from("visits")
            .select("id")
            .eq("appointment_id", id)
            .limit(1)
            .maybeSingle();
          const visitId = (visit as { id: string } | null)?.id;
          if (visitId) {
            const { data: entry } = await supabase
              .from("queue_entries")
              .select("id")
              .eq("visit_id", visitId)
              .limit(1)
              .maybeSingle();
            const queueId = (entry as { id: string } | null)?.id;
            if (queueId) {
              await supabase.rpc("queue_transition", {
                p_queue: queueId,
                p_action: status === "Completed" ? "complete" : "cancel",
              });
            }
          }
        } catch {
          // queue runner remains source of truth — ignore
        }
      }
      setItems((v) => v.map((x) => (x.id === id ? { ...x, status } : x)));
    } catch (err) {
      setMsg(friendlyError(err, "Update failed."));
    }
  }

  async function orderTest(item: QueueItem) {
    const name = (testName[item.id] ?? "").trim();
    if (!name) {
      setMsg("Type a test name first (e.g. Malaria RDT).");
      return;
    }
    setMsg(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("test_orders").insert({
        appointment_id: item.id,
        patient_id: item.patient_id,
        ordered_by: user?.id ?? null,
        test_name: name,
        status: "Ordered",
      });
      if (error) throw error;
      setTestName((m) => ({ ...m, [item.id]: "" }));
      setMsg(`Test ordered: ${name}. Lab will see it in their inbox.`);
    } catch (err) {
      setMsg(friendlyError(err, "Order failed."));
    }
  }

  async function prescribe(item: QueueItem) {
    const entry = rx[item.id] ?? { name: "", dosage: "" };
    if (!entry.name.trim()) {
      setMsg("Type a medicine name first.");
      return;
    }
    setMsg(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("prescriptions").insert({
        appointment_id: item.id,
        patient_id: item.patient_id,
        prescribed_by: user?.id ?? null,
        medicine_name: entry.name.trim(),
        dosage: entry.dosage.trim(),
        quantity: 1,
        status: "Prescribed",
      });
      if (error) throw error;
      setRx((m) => ({ ...m, [item.id]: { name: "", dosage: "" } }));
      setMsg(`Prescribed ${entry.name.trim()}. Pharmacy will see it.`);
    } catch (err) {
      setMsg(friendlyError(err, "Prescription failed."));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((v) => (
        <div key={v.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{v.patient_name} · {v.service}</strong>
            <StatusPill status={v.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {formatSlot(v.starts_at)} · Ref {v.reference}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setStatus(v.id, "Confirmed")} aria-label={`Confirm ${v.service} for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold">Confirm</button>
            <button type="button" onClick={() => setStatus(v.id, "Completed")} aria-label={`Complete ${v.service} for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold">Complete</button>
            <button type="button" onClick={() => setStatus(v.id, "Cancelled")} aria-label={`Cancel ${v.service} for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold">Cancel</button>
            <Link href={`/reports/new?appointment=${v.id}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">Write report</Link>
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm font-medium">
              <span>Test name for {v.patient_name}</span>
              <span className="flex gap-2">
                <input
                  value={testName[v.id] ?? ""}
                  onChange={(e) => setTestName((m) => ({ ...m, [v.id]: e.target.value }))}
                  placeholder="Test name, e.g. Malaria RDT"
                  aria-label={`Test name for ${v.patient_name}`}
                  className="h-11 min-h-[44px] flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                />
                <button type="button" onClick={() => orderTest(v)} aria-label={`Order test for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold">Order test</button>
              </span>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              <span>Medicine for {v.patient_name}</span>
              <span className="flex gap-2">
                <input
                  value={rx[v.id]?.name ?? ""}
                  onChange={(e) => setRx((m) => ({ ...m, [v.id]: { name: e.target.value, dosage: m[v.id]?.dosage ?? "" } }))}
                  placeholder="Medicine + dosage"
                  aria-label={`Medicine for ${v.patient_name}`}
                  className="h-11 min-h-[44px] flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                />
                <button type="button" onClick={() => prescribe(v)} aria-label={`Prescribe for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold">Prescribe</button>
              </span>
            </label>
          </div>
        </div>
      ))}
      {items.length === 0 ? <p className="text-[var(--muted-foreground)]">No appointments today.</p> : null}
      {msg ? <p role="status" className="text-sm font-medium">{msg}</p> : null}
    </div>
  );
}
