import { Suspense } from "react";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { LabInbox } from "@/components/LabInbox";
import { InboxSkeleton } from "@/components/motion/Skeletons";

export const instant = false;

export default async function LabPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Lab inbox</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Ordered tests first. Release only when a clinician approves.</p>
      <div className="mt-4">
        <Suspense fallback={<InboxSkeleton />}>
          <LabContent />
        </Suspense>
      </div>
    </div>
  );
}

async function LabContent() {
  await connection();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!configured) return <p className="text-[var(--muted-foreground)]">Connect Supabase to see the inbox.</p>;
  const user = await getSessionUser();
  if (!user) return <p className="text-[var(--muted-foreground)]">Staff only. Log in first.</p>;

  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role;
  if (!role || !["lab", "doctor", "nurse", "admin"].includes(role)) {
    return <p className="text-[var(--muted-foreground)]">Lab staff only.</p>;
  }

  const { data } = await supabase
    .from("test_orders")
    .select("id,test_name,status,result_text,is_released,patient_id,patient:profiles!test_orders_patient_id_fkey(full_name)")
    .neq("status", "Cancelled")
    .order("created_at", { ascending: true })
    .limit(100);

  const items = (data ?? []).map((r) => ({
    id: r.id as string,
    test_name: r.test_name as string,
    status: r.status as string,
    result_text: (r.result_text as string) ?? "",
    is_released: Boolean(r.is_released),
    patient_id: r.patient_id as string,
    patient_name: ((r.patient as unknown as { full_name?: string })?.full_name) ?? "Patient",
  }));

  return <LabInbox initial={items} />;
}
