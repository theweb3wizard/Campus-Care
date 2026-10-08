import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { demoDoctors } from "@/lib/booking";
import { ExpertFinder } from "@/components/ExpertFinder";
import { StateBlock } from "@/components/StateBlock";
import { QueryError } from "@/components/QueryError";
import { NoticesSkeleton } from "@/components/motion/Skeletons";

export const instant = false;

export default async function ExpertsPage() {
  const preview =
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Find a specialist</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Search by name or field, then book.</p>
      {preview ? (
        <p role="note" className="mt-3 rounded-2xl border border-dashed border-[var(--warning-fg)] bg-[var(--warning-bg)] p-4 text-sm font-medium text-[var(--warning-fg)]">
          Preview mode — sample doctors below. The live directory loads from the clinic database.
        </p>
      ) : null}
      <div className="mt-4">
        <Suspense fallback={<NoticesSkeleton />}>
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
  const { data, error } = await supabase.rpc("active_doctors");
  if (error) return <QueryError />;
  const doctors = ((data ?? []) as unknown as { id: string; specialty: string; room: string; full_name: string }[]).map((r) => ({
    id: r.id,
    specialty: r.specialty,
    room: r.room,
    bio: "",
    full_name: r.full_name,
  }));
  if (doctors.length === 0) return <StateBlock state="expertsEmpty" href="/book" />;
  return <ExpertFinder doctors={doctors} />;
}
