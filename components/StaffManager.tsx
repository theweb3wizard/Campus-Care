"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export type StaffRow = {
  id: string;
  full_name: string;
  card_number: string | null;
  role: string;
  doctor?: { specialty: string; room: string; is_active: boolean } | null;
};

const roles = ["patient", "doctor", "nurse", "receptionist", "lab", "pharmacy", "admin"];

export function StaffManager({ initial }: { initial: StaffRow[] }) {
  const [rows, setRows] = useState(initial);
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const filtered = rows.filter((r) =>
    `${r.full_name} ${r.card_number ?? ""} ${r.role}`.toLowerCase().includes(q.toLowerCase())
  );

  async function save(row: StaffRow, patch: { role: string; specialty: string; room: string; is_active: boolean }) {
    setSaving(row.id);
    setMsg(null);
    try {
      const supabase = createClient();
      const { error: roleErr } = await supabase.from("profiles").update({ role: patch.role }).eq("id", row.id);
      if (roleErr) throw roleErr;
      if (patch.role === "doctor") {
        const { error: docErr } = await supabase.from("doctors").upsert(
          { id: row.id, specialty: patch.specialty, room: patch.room, is_active: patch.is_active },
          { onConflict: "id" }
        );
        if (docErr) throw docErr;
      } else if (row.doctor) {
        await supabase.from("doctors").update({ is_active: false }).eq("id", row.id);
      }
      setRows((v) =>
        v.map((x) =>
          x.id === row.id
            ? { ...x, role: patch.role, doctor: patch.role === "doctor" ? { specialty: patch.specialty, room: patch.room, is_active: patch.is_active } : x.doctor ? { ...x.doctor, is_active: false } : null }
            : x
        )
      );
      setMsg(`Saved ${row.full_name} as ${patch.role}.`);
    } catch (err) {
      setMsg(friendlyError(err, "Save failed."));
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, card, or role…"
        aria-label="Search staff"
        className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--card)] px-4 text-base"
      />
      {filtered.map((r) => (
        <StaffCard key={r.id} row={r} saving={saving === r.id} onSave={save} />
      ))}
      {filtered.length === 0 ? <p className="text-[var(--muted-foreground)]">Nobody matches that search.</p> : null}
      {msg ? <p role="status" className="text-sm font-medium">{msg}</p> : null}
    </div>
  );
}

function StaffCard({
  row,
  saving,
  onSave,
}: {
  row: StaffRow;
  saving: boolean;
  onSave: (row: StaffRow, patch: { role: string; specialty: string; room: string; is_active: boolean }) => void;
}) {
  const [role, setRole] = useState(row.role);
  const [specialty, setSpecialty] = useState(row.doctor?.specialty ?? "General");
  const [room, setRoom] = useState(row.doctor?.room ?? "Clinic 1");
  const [active, setActive] = useState(row.doctor?.is_active ?? true);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <strong>{row.full_name}</strong>
        <span className="text-sm text-[var(--muted-foreground)]">{row.card_number ?? "No card"}</span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Role
          <select value={role} onChange={(e) => setRole(e.target.value)} className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base">
            {roles.map((r) => <option key={r}>{r}</option>)}
          </select>
        </label>
        {role === "doctor" ? (
          <>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Specialty
              <input value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Room
              <input value={room} onChange={(e) => setRoom(e.target.value)} className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
            </label>
            <label className="flex min-h-[48px] flex-row items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="size-5" />
              Visible for booking
            </label>
          </>
        ) : null}
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={() => onSave(row, { role, specialty, room, is_active: active })}
        className="mt-3 flex h-11 min-h-[44px] items-center rounded-[10px] bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-foreground)] disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
