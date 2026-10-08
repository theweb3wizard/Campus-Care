import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { VisitsList } from "@/components/VisitsList";
import { StatusPill } from "@/components/StatusPill";
import { VisitsSkeleton } from "@/components/motion/Skeletons";
import { QueryError } from "@/components/QueryError";

export const instant = false;

export default async function VisitsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Visits</h1>
      <div className="mt-4">
        <Suspense fallback={<VisitsSkeleton />}>
          <VisitsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function VisitsContent() {
  await connection();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!configured) {
    return <p className="mt-2 text-[var(--muted-foreground)]">No visit yet. Book your first visit.</p>;
  }

  const user = await getSessionUser();
  if (!user) {
    return (
      <p className="mt-2 text-[var(--muted-foreground)]">
        <Link href="/login" className="font-semibold underline">Log in</Link> to see upcoming
        visits and history.
      </p>
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id,service,starts_at,status,reference,doctor_id,doctors!inner(room,profiles!inner(full_name))")
    .eq("patient_id", user.id)
    .order("starts_at", { ascending: false })
    .limit(50);
  if (error) return <QueryError />;

  const visits = (data ?? []).map((r) => ({
    id: r.id as string,
    service: r.service as string,
    starts_at: r.starts_at as string,
    status: r.status as string,
    reference: r.reference as string,
    doctor_id: r.doctor_id as string,
    doctor_name:
      ((r.doctors as unknown as { profiles?: { full_name?: string } })?.profiles?.full_name) ?? "Doctor",
    room: (r.doctors as unknown as { room?: string })?.room ?? "",
  }));

  const { data: rx, error: rxError } = await supabase
    .from("prescriptions")
    .select("id,medicine_name,dosage,quantity,status")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (rxError) return <QueryError />;

  const meds = (rx ?? []) as { id: string; medicine_name: string; dosage: string; quantity: number; status: string }[];

  return (
    <div className="flex flex-col gap-6">
      <VisitsList initial={visits} />
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Medicines</h2>
          <Link href="/reports" className="text-sm font-semibold underline">Reports</Link>
        </div>
        {meds.length === 0 ? (
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">No prescriptions yet.</p>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {meds.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
                <span><strong>{m.medicine_name}</strong> · {m.dosage} · Qty {m.quantity}</span>
                <StatusPill status={m.status === "Dispensed" ? "Completed" : m.status} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
