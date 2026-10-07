import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { PregnancyClient } from "@/components/PregnancyClient";
import type { PregnancyRecord } from "@/lib/special";

export const instant = false;

export default async function PregnancyPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Pregnancy care</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Registration, follow-up dates, and maternity notes in one place.</p>
      <div className="mt-4">
        <Suspense fallback={<p className="text-[var(--muted-foreground)]">Loading…</p>}>
          <PregnancyContent />
        </Suspense>
      </div>
    </div>
  );
}

async function PregnancyContent() {
  await connection();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return <p className="text-[var(--muted-foreground)]">Connect Supabase to see maternity records.</p>;
  const user = await getSessionUser();
  if (!user) {
    return (
      <p className="text-[var(--muted-foreground)]">
        <Link href="/login" className="font-semibold underline">Log in</Link> to see maternity records.
      </p>
    );
  }
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role ?? "patient";
  const isStaff = ["doctor", "nurse", "admin"].includes(role);

  let query = supabase
    .from("pregnancy_records")
    .select("id,edd,gestational_weeks,risk_level,next_visit,notes,created_at,patient:profiles!pregnancy_records_patient_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!isStaff) query = query.eq("patient_id", user.id);

  const { data } = await query;
  const records = ((data ?? []) as unknown as (PregnancyRecord & { patient: { full_name: string } })[]).map((r) => ({
    ...r,
    patient_name: r.patient?.full_name,
  }));
  return <PregnancyClient records={records} isStaff={isStaff} />;
}
