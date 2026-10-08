import { Suspense } from "react";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { DoctorQueue } from "@/components/DoctorQueue";
import { InboxSkeleton } from "@/components/motion/Skeletons";
import { QueryError } from "@/components/QueryError";
import { StaffNav, StaffGate } from "@/components/StaffNav";

export const instant = false;

export default async function DoctorPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Doctor queue</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Today&apos;s appointments in time order. Confirm first, then Complete or Cancel with care.</p>
      <div className="mt-4">
        <Suspense fallback={<InboxSkeleton />}>
          <QueueContent />
        </Suspense>
      </div>
    </div>
  );
}

async function QueueContent() {
  await connection();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!configured) {
    return <p className="mt-2 text-[var(--muted-foreground)]">Connect Supabase to see today&apos;s queue.</p>;
  }
  const user = await getSessionUser();
  if (!user) {
    return <StaffGate message="Doctor queue is staff only. Log in first." loginNext="/doctor" />;
  }

  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role;
  if (!role || !["doctor", "nurse", "receptionist", "admin"].includes(role)) {
    return <StaffGate message="Doctor queue is staff only. Your role cannot open it." loginNext="/doctor" />;
  }

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  let query = supabase
    .from("appointments")
    .select("id,service,starts_at,status,reference,patient_id,patient:profiles!appointments_patient_id_fkey(full_name)")
    .gte("starts_at", start.toISOString())
    .lte("starts_at", end.toISOString())
    .order("starts_at", { ascending: true })
    .limit(100);

  if (role === "doctor") {
    query = query.eq("doctor_id", user.id);
  }

  const { data, error: queueError } = await query;
  if (queueError) return <QueryError />;
  const items = (data ?? []).map((r) => ({
    id: r.id as string,
    service: r.service as string,
    starts_at: r.starts_at as string,
    status: r.status as string,
    reference: r.reference as string,
    patient_id: r.patient_id as string,
    patient_name:
      ((r.patient as unknown as { full_name?: string })?.full_name) ?? "Patient",
  }));

  return (
    <>
      <StaffNav role={role} />
      <div className="mt-4">
        <DoctorQueue initial={items} />
      </div>
    </>
  );
}
