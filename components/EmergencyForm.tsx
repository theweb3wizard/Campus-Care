"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { emergencyPriorities } from "@/lib/special";
import { StatusMessage, Spinner } from "@/components/motion/StatusMessage";

export function EmergencyForm() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [phone, setPhone] = useState("");
  const [clinicPhone, setClinicPhone] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Urgent");
  const [msg, setMsg] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [loading, setLoading] = useState(false);
  const [phoneLoaded, setPhoneLoaded] = useState(false);

  // Clinic phone comes from settings (admin-editable). No hardcoded number anywhere.
  useEffect(() => {
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("clinic_settings")
          .select("value")
          .eq("key", "clinic_phone")
          .single();
        const v = (data as { value?: string } | null)?.value?.trim();
        if (v) setClinicPhone(v);
      } catch {
        // stays null — page still works without a number
      } finally {
        setPhoneLoaded(true);
      }
    })();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    setOffline(false);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      setOffline(true);
      setMsg("You are offline. Ask someone near you to call the clinic now, then try again.");
      return;
    }
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("emergency_requests").insert({
        patient_id: user?.id ?? null,
        reporter_name: name,
        location,
        phone,
        description,
        priority,
        status: "Open",
      });
      if (error) throw error;
      setMsg("Received. Go to Clinic Casualty now — staff have been alerted.");
    } catch (err) {
      if (err instanceof TypeError) {
        setOffline(true);
        setMsg("You are offline. Ask someone near you to call the clinic now, then try again.");
      } else {
        setMsg(friendlyError(err, "Send failed. Call the clinic directly."));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
        Go to Clinic Casualty now. If the line is busy, send details below — staff see it instantly.
      </p>
      {!phoneLoaded ? (
        <p className="text-sm text-[var(--muted-foreground)]" aria-busy="true">Loading clinic number…</p>
      ) : clinicPhone ? (
        <a href={`tel:${clinicPhone.replace(/\s+/g, "")}`} className="flex h-14 min-h-[56px] items-center justify-center rounded-[10px] bg-[#991b1b] px-6 text-lg font-bold text-white">
          Call {clinicPhone}
        </a>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-display text-lg font-semibold">Request emergency help</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Your name
            <input required value={name} onChange={(e) => setName(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Phone
            <input required value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Where are you?
          <input required value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Hostel B, Room 12" className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          What happened?
          <textarea required value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-base" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          How urgent?
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-12 rounded-[10px] border border-[var(--border)] bg-[var(--background)] px-3 text-base">
            {emergencyPriorities.map((p) => <option key={p}>{p}</option>)}
          </select>
        </label>
        {msg ? <StatusMessage role={offline ? "alert" : "status"}>{msg}</StatusMessage> : null}
        <button type="submit" disabled={loading} className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[#991b1b] px-6 text-base font-bold text-white disabled:opacity-60">
          {loading ? (<><Spinner /> Sending…</>) : "Send emergency request"}
        </button>
      </form>
    </div>
  );
}
