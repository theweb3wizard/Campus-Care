import { Suspense } from "react";
import { connection } from "next/server";
import { getSessionUser, createClient } from "@/lib/supabase/server";
import { ReportForm } from "@/components/ReportForm";

export const instant = false;

export default async function NewReportPage() {
  return (
    <div className="mx-auto w-full max-w-md">
      <h1 className="font-display text-2xl font-bold">Write report</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">One summary per visit. Plain words the patient understands.</p>
      <Suspense fallback={<p className="mt-4 text-[var(--muted-foreground)]">Loading…</p>}>
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
  if (!user) return <p className="mt-4 text-[var(--muted-foreground)]">Staff only. Log in first.</p>;
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role;
  if (!role || !["doctor", "nurse", "admin"].includes(role)) {
    return <p className="mt-4 text-[var(--muted-foreground)]">Only doctors write reports.</p>;
  }
  return <ReportForm />;
}
