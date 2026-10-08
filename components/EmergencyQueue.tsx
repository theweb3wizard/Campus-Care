"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import type { EmergencyRequest } from "@/lib/special";
import { StatusPill } from "@/components/StatusPill";

export function EmergencyQueue({ initial }: { initial: EmergencyRequest[] }) {
  const [items, setItems] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(id: string, status: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("emergency_requests").update({ status }).eq("id", id);
      if (error) throw error;
      setItems((v) => v.map((x) => (x.id === id ? { ...x, status } : x)));
      setMsg(status === "Resolved" ? "Resolved." : "Acknowledged. Team notified.");
    } catch (err) {
      setMsg(friendlyError(err, "Update failed."));
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) return <p className="text-[var(--muted-foreground)]">No open emergencies.</p>;

  return (
    <div className="flex flex-col gap-3">
      {items.map((e) => (
        <div key={e.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{e.priority} · {e.reporter_name}</strong>
            <StatusPill status={e.status} />
          </div>
          <p className="mt-1 text-sm">{e.description}</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{e.location} · {e.phone}</p>
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => setStatus(e.id, "Acknowledged")} disabled={busyId === e.id} aria-label={`Acknowledge emergency from ${e.reporter_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-60">Acknowledge</button>
            <button type="button" onClick={() => setStatus(e.id, "Resolved")} disabled={busyId === e.id} aria-label={`Resolve emergency from ${e.reporter_name}`} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-60">Resolve</button>
          </div>
        </div>
      ))}
      {msg ? <p role="status" className="text-sm font-medium">{msg}</p> : null}
    </div>
  );
}
