"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";

export type Profile = {
  id: string;
  login_id: string;
  role: string;
  full_name: string;
  card_number: string | null;
  phone: string | null;
  verified: boolean;
};

export function ProfileForm({ initial }: { initial: Profile }) {
  const [fullName, setFullName] = useState(initial.full_name ?? "");
  const [phone, setPhone] = useState(initial.phone ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!fullName.trim()) {
      setMsg("Type your full name.");
      return;
    }
    if (phone.trim() !== "" && phone.replace(/\D/g, "").length < 7) {
      setMsg("Phone looks too short. Alerts need at least 7 digits, or leave it empty.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName.trim(), phone: phone.trim() || null, updated_at: new Date().toISOString() })
        .eq("id", initial.id);
      if (error) throw error;
      setMsg("Saved. Alerts use this phone number.");
    } catch (err) {
      setMsg(friendlyError(err, "Save failed."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Full name
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required autoComplete="name" className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Phone (for alerts)
          <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="h-12 min-h-[48px] rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
        </label>
      </div>
      {msg ? <div><p role="alert" className="text-sm font-medium">{msg}</p></div> : null}
      <button type="submit" disabled={loading} className="flex h-12 min-h-[48px] items-center justify-center rounded-[10px] bg-[var(--primary)] px-6 text-base font-semibold text-[var(--primary-foreground)] disabled:opacity-60">
        {loading ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
