"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

/**
 * Admin tools: import student registry (CSV lines REG,Name,Faculty,Department),
 * create staff invites, flip open-signup mode. No auth users are created here —
 * people claim rows at signup, so no service key is ever needed.
 */
export function RegistryTools({ openSignup }: { openSignup: boolean }) {
  const [csv, setCsv] = useState("");
  const [staffId, setStaffId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffRole, setStaffRole] = useState("receptionist");
  const [mode, setMode] = useState(openSignup);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function importStudents() {
    setMsg(null);
    const lines = csv.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setMsg("Paste at least one line: REG,Full Name,Faculty,Department");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const rows = lines.map((l) => {
        const [reg, name, faculty, dept] = l.split(",").map((s) => s.trim());
        if (!reg || !name) throw new Error(`Bad line (need REG,Name): ${l}`);
        return { reg_number: reg.toUpperCase(), full_name: name, faculty: faculty || null, department: dept || null };
      });
      const { error } = await supabase.from("students").upsert(rows, { onConflict: "reg_number", ignoreDuplicates: true });
      if (error) throw error;
      setMsg(`Imported ${rows.length} lines. Existing reg numbers were skipped.`);
      setCsv("");
    } catch (err) {
      setMsg(friendlyError(err, "Import failed."));
    } finally {
      setBusy(false);
    }
  }

  async function createInvite() {
    setMsg(null);
    if (!staffId.trim() || !staffName.trim() || !/.+@.+\..+/.test(staffEmail.trim())) {
      setMsg("Staff ID, name, and school email are all needed. The email must match at signup.");
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("staff_invites").insert({
        staff_id: staffId.trim().toUpperCase(),
        full_name: staffName.trim(),
        email: staffEmail.trim().toLowerCase(),
        role: staffRole,
      });
      if (error) throw error;
      setMsg(`Invite created for ${staffName.trim()}. They sign up with Staff ID ${staffId.trim().toUpperCase()} plus this email.`);
      setStaffId("");
      setStaffName("");
      setStaffEmail("");
    } catch (err) {
      setMsg(friendlyError(err, "Invite failed."));
    } finally {
      setBusy(false);
    }
  }

  async function saveMode() {
    setMsg(null);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("clinic_settings")
        .update({ value: mode ? "true" : "false" })
        .eq("key", "allow_open_signup");
      if (error) throw error;
      setMsg(mode ? "Open signup is ON. Unknown reg numbers can register (marked unverified)." : "Open signup is OFF. Only imported reg numbers can sign up.");
    } catch (err) {
      setMsg(friendlyError(err, "Save failed."));
    }
  }

  const input = "h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base";

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">Student registry import</h2>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">One per line: REG,Full Name,Faculty,Department. Claimed rows are never overwritten.</p>
        <textarea
          value={csv}
          onChange={(e) => setCsv(e.target.value)}
          rows={4}
          placeholder={"FUD/2024/001,Amina Bello,Science,Computer Science"}
          className="mt-2 w-full rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base"
        />
        <button type="button" onClick={importStudents} disabled={busy} className="mt-2 flex h-12 min-h-[48px] items-center rounded-[10px] bg-[var(--primary)] px-6 font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
          {busy ? "Importing…" : "Import"}
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">Staff invite</h2>
        <div className="mt-2 grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Staff ID
            <input value={staffId} onChange={(e) => setStaffId(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Full name
            <input value={staffName} onChange={(e) => setStaffName(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            School email (must match at signup)
            <input type="email" value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)} className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Role
            <select value={staffRole} onChange={(e) => setStaffRole(e.target.value)} className={input}>
              <option>receptionist</option>
              <option>doctor</option>
              <option>nurse</option>
              <option>lab</option>
              <option>pharmacy</option>
              <option>admin</option>
            </select>
          </label>
        </div>
        <button type="button" onClick={createInvite} disabled={busy} className="mt-2 flex h-12 min-h-[48px] items-center rounded-[10px] bg-[var(--primary)] px-6 font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
          {busy ? "Creating…" : "Create invite"}
        </button>
      </section>

      <section className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">Signup mode</h2>
        <label className="mt-2 flex min-h-[48px] flex-row items-center gap-2 text-base">
          <input type="checkbox" checked={mode} onChange={(e) => setMode(e.target.checked)} className="size-5" />
          Allow open signup (unknown reg numbers can try the app)
        </label>
        <button type="button" onClick={saveMode} className="mt-2 flex h-12 min-h-[48px] items-center rounded-[10px] border border-[var(--border)] px-6 font-semibold">Save mode</button>
      </section>

      {msg ? <p role="status" className="text-sm font-medium">{msg}</p> : null}
    </div>
  );
}
