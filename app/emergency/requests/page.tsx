import { Suspense } from "react";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { EmergencyQueue } from "@/components/EmergencyQueue";
import { InboxSkeleton } from "@/components/motion/Skeletons";
import { QueryError } from "@/components/QueryError";
import { StaffNav, StaffGate } from "@/components/StaffNav";

export const instant = false;

export default async function EmergencyRequestsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Emergency requests</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Newest first. Call the reporter, then mark status.</p>
      <div className="mt-4">
        <Suspense fallback={<InboxSkeleton />}>
          <RequestsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function RequestsContent() {
  await connection();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return <p className="text-[var(--muted-foreground)]">Connect Supabase first.</p>;
  const user = await getSessionUser();
  if (!user) return <StaffGate message="Emergency queue is staff only. Log in first." loginNext="/emergency/requests" />;
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role;
  if (!role || !["doctor", "nurse", "receptionist", "admin"].includes(role)) {
    return <StaffGate message="Emergency queue is staff only. Your role cannot open it." loginNext="/emergency/requests" />;
  }
  const { data, error: listError } = await supabase
    .from("emergency_requests")
    .select("id,reporter_name,location,phone,description,priority,status,created_at")
    .neq("status", "Resolved")
    .order("created_at", { ascending: false })
    .limit(100);
  if (listError) return <QueryError />;
  return (
    <>
      <StaffNav role={role} />
      <div className="mt-4">
        <EmergencyQueue initial={(data ?? []) as { id: string; reporter_name: string; location: string; phone: string; description: string; priority: string; status: string; created_at: string }[]} />
      </div>
    </>
  );
}
