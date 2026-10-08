"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export type Med = { id: string; name: string; stock_qty: number; unit: string };

/** Pharmacy stock: restock existing, add new. Only reachable by pharmacy/admin (page-gated + RLS). */
export function MedicineStock({ initial }: { initial: Med[] }) {
  const [items, setItems] = useState(initial);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("tabs");
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function restock(m: Med) {
    const n = Number(qty[m.id] ?? "0");
    if (!Number.isInteger(n) || n < 1 || n > 10000) {
      setMsg("Type a whole number between 1 and 10000.");
      return;
    }
    if (busyId === m.id) return;
    setBusyId(m.id);
    setMsg(null);
    try {
      const supabase = createClient();
      // Re-read latest to reduce clobber when two staff restock at once.
      // NOTE (DB mapping): true atomic increment needs a small RPC (e.g. increment_stock).
      // Tell me if you want it — requires DB change, so I did not add it.
      const { data: latest } = await supabase.from("medicines").select("stock_qty").eq("id", m.id).single();
      const base = (latest as { stock_qty: number } | null)?.stock_qty ?? m.stock_qty;
      const { error } = await supabase.from("medicines").update({ stock_qty: base + n }).eq("id", m.id);
      if (error) throw error;
      setItems((v) => v.map((x) => (x.id === m.id ? { ...x, stock_qty: base + n } : x)));
      setQty((q) => ({ ...q, [m.id]: "" }));
      setMsg(`Added ${n} to ${m.name}. New total ${base + n}.`);
    } catch (err) {
      setMsg(friendlyError(err, "Restock failed."));
    } finally {
      setBusyId(null);
    }
  }

  async function addNew() {
    if (!name.trim()) {
      setMsg("Type the medicine name first.");
      return;
    }
    if (busyId) return;
    setBusyId("new");
    setMsg(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("medicines")
        .insert({ name: name.trim(), stock_qty: 0, unit: unit.trim() || "tabs" })
        .select("id,name,stock_qty,unit")
        .single();
      if (error) throw error;
      setItems((v) => [...v, data as Med]);
      setName("");
      setMsg(`${(data as Med).name} added with zero stock. Restock it now — doctors can already type this name.`);
    } catch (err) {
      setMsg(friendlyError(err, "Add failed. It may already exist."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((m) => (
        <div key={m.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{m.name}</strong>
            <span className={m.stock_qty <= 0 ? "inline-flex min-h-[32px] items-center rounded-full bg-[var(--destructive-bg)] px-3 py-1 text-sm font-semibold text-[var(--destructive-fg)]" : m.stock_qty <= 5 ? "inline-flex min-h-[32px] items-center rounded-full bg-[var(--warning-bg)] px-3 py-1 text-sm font-semibold text-[var(--warning-fg)]" : "text-[var(--muted-foreground)]"}>
              {m.stock_qty} {m.unit}{m.stock_qty <= 0 ? " — out, do not promise" : m.stock_qty <= 5 ? " — low" : ""}
            </span>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={qty[m.id] ?? ""}
              onChange={(e) => setQty((q) => ({ ...q, [m.id]: e.target.value }))}
              inputMode="numeric"
              placeholder="Qty"
              aria-label={`Restock quantity for ${m.name}`}
              className="h-11 min-h-[44px] w-28 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base"
            />
            <button type="button" onClick={() => restock(m)} disabled={busyId === m.id} aria-label={`Restock ${m.name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-60">{busyId === m.id ? "Working…" : "Restock"}</button>
          </div>
        </div>
      ))}
      {items.length === 0 ? <p role="status" className="text-[var(--muted-foreground)]">No medicines yet. Add the first below.</p> : null}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
        <p className="font-semibold">New medicine</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" aria-label="Medicine name" className="h-11 min-h-[44px] flex-1 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="Unit" aria-label="Unit" className="h-11 min-h-[44px] w-28 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
          <button type="button" onClick={addNew} disabled={busyId === "new"} className="flex h-11 min-h-[44px] items-center rounded-[10px] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60">{busyId === "new" ? "Working…" : "Add"}</button>
        </div>
      </div>
      {msg ? <div><p role="alert" className="text-sm font-medium">{msg}</p></div> : null}
    </div>
  );
}
