"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { emergencyPriorities } from "@/lib/special";
import { StatusMessage, Spinner } from "@/components/motion/StatusMessage";
import { useToast } from "@/components/motion/Toaster";
import { SuccessDialog } from "@/components/motion/SuccessDialog";

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
  const [sentOpen, setSentOpen] = useState(false);
  const { toast } = useToast();

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
    if (loading) return;
    setLoading(true);
    setMsg(null);
    setOffline(false);
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      setOffline(true);
      setMsg("You are offline. Ask someone near you to call the clinic now, then try again.");
      return;
    }
    if (phone.replace(/\D/g, "").length < 7) {
      setLoading(false);
      setMsg("Type a reachable phone number with at least 7 digits so staff can call back.");
      return;
    }
    if (description.trim().length < 10 || location.trim().length < 3) {
      setLoading(false);
      setMsg("Add a short description (10+ characters) and a clear location so staff can find you.");
      return;
    }
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("emergency_requests").insert({
        patient_id: user?.id ?? null,
        reporter_name: name.trim(),
        location: location.trim(),
        phone: phone.trim(),
        description: description.trim().slice(0, 2000),
        priority,
        status: "Open",
      });
      if (error) throw error;
      setName("");
      setLocation("");
      setPhone("");
      setDescription("");
      setPriority("Urgent");
      setMsg("Received. Go to Clinic Casualty now — staff have been alerted. If no one calls in 10 minutes, come in person.");
      setSentOpen(true);
      toast({ kind: "success", title: "Emergency sent", body: "Staff have been alerted. Go to Casualty now." });
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
        <p role="status" className="text-sm text-[var(--muted-foreground)]">Loading clinic number…</p>
      ) : clinicPhone ? (
        <a href={`tel:${clinicPhone.replace(/\s+/g, "")}`} className="flex h-14 min-h-[56px] items-center justify-center rounded-[10px] bg-[var(--emergency)] px-6 text-lg font-bold text-white hover:bg-[var(--emergency-hover)]">
          Call {clinicPhone}
        </a>
      ) : (
        <p role="status" className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          Clinic number is not set. Go to Clinic Casualty now or ask someone near you to help.
        </p>
      )}
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
          <span className="text-sm font-normal text-[var(--muted-foreground)]">Staff triage on arrival. Logged-out requests are treated as Urgent first.</span>
        </label>
        {msg ? <StatusMessage role={offline ? "alert" : "status"}>{msg}</StatusMessage> : null}
        <button type="submit" disabled={loading} className="flex h-12 min-h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--emergency)] px-6 text-base font-bold text-white hover:bg-[var(--emergency-hover)] disabled:opacity-60">
          {loading ? (<><Spinner /> Sending…</>) : "Send emergency request"}
        </button>
      </form>
      <SuccessDialog
        open={sentOpen}
        onOpenChange={setSentOpen}
        title="Help is on the way"
        body="Stay where you are and keep your phone close. Go to Clinic Casualty now if you can."
        actionLabel="Back home"
        actionHref="/"
      />
    </div>
  );
}
