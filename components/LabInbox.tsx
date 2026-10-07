"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { StatusPill } from "@/components/StatusPill";
import { notifyUser } from "@/lib/notify";

export type LabItem = {
  id: string;
  test_name: string;
  status: string;
  result_text: string;
  is_released: boolean;
  patient_name: string;
  patient_id: string;
};

export function LabInbox({ initial }: { initial: LabItem[] }) {
  const [items, setItems] = useState(initial);
  const [results, setResults] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);

  async function save(id: string, patch: { status?: string; result_text?: string; is_released?: boolean; release_note?: string }) {
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("test_orders").update(patch).eq("id", id);
      if (error) throw error;
      setItems((v) => v.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      if (patch.is_released) {
        const item = items.find((x) => x.id === id);
        if (item) await notifyUser(item.patient_id, "Test result ready", `${item.test_name} is ready. Open Tests to view it.`, "/tests");
      }
      setMsg("Saved. Patient sees the result only after Ready + Release.");
    } catch (err) {
      setMsg(friendlyError(err, "Save failed."));
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {items.map((t) => (
        <div key={t.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{t.test_name} · {t.patient_name}</strong>
            <span className="flex items-center gap-2">
              <StatusPill status={t.status} />
              {t.is_released ? (
                <span className="inline-flex min-h-[32px] items-center rounded-full bg-[var(--success-bg)] px-3 py-1 text-sm font-medium text-[var(--success-fg)]">Released</span>
              ) : (
                <span className="inline-flex min-h-[32px] items-center rounded-full border border-[var(--border)] px-3 py-1 text-sm font-medium text-[var(--muted-foreground)]">Not released</span>
              )}
            </span>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-sm font-medium">
            Result
            <textarea
              value={results[t.id] ?? t.result_text}
              onChange={(e) => setResults((m) => ({ ...m, [t.id]: e.target.value }))}
              rows={2}
              className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {t.status !== "Ready" ? (
              <button type="button" onClick={() => save(t.id, { status: "Sampled" })} disabled={t.status === "Sampled"} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50">Mark sampled</button>
            ) : null}
            <button
              type="button"
              onClick={() => save(t.id, { status: "Ready", result_text: results[t.id] ?? t.result_text })}
              disabled={t.status === "Ready"}
              className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50"
            >
              Mark ready
            </button>
            <button
              type="button"
              onClick={() => save(t.id, { result_text: results[t.id] ?? t.result_text, is_released: !t.is_released, release_note: !t.is_released ? "Released by lab. Come to the clinic if you have questions." : "" })}
              disabled={t.status !== "Ready" && !t.is_released}
              className="flex h-11 min-h-[44px] items-center rounded-[10px] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50"
            >
              {t.is_released ? "Unrelease" : "Release to patient"}
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 ? <p className="text-[var(--muted-foreground)]">Inbox empty. Ordered tests appear here.</p> : null}
      {msg ? <p role="status" className="text-sm font-medium">{msg}</p> : null}
    </div>
  );
}
