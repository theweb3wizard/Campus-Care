import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import { ReportForm } from "@/components/ReportForm";
import { StaffGate } from "@/components/StaffNav";
import { StaffShell } from "@/components/StaffShell";

export const instant = false;

export default async function NewReportPage() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="font-display text-2xl font-bold">Write report</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">One summary per visit. Plain words the patient understands.</p>
      <Suspense fallback={<p role="status" className="mt-4 text-[var(--muted-foreground)]">Loading report form…</p>}>
        <Gate />
      </Suspense>
    </div>
  );
}

async function Gate() {
  await connection();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return <p className="mt-4 text-[var(--muted-foreground)]">Connect Supabase first.</p>;
  const user = await getSessionUser();
  if (!user) return (
    <div className="mt-4">
      <StaffGate message="Only doctors write reports. Log in first." loginNext="/reports/new" />
    </div>
  );
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role;
  const userName = (me as { full_name?: string } | null)?.full_name ?? "";
  if (!role || !["doctor", "nurse", "admin"].includes(role)) {
    return (
      <div className="mt-4">
        <p role="alert" className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">Only doctors write reports.</p>
        <p className="mt-3 text-sm"><Link href="/profile" className="font-semibold underline">Back to profile</Link></p>
      </div>
    );
  }
  return (
    <StaffShell role={role} userName={userName}>
      <ReportForm />
    </StaffShell>
  );
}
