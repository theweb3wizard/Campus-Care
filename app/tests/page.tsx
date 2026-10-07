import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { canViewResult, type TestOrder } from "@/lib/clinical";
import { StatusPill } from "@/components/StatusPill";
import { TestsSkeleton } from "@/components/motion/Skeletons";

export const instant = false;

export default async function TestsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Tests</h1>
      <div className="mt-4">
        <Suspense fallback={<TestsSkeleton />}>
          <TestsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function TestsContent() {
  await connection();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!configured) {
    return <p className="mt-2 text-[var(--muted-foreground)]">No test ordered. Ask your doctor during visit.</p>;
  }
  const user = await getSessionUser();
  if (!user) {
    return (
      <p className="mt-2 text-[var(--muted-foreground)]">
        <Link href="/login" className="font-semibold underline">Log in</Link> to see your tests.
      </p>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("test_orders")
    .select("id,test_name,status,result_text,is_released,release_note,created_at")
    .eq("patient_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const tests = (data ?? []) as TestOrder[];
  if (tests.length === 0) {
    return <p className="mt-2 text-[var(--muted-foreground)]">No test ordered. Ask your doctor during visit.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {tests.map((t) => (
        <div key={t.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <strong>{t.test_name}</strong>
            <StatusPill status={t.status} />
          </div>
          {canViewResult(t) ? (
            <div className="mt-2 text-sm">
              <p><span className="font-semibold">Result:</span> {t.result_text || "—"}</p>
              {t.release_note ? (
                <p className="mt-1 text-[var(--muted-foreground)]">{t.release_note}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              {t.status === "Ready"
                ? "Your result is ready — come to the clinic to discuss it with your doctor."
                : "Not ready yet. We will tell you when ready. No need to queue."}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
