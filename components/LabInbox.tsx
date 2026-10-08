"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { StatusPill } from "@/components/StatusPill";
import { notifyUser } from "@/lib/notify";
import { ConfirmDialog } from "@/components/motion/ConfirmDialog";
import { StatusMessage } from "@/components/motion/StatusMessage";
import { StateBlock } from "@/components/StateBlock";

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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingRelease, setPendingRelease] = useState<LabItem | null>(null);

  async function save(id: string, patch: { status?: string; result_text?: string; is_released?: boolean; release_note?: string }) {
    if (busyId === id) return;
    setBusyId(id);
    setMsg(null);
    try {
      const supabase = createClient();
      const current = items.find((x) => x.id === id);
      const nextPatch = { ...patch };
      // Never silently blank a released result: require text when marking Ready.
      if (nextPatch.status === "Ready" && !(nextPatch.result_text ?? "").trim()) {
        throw new Error("Type the result first, then mark Ready.");
      }
      const { error } = await supabase.from("test_orders").update(nextPatch).eq("id", id);
      if (error) throw error;
      setItems((v) => v.map((x) => (x.id === id ? { ...x, ...nextPatch } : x)));
      if (nextPatch.is_released) {
        const item = current ?? items.find((x) => x.id === id);
        if (item) await notifyUser(item.patient_id, "Test result ready", `${item.test_name} is ready. Open Tests to view it.`, "/tests");
        setMsg(`${current?.test_name ?? "Test"} released. Patient sees it in Tests now.`);
      } else if (nextPatch.is_released === false) {
        setMsg(`${current?.test_name ?? "Test"} unreleased. Patient no longer sees it. Only unrelease if the result was wrong.`);
      } else {
        setMsg("Saved. Patient sees the result only after Ready plus Release.");
      }
    } catch (err) {
      setMsg(friendlyError(err, "Save failed."));
    } finally {
      setBusyId(null);
      setPendingRelease(null);
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
            Result {t.is_released ? <span className="font-normal text-[var(--warning-fg)]">Released — editing then saving changes what the patient sees. Re-check before saving.</span> : null}
            <textarea
              value={results[t.id] ?? t.result_text}
              onChange={(e) => setResults((m) => ({ ...m, [t.id]: e.target.value }))}
              rows={2}
              className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            />
          </label>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">Steps: Sampled, then Ready, then Release. Patient sees nothing until Release.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {t.status !== "Ready" ? (
              <button type="button" onClick={() => save(t.id, { status: "Sampled" })} disabled={t.status === "Sampled" || busyId === t.id} className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50">{busyId === t.id ? "Saving…" : "Mark sampled"}</button>
            ) : null}
            <button
              type="button"
              onClick={() => save(t.id, { status: "Ready", result_text: results[t.id] ?? t.result_text })}
              disabled={t.status === "Ready" || busyId === t.id}
              className="flex h-11 min-h-[44px] items-center rounded-[10px] border border-[var(--border)] px-4 text-sm font-semibold disabled:opacity-50"
            >
              {busyId === t.id ? "Saving…" : "Mark ready"}
            </button>
            <button
              type="button"
              onClick={() => (t.is_released ? setPendingRelease(t) : save(t.id, { result_text: results[t.id] ?? t.result_text, is_released: true, release_note: "Released by lab. Come to the clinic if you have questions." }))}
              disabled={(t.status !== "Ready" && !t.is_released) || busyId === t.id}
              title={t.status !== "Ready" && !t.is_released ? "Mark Ready first, then release" : undefined}
              className="flex h-11 min-h-[44px] items-center rounded-[10px] bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-50"
            >
              {busyId === t.id ? "Saving…" : t.is_released ? "Unrelease" : "Release to patient"}
            </button>
          </div>
        </div>
      ))}
      {items.length === 0 ? <StateBlock state="labEmpty" /> : null}
      {msg ? <div><StatusMessage role="alert">{msg}</StatusMessage></div> : null}
      <ConfirmDialog
        open={pendingRelease !== null}
        onOpenChange={(o) => !o && setPendingRelease(null)}
        title="Unrelease this result?"
        body={pendingRelease ? `${pendingRelease.test_name} · ${pendingRelease.patient_name}. Patient was told it is ready. They will no longer see it.` : ""}
        confirmLabel="Yes, unrelease"
        busy={busyId !== null}
        busyLabel="Working…"
        onConfirm={() => pendingRelease && save(pendingRelease.id, { is_released: false, release_note: "" })}
      />
    </div>
  );
}
