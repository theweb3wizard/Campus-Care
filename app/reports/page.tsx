import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import type { Report } from "@/lib/clinical";
import { StateBlock } from "@/components/StateBlock";

export const instant = false;

export default async function ReportsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Reports</h1>
      <div className="mt-4">
        <Suspense fallback={<p className="text-[var(--muted-foreground)]">Loading reports…</p>}>
          <ReportsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function ReportsContent() {
  await connection();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!configured) return <p className="text-[var(--muted-foreground)]">Your visit summaries appear here.</p>;
  const user = await getSessionUser();
  if (!user) {
    return (
      <p className="text-[var(--muted-foreground)]">
        <Link href="/login" className="font-semibold underline">Log in</Link> to see your reports.
      </p>
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("reports")
    .select("id,appointment_id,diagnosis,treatment,follow_up_date,created_at")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const reports = (data ?? []) as Report[];
  if (reports.length === 0) return <StateBlock state="reportsEmpty" href="/book" />;

  return (
    <div className="flex flex-col gap-3">
      {reports.map((r) => (
        <div key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            {r.follow_up_date ? ` · Follow-up ${r.follow_up_date}` : ""}
          </p>
          <p className="mt-1 text-sm"><span className="font-semibold">Diagnosis:</span> {r.diagnosis || "—"}</p>
          <p className="mt-1 text-sm"><span className="font-semibold">Treatment:</span> {r.treatment || "—"}</p>
        </div>
      ))}
    </div>
  );
}
