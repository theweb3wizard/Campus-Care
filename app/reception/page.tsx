import { Suspense } from "react";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { ReceptionClient } from "@/components/ReceptionClient";
import { demoDoctors } from "@/lib/booking";
import { QueryError } from "@/components/QueryError";
import { InboxSkeleton } from "@/components/motion/Skeletons";
import { StaffGate } from "@/components/StaffNav";
import { StaffShell } from "@/components/StaffShell";

export const instant = false;

export default async function ReceptionPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Reception</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Find, check in, book, run the queue. One screen, fast.</p>
      <div className="mt-4">
        <Suspense fallback={<InboxSkeleton />}>
          <ReceptionContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ReceptionContent() {
  await connection();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) {
    return (
      <>
        <p className="rounded-2xl border border-dashed border-[var(--warning-fg)] bg-[var(--warning-bg)] p-4 text-sm font-medium text-[var(--warning-fg)]">
          Preview mode — sample doctors and an empty queue. Connect the clinic database for live data.
        </p>
        <ReceptionClient doctors={demoDoctors} initialQueue={[]} />
      </>
    );
  }
  const user = await getSessionUser();
  if (!user) return <StaffGate message="Reception is staff only. Log in first." loginNext="/reception" />;
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role,full_name").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role;
  const userName = (me as { full_name?: string } | null)?.full_name ?? "";
  if (!role || !["receptionist", "admin", "doctor", "nurse"].includes(role)) {
    return <StaffGate message="Reception staff only. Your role cannot open it." loginNext="/reception" />;
  }

  const { data: docs, error: docsError } = await supabase.rpc("active_doctors");
  if (docsError) return <QueryError />;
  const doctors = ((docs ?? []) as unknown as { id: string; specialty: string; room: string; full_name: string }[]).map((d) => ({
    id: d.id, specialty: d.specialty, room: d.room, bio: "", full_name: d.full_name,
  }));

  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { data: entries, error: queueError } = await supabase
    .from("queue_entries")
    .select("id,queue_number,status,visit_id")
    .eq("queue_date", todayStr)
    .order("queue_number")
    .limit(200);
  if (queueError) return <QueryError />;
  const rows = (entries ?? []) as { id: string; queue_number: number; status: string; visit_id: string }[];
  let queue: { id: string; queue_number: number; status: string; patient_name: string }[] = [];
  if (rows.length > 0) {
    const { data: visits } = await supabase.from("visits").select("id,patient_id").in("id", rows.map((r) => r.visit_id));
    const vmap = new Map(((visits ?? []) as { id: string; patient_id: string }[]).map((v) => [v.id, v.patient_id]));
    const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", [...new Set([...vmap.values()])]);
    const pmap = new Map(((profs ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
    queue = rows.map((r) => ({
      id: r.id,
      queue_number: r.queue_number,
      status: r.status,
      patient_name: pmap.get(vmap.get(r.visit_id) ?? "") ?? "Patient",
    }));
  }

  if (doctors.length === 0) {
    return (
      <StaffShell role={role} userName={userName}>
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm text-[var(--muted-foreground)]">
          No active doctors. Ask an admin to add doctors before booking for patients.
        </p>
        <ReceptionClient doctors={doctors} initialQueue={queue} />
      </StaffShell>
    );
  }

  return (
    <StaffShell role={role} userName={userName}>
      <ReceptionClient doctors={doctors} initialQueue={queue} />
    </StaffShell>
  );
}
