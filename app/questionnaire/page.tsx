import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { QuestionnaireForm } from "@/components/QuestionnaireForm";

export const instant = false;

export default async function QuestionnairePage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Health questions</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Answer before your visit so the doctor is ready.</p>
      <div className="mt-4">
        <Suspense fallback={<p className="text-[var(--muted-foreground)]">Loading…</p>}>
          <QuestionnaireContent />
        </Suspense>
      </div>
    </div>
  );
}

async function QuestionnaireContent() {
  await connection();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return <p className="text-[var(--muted-foreground)]">Connect Supabase to answer.</p>;
  const user = await getSessionUser();
  if (!user) {
    return (
      <p className="text-[var(--muted-foreground)]">
        <Link href="/login" className="font-semibold underline">Log in</Link> to answer.
      </p>
    );
  }
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role ?? "patient";

  if (["doctor", "nurse", "receptionist", "admin"].includes(role)) {
    const { data } = await supabase
      .from("questionnaire_responses")
      .select("id,answers,created_at,profiles!inner(full_name)")
      .order("created_at", { ascending: false })
      .limit(30);
    const rows = (data ?? []) as unknown as { id: string; answers: Record<string, string>; created_at: string; profiles: { full_name: string } }[];
    if (rows.length === 0) return <p className="text-[var(--muted-foreground)]">No answers yet.</p>;
    return (
      <div className="flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
            <strong>{r.profiles.full_name}</strong>
            <span className="text-[var(--muted-foreground)]"> · {new Date(r.created_at).toLocaleString("en-GB")}</span>
            <dl className="mt-2 flex flex-col gap-1">
              {Object.entries(r.answers).map(([k, v]) => (
                <div key={k}><dt className="font-medium">{k}</dt><dd className="text-[var(--muted-foreground)]">{v || "—"}</dd></div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    );
  }

  return <QuestionnaireForm patientId={user.id} />;
}
