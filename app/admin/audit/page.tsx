import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { NoticesSkeleton } from "@/components/motion/Skeletons";
import { QueryError } from "@/components/QueryError";
import { StaffGate, StaffNav } from "@/components/StaffNav";

export const instant = false;

export default async function AuditPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Audit log</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Who did what. Newest first. Written by the system only.</p>
      <div className="mt-4">
        <Suspense fallback={<NoticesSkeleton />}>
          <AuditContent />
        </Suspense>
      </div>
    </div>
  );
}

async function AuditContent() {
  await connection();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return <p className="text-[var(--muted-foreground)]">Connect Supabase first.</p>;
  const user = await getSessionUser();
  if (!user) return <StaffGate message="Audit log is admin only. Log in first." loginNext="/admin/audit" />;
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((me as { role?: string } | null)?.role !== "admin") {
    return <StaffGate message="Audit log is admin only." loginNext="/admin/audit" />;
  }
  const { data, error: listError } = await supabase
    .from("audit_logs")
    .select("id,action,resource_type,resource_id,created_at,profiles!audit_logs_profile_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (listError) return <QueryError />;
  const rows = (data ?? []) as unknown as { id: string; action: string; resource_type: string; resource_id: string; created_at: string; profiles: { full_name: string } | null }[];
  if (rows.length === 0) return (
    <div>
      <p role="status" className="text-[var(--muted-foreground)]">Empty. Actions appear here as staff work.</p>
      <p className="mt-3 text-sm"><Link href="/admin" className="font-semibold underline">Back to admin</Link></p>
    </div>
  );
  return (
    <>
    <StaffNav role="admin" />
    <p className="mt-4 text-sm"><Link href="/admin" className="inline-flex min-h-[44px] items-center font-semibold underline">Back to admin</Link></p>
    <ul className="mt-2 flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
          <strong>{r.action}</strong>
          <span className="text-[var(--muted-foreground)]"> · {r.profiles?.full_name ?? "system"} · {new Date(r.created_at).toLocaleString("en-GB")}</span>
          {r.resource_type ? <span className="block text-[var(--muted-foreground)]">{r.resource_type} {r.resource_id}</span> : null}
        </li>
      ))}
    </ul>
    </>
  );
}
