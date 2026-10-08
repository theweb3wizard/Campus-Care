import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { ProfileForm } from "@/components/ProfileForm";
import { StatusPill } from "@/components/StatusPill";
import { InboxSkeleton } from "@/components/motion/Skeletons";
import { QueryError } from "@/components/QueryError";

export const instant = false;

export default async function ProfilePage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Profile</h1>
      <Suspense fallback={<InboxSkeleton />}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}

async function ProfileContent() {
  await connection();
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <p className="font-medium">Supabase not connected yet.</p>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Copy <code>.env.example</code> to <code>.env.local</code>, add URL + anon key, then run
          migrations <code>0001 → 0007</code> plus <code>seed.sql</code> in Supabase SQL Editor. Then log in.
        </p>
        <p className="mt-3 text-sm">
          <Link href="/login" className="font-semibold underline">Go to login</Link>
          {" · "}
          <Link href="/signup" className="font-semibold underline">Create account</Link>
        </p>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return (
      <>
        <p className="mt-2 text-[var(--muted-foreground)]">Log in with your student ID or staff ID.</p>
        <p className="mt-3 text-sm">
          <Link href="/login" className="font-semibold underline">Log in</Link>
          {" · "}
          <Link href="/signup" className="font-semibold underline">Create account</Link>
        </p>
      </>
    );
  }

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (profileError) return <QueryError />;
  if (!profile) {
    return <p className="mt-2">Account found but no profile row. Log out and log in again.</p>;
  }

  const p = profile as {
    id: string; login_id: string; role: string; full_name: string;
    card_number: string | null; phone: string | null; verified: boolean;
  };

  const [{ data: student }, { data: file }] = await Promise.all([
    supabase.from("students").select("reg_number,faculty,department").eq("profile_id", user.id).single(),
    supabase.from("clinic_files").select("file_number").eq("profile_id", user.id).single(),
  ]);
  const s = student as { reg_number: string; faculty: string | null; department: string | null } | null;
  const f = file as { file_number: string } | null;

  return (
    <>
      {!p.verified && p.role === "patient" ? (
        <p className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          <strong>Not verified yet.</strong> Come to reception with your ID card. Booking still works.
        </p>
      ) : null}
      <dl className="mt-3 grid gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm md:grid-cols-2">
        <div><dt className="text-[var(--muted-foreground)]">Login ID</dt><dd className="font-semibold">{p.login_id}</dd></div>
        <div><dt className="text-[var(--muted-foreground)]">Role</dt><dd><StatusPill status={p.role} /></dd></div>
        <div><dt className="text-[var(--muted-foreground)]">Card number</dt><dd className="font-semibold">{p.card_number ?? "To be issued at clinic"}</dd></div>
        <div><dt className="text-[var(--muted-foreground)]">Clinic file</dt><dd className="font-semibold">{f?.file_number ?? "Opens at first visit"}</dd></div>
        {s ? (
          <>
            <div><dt className="text-[var(--muted-foreground)]">Faculty</dt><dd>{s.faculty ?? "—"}</dd></div>
            <div><dt className="text-[var(--muted-foreground)]">Department</dt><dd>{s.department ?? "—"}</dd></div>
          </>
        ) : null}
      </dl>
      {p.role === "patient" ? null : (
        <StaffLinks role={p.role} />
      )}
      {p.role === "patient" ? <PatientLinks /> : null}
      <ProfileForm initial={{ id: p.id, login_id: p.login_id, role: p.role, full_name: p.full_name, card_number: p.card_number, phone: p.phone, verified: p.verified }} />
    </>
  );
}

function StaffLinks({ role }: { role: string }) {
  return (
    <nav aria-label="Staff" className="mt-4 flex flex-wrap gap-2 text-sm font-semibold">
      <Link href="/doctor" className="flex min-h-[44px] items-center rounded-full border border-[var(--border)] px-4">Queue</Link>
      <Link href="/reception" className="flex min-h-[44px] items-center rounded-full border border-[var(--border)] px-4">Reception</Link>
      <Link href="/lab" className="flex min-h-[44px] items-center rounded-full border border-[var(--border)] px-4">Lab</Link>
      <Link href="/pharmacy" className="flex min-h-[44px] items-center rounded-full border border-[var(--border)] px-4">Pharmacy</Link>
      <Link href="/emergency/requests" className="flex min-h-[44px] items-center rounded-full border border-[var(--border)] px-4">Emergencies</Link>
      <Link href="/reports" className="flex min-h-[44px] items-center rounded-full border border-[var(--border)] px-4">Reports</Link>
      {role === "admin" ? (
        <Link href="/admin" className="flex min-h-[44px] items-center rounded-full border border-[var(--border)] px-4">Staff</Link>
      ) : null}
      <Link href="/notifications" className="flex min-h-[44px] items-center rounded-full border border-[var(--border)] px-4">Alerts</Link>
    </nav>
  );
}

function PatientLinks() {
  return (
    <p className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
      <Link href="/reports" className="inline-flex min-h-[44px] items-center font-semibold underline">My reports</Link>
      <Link href="/pregnancy" className="inline-flex min-h-[44px] items-center font-semibold underline">Pregnancy care</Link>
      <Link href="/experts" className="inline-flex min-h-[44px] items-center font-semibold underline">Find a specialist</Link>
      <Link href="/questionnaire" className="inline-flex min-h-[44px] items-center font-semibold underline">Health questions</Link>
      <Link href="/notifications" className="inline-flex min-h-[44px] items-center font-semibold underline">Alerts</Link>
    </p>
  );
}
