"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { formatSlot } from "@/lib/booking";
import { StatusPill } from "@/components/StatusPill";
import { ConfirmDialog } from "@/components/motion/ConfirmDialog";
import { StatusMessage } from "@/components/motion/StatusMessage";
import { StateBlock } from "@/components/StateBlock";

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
  const [rx, setRx] = useState<Record<string, { name: string; dosage: string; qty: string; notes: string }>>({});
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [pendingStatus, setPendingStatus] = useState<{ item: QueueItem; status: "Completed" | "Cancelled" } | null>(null);

  function setBusy(id: string, on: boolean) {
    setBusyIds((s) => {
      const n = new Set(s);
      if (on) n.add(id);
      else n.delete(id);
      return n;
    });
  }

  function isBusy(id: string) {
    return busyIds.has(id);
  }

  async function setStatus(id: string, status: "Confirmed" | "Completed" | "Cancelled", patientName: string) {
    if (isBusy(id)) return;
    setBusy(id, true);
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
      setMsg(`${patientName}: marked ${status}.`);
    } catch (err) {
      setMsg(friendlyError(err, "Update failed."));
    } finally {
      setBusy(id, false);
      setPendingStatus(null);
    }
  }

  async function orderTest(item: QueueItem) {
    const name = (testName[item.id] ?? "").trim();
    if (!name) {
      setMsg(`${item.patient_name}: type a test name first (e.g. Malaria RDT).`);
      return;
    }
    if (isBusy(item.id)) return;
    setBusy(item.id, true);
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
      setMsg(`${item.patient_name}: test ordered (${name}). Lab will see it in their inbox.`);
    } catch (err) {
      setMsg(friendlyError(err, "Order failed."));
    } finally {
      setBusy(item.id, false);
    }
  }

  async function prescribe(item: QueueItem) {
    const entry = rx[item.id] ?? { name: "", dosage: "", qty: "1", notes: "" };
    if (!entry.name.trim()) {
      setMsg(`${item.patient_name}: type a medicine name first.`);
      return;
    }
    const qty = Math.max(1, Math.min(90, Number.parseInt(entry.qty || "1", 10) || 1));
    if (isBusy(item.id)) return;
    setBusy(item.id, true);
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
        quantity: qty,
        instructions: entry.notes.trim(),
        status: "Prescribed",
      });
      if (error) throw error;
      setRx((m) => ({ ...m, [item.id]: { name: "", dosage: "", qty: "1", notes: "" } }));
      setMsg(`${item.patient_name}: prescribed ${entry.name.trim()} x${qty}. Pharmacy will see it.`);
    } catch (err) {
      setMsg(friendlyError(err, "Prescription failed."));
    } finally {
      setBusy(item.id, false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((v) => {
        const busy = isBusy(v.id);
        const r = rx[v.id] ?? { name: "", dosage: "", qty: "1", notes: "" };
        return (
        <div key={v.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{v.patient_name} · {v.service}</strong>
            <StatusPill status={v.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {formatSlot(v.starts_at)} · <span className="font-slip">Ref {v.reference}</span>
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setStatus(v.id, "Confirmed", v.patient_name)} disabled={busy} aria-label={`Confirm ${v.service} for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-60">{busy ? "Working…" : "Confirm"}</button>
            <button type="button" onClick={() => setPendingStatus({ item: v, status: "Completed" })} disabled={busy} aria-label={`Complete ${v.service} for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary)] disabled:opacity-60">Complete</button>
            <button type="button" onClick={() => setPendingStatus({ item: v, status: "Cancelled" })} disabled={busy} aria-label={`Cancel ${v.service} for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--destructive-fg)] px-4 text-sm font-semibold text-[var(--destructive-fg)] disabled:opacity-60">Cancel</button>
            <Link href={`/reports/new?appointment=${v.id}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">Write report</Link>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--border)] p-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Test name for {v.patient_name}
                <input
                  value={testName[v.id] ?? ""}
                  onChange={(e) => setTestName((m) => ({ ...m, [v.id]: e.target.value }))}
                  placeholder="Test name, e.g. Malaria RDT"
                  aria-label={`Test name for ${v.patient_name}`}
                  className="h-11 min-h-[44px] flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                />
              </label>
              <button type="button" onClick={() => orderTest(v)} disabled={busy} aria-label={`Order test for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center justify-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-60">{busy ? "Working…" : "Order test"}</button>
            </div>
            <div className="flex flex-col gap-2 rounded-[10px] border border-[var(--border)] p-3">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Medicine for {v.patient_name}
                <input
                  value={r.name}
                  onChange={(e) => setRx((m) => ({ ...m, [v.id]: { ...r, name: e.target.value } }))}
                  placeholder="Medicine name"
                  aria-label={`Medicine for ${v.patient_name}`}
                  className="h-11 min-h-[44px] flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Dosage
                  <input
                    value={r.dosage}
                    onChange={(e) => setRx((m) => ({ ...m, [v.id]: { ...r, dosage: e.target.value } }))}
                    placeholder="e.g. 500mg twice daily"
                    aria-label={`Dosage for ${v.patient_name}`}
                    className="h-11 min-h-[44px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Qty
                  <input
                    value={r.qty}
                    inputMode="numeric"
                    onChange={(e) => setRx((m) => ({ ...m, [v.id]: { ...r, qty: e.target.value.replace(/[^0-9]/g, "").slice(0, 2) || "1" } }))}
                    aria-label={`Quantity for ${v.patient_name}`}
                    className="h-11 min-h-[44px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Instructions
                <input
                  value={r.notes}
                  onChange={(e) => setRx((m) => ({ ...m, [v.id]: { ...r, notes: e.target.value } }))}
                  placeholder="e.g. After food, 3 days"
                  aria-label={`Instructions for ${v.patient_name}`}
                  className="h-11 min-h-[44px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-sm"
                />
              </label>
              <button type="button" onClick={() => prescribe(v)} disabled={busy} aria-label={`Prescribe for ${v.patient_name}`} className="flex h-11 min-h-[44px] items-center justify-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-60">{busy ? "Working…" : "Prescribe"}</button>
            </div>
          </div>
        </div>
        );
      })}
      {items.length === 0 ? <StateBlock state="doctorEmpty" href="/reception" /> : null}
      {msg ? <div><StatusMessage role="alert">{msg}</StatusMessage></div> : null}
      <ConfirmDialog
        open={pendingStatus !== null}
        onOpenChange={(o) => !o && setPendingStatus(null)}
        title={pendingStatus?.status === "Completed" ? "Complete this visit?" : "Cancel this visit?"}
        body={pendingStatus ? `${pendingStatus.item.patient_name} · ${pendingStatus.item.service} · Ref ${pendingStatus.item.reference}. ${pendingStatus.status === "Completed" ? "This closes the visit." : "This closes the visit and frees nothing else. This cannot be undone."}` : ""}
        confirmLabel={pendingStatus?.status === "Completed" ? "Yes, complete" : "Yes, cancel visit"}
        busy={pendingStatus ? isBusy(pendingStatus.item.id) : false}
        busyLabel="Working…"
        onConfirm={() => pendingStatus && setStatus(pendingStatus.item.id, pendingStatus.status, pendingStatus.item.patient_name)}
      />
    </div>
  );
}
