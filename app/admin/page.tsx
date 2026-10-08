import { Suspense } from "react";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { StaffManager } from "@/components/StaffManager";
import { RegistryTools } from "@/components/RegistryTools";
import { ClinicSettingsForm } from "@/components/ClinicSettingsForm";
import { InboxSkeleton } from "@/components/motion/Skeletons";
import { QueryError } from "@/components/QueryError";
import Link from "next/link";

export const instant = false;

export default async function AdminPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Staff management</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Admin only. Set roles and decide which doctors patients can book.</p>
      <div className="mt-4">
        <Suspense fallback={<InboxSkeleton />}>
          <AdminContent />
        </Suspense>
      </div>
    </div>
  );
}

async function AdminContent() {
  await connection();
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  if (!configured) return <p className="text-[var(--muted-foreground)]">Connect Supabase first.</p>;
  const user = await getSessionUser();
  if (!user) return <p className="text-[var(--muted-foreground)]">Admin only. Log in first.</p>;
  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if ((me as { role?: string } | null)?.role !== "admin") {
    return <p className="text-[var(--muted-foreground)]">Admin only. Ask an admin to grant you access.</p>;
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id,full_name,card_number,role")
    .order("full_name")
    .limit(200);
  if (profilesError) return <QueryError />;
  const { data: doctors, error: doctorsError } = await supabase.from("doctors").select("id,specialty,room,is_active");
  if (doctorsError) return <QueryError />;
  const docMap = new Map(((doctors ?? []) as { id: string; specialty: string; room: string; is_active: boolean }[]).map((d) => [d.id, d]));

  const rows = ((profiles ?? []) as { id: string; full_name: string; card_number: string | null; role: string }[]).map((p) => ({
    ...p,
    doctor: docMap.get(p.id) ?? null,
  }));

  const { data: setting, error: settingError } = await supabase.from("clinic_settings").select("value").eq("key", "allow_open_signup").single();
  if (settingError) return <QueryError />;
  const openSignup = (setting as { value?: string } | null)?.value !== "false";

  const { data: allSettings, error: allSettingsError } = await supabase.from("clinic_settings").select("key,value");
  if (allSettingsError) return <QueryError />;
  const settingsMap: Record<string, string> = {};
  for (const s of (allSettings ?? []) as { key: string; value: string }[]) settingsMap[s.key] = s.value;

  return (
    <div className="flex flex-col gap-6">
      <p>
        <Link href="/admin/audit" className="inline-flex min-h-[44px] items-center text-sm font-semibold underline">Open audit log</Link>
      </p>
      <ClinicSettingsForm initial={settingsMap} />
      <RegistryTools openSignup={openSignup} />
      <div>
        <h2 className="font-display text-lg font-semibold">Roles and doctors</h2>
        <div className="mt-2">
          <StaffManager initial={rows} />
        </div>
      </div>
    </div>
  );
}
