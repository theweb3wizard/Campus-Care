"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { StatusPill } from "@/components/StatusPill";
import { StateBlock } from "@/components/StateBlock";
import { ConfirmDialog } from "@/components/motion/ConfirmDialog";
import { StatusMessage } from "@/components/motion/StatusMessage";

export type RxItem = {
  id: string;
  medicine_name: string;
  dosage: string;
  quantity: number;
  instructions: string;
  status: string;
  patient_name: string;
  patient_id: string;
  stock_qty: number | null;
};

export function PharmacyQueue({ initial }: { initial: RxItem[] }) {
  const [items, setItems] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pickup, setPickup] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<RxItem | null>(null);

  function stockBadge(p: RxItem) {
    if (p.stock_qty === null) {
      return <span className="inline-flex min-h-[32px] items-center rounded-full bg-[var(--warning-bg)] px-3 py-1 text-sm font-semibold text-[var(--warning-fg)]">Not in catalog — check name</span>;
    }
    if (p.stock_qty <= 0) {
      return <span className="inline-flex min-h-[32px] items-center rounded-full bg-[var(--destructive-bg)] px-3 py-1 text-sm font-semibold text-[var(--destructive-fg)]">Out of stock — do not promise pickup</span>;
    }
    if (p.stock_qty < p.quantity) {
      return <span className="inline-flex min-h-[32px] items-center rounded-full bg-[var(--warning-bg)] px-3 py-1 text-sm font-semibold text-[var(--warning-fg)]">Only {p.stock_qty} left — needs restock</span>;
    }
    if (p.stock_qty <= 5) {
      return <span className="inline-flex min-h-[32px] items-center rounded-full border border-[var(--border)] px-3 py-1 text-sm font-medium text-[var(--muted-foreground)]">Low: {p.stock_qty} left</span>;
    }
    return <span className="inline-flex min-h-[32px] items-center rounded-full border border-[var(--border)] px-3 py-1 text-sm font-medium text-[var(--muted-foreground)]">Available: {p.stock_qty}</span>;
  }

  async function dispense(id: string) {
    if (busyId === id) return;
    setBusyId(id);
    setMsg(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("dispense_prescription", { p_prescription: id });
      if (error) throw new Error("Dispense failed. Try again.");
      const res = data as { success: boolean; error?: string };
      if (!res.success) throw new Error(res.error ?? "Dispense failed.");
      const done = items.find((x) => x.id === id);
      setItems((v) => v.map((x) => (x.id === id ? { ...x, status: "Dispensed", stock_qty: x.stock_qty !== null ? Math.max(0, x.stock_qty - x.quantity) : x.stock_qty } : x)));
      setMsg(`${done?.medicine_name ?? "Medicine"} for ${done?.patient_name ?? "patient"} dispensed face to face. Stock deducted once by the database.`);
    } catch (err) {
      setMsg(friendlyError(err, "Dispense failed. If stock is short, restock below then try again."));
    } finally {
      setBusyId(null);
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((p) => (
        <div key={p.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{p.medicine_name} · {p.patient_name}</strong>
            <span className="flex items-center gap-2">
              <StatusPill status={p.status} />
              {stockBadge(p)}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {[p.dosage, `Qty ${p.quantity}`, p.instructions].filter(Boolean).join(" · ")}
          </p>
          {p.status === "Prescribed" ? (
            <div className="mt-3 flex flex-col gap-2">
              <label className="flex min-h-[44px] items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={!!pickup[p.id]}
                  onChange={(e) => setPickup((m) => ({ ...m, [p.id]: e.target.checked }))}
                  className="size-5"
                />
                Patient is present for face-to-face pickup
              </label>
              <button type="button" onClick={() => setPending(p)} disabled={busyId === p.id || !pickup[p.id]} title={!pickup[p.id] ? "Confirm the patient is present first" : undefined} aria-label={`Dispense ${p.medicine_name} for ${p.patient_name}`} className="flex h-11 min-h-[44px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
                {busyId === p.id ? "Dispensing…" : "Dispense face to face"}
              </button>
            </div>
          ) : null}
        </div>
      ))}
      {items.length === 0 ? <StateBlock state="pharmacyEmpty" /> : null}
      {msg ? <div><StatusMessage role="alert">{msg}</StatusMessage></div> : null}
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title="Dispense this medicine?"
        body={pending ? `${pending.medicine_name} x${pending.quantity} to ${pending.patient_name}. Stock moves once and cannot be undone.` : ""}
        confirmLabel="Yes, dispense"
        busy={busyId !== null}
        busyLabel="Dispensing…"
        onConfirm={() => pending && dispense(pending.id)}
      />
    </div>
  );
}
