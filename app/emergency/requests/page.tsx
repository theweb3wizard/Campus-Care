import { Suspense } from "react";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { EmergencyQueue } from "@/components/EmergencyQueue";

export const instant = false;

export default async function EmergencyRequestsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Emergency requests</h1>
      <div className="mt-4">
        <Suspense fallback={<p className="text-[var(--muted-foreground)]">Loading…</p>}>
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
  if (!user) return <p className="text-[var(--muted-foreground)]">Staff only. Log in first.</p>;
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role;
  if (!role || !["doctor", "nurse", "receptionist", "admin"].includes(role)) {
    return <p className="text-[var(--muted-foreground)]">Staff only.</p>;
  }
  const { data } = await supabase
    .from("emergency_requests")
    .select("id,reporter_name,location,phone,description,priority,status,created_at")
    .neq("status", "Resolved")
    .order("created_at", { ascending: false })
    .limit(100);
  return <EmergencyQueue initial={(data ?? []) as { id: string; reporter_name: string; location: string; phone: string; description: string; priority: string; status: string; created_at: string }[]} />;
}
