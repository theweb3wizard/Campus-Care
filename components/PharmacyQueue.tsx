"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { StatusPill } from "@/components/StatusPill";

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

  async function dispense(id: string) {
    setMsg(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("dispense_prescription", { p_prescription: id });
      if (error) throw new Error("Dispense failed. Try again.");
      const res = data as { success: boolean; error?: string };
      if (!res.success) throw new Error(res.error ?? "Dispense failed.");
      setItems((v) => v.map((x) => (x.id === id ? { ...x, status: "Dispensed" } : x)));
      setMsg("Dispensed. The patient is alerted automatically.");
    } catch (err) {
      setMsg(friendlyError(err, "Dispense failed."));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((p) => (
        <div key={p.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{p.medicine_name} · {p.patient_name}</strong>
            <StatusPill status={p.status} />
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {p.dosage} · Qty {p.quantity}{p.instructions ? ` · ${p.instructions}` : ""}
            {p.stock_qty !== null ? ` · Available: ${p.stock_qty}` : ""}
          </p>
          {p.status === "Prescribed" ? (
            <button type="button" onClick={() => dispense(p.id)} className="mt-3 flex h-11 min-h-[44px] items-center rounded-[10px] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)]">
              Mark dispensed
            </button>
          ) : null}
        </div>
      ))}
      {items.length === 0 ? <p className="text-[var(--muted-foreground)]">Nothing to dispense.</p> : null}
      {msg ? <p role="status" className="text-sm font-medium">{msg}</p> : null}
    </div>
  );
}
