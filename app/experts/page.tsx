import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { demoDoctors } from "@/lib/booking";
import { ExpertFinder } from "@/components/ExpertFinder";

export const instant = false;

export default async function ExpertsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Find a specialist</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Search by name or field, then book.</p>
      <div className="mt-4">
        <Suspense fallback={<p className="text-[var(--muted-foreground)]">Loading…</p>}>
          <ExpertsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ExpertsContent() {
  await connection();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return <ExpertFinder doctors={demoDoctors} />;
  const supabase = await createClient();
  const { data } = await supabase.rpc("active_doctors");
  const doctors = ((data ?? []) as unknown as { id: string; specialty: string; room: string; full_name: string }[]).map((r) => ({
    id: r.id,
    specialty: r.specialty,
    room: r.room,
    bio: "",
    full_name: r.full_name,
  }));
  return <ExpertFinder doctors={doctors.length > 0 ? doctors : demoDoctors} />;
}
