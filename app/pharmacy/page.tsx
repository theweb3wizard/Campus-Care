import { Suspense } from "react";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { PharmacyQueue } from "@/components/PharmacyQueue";
import { MedicineStock } from "@/components/MedicineStock";
import { InboxSkeleton } from "@/components/motion/Skeletons";

export const instant = false;

export default async function PharmacyPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Pharmacy</h1>
      <p className="mt-1 text-sm text-[var(--muted-foreground)]">Prescribed first. Confirm pickup face to face.</p>
      <div className="mt-4">
        <Suspense fallback={<InboxSkeleton />}>
          <PharmacyContent />
        </Suspense>
      </div>
    </div>
  );
}

async function PharmacyContent() {
  await connection();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  if (!configured) return <p className="text-[var(--muted-foreground)]">Connect Supabase to see the queue.</p>;
  const user = await getSessionUser();
  if (!user) return <p className="text-[var(--muted-foreground)]">Staff only. Log in first.</p>;

  const supabase = await createClient();
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const role = (me as { role?: string } | null)?.role;
  if (!role || !["pharmacy", "doctor", "nurse", "admin"].includes(role)) {
    return <p className="text-[var(--muted-foreground)]">Pharmacy staff only.</p>;
  }

  const { data } = await supabase
    .from("prescriptions")
    .select("id,medicine_name,dosage,quantity,instructions,status,patient_id,patient:profiles!prescriptions_patient_id_fkey(full_name)")
    .neq("status", "Cancelled")
    .order("created_at", { ascending: true })
    .limit(100);

  const items = (data ?? []).map((r) => ({
    id: r.id as string,
    medicine_name: r.medicine_name as string,
    dosage: (r.dosage as string) ?? "",
    quantity: (r.quantity as number) ?? 1,
    instructions: (r.instructions as string) ?? "",
    status: r.status as string,
    patient_id: r.patient_id as string,
    patient_name: ((r.patient as unknown as { full_name?: string })?.full_name) ?? "Patient",
    stock_qty: null as number | null,
  }));

  const names = [...new Set(items.map((i) => i.medicine_name))];
  let stock = new Map<string, number>();
  if (names.length > 0) {
    const { data: meds } = await supabase.from("medicines").select("name,stock_qty").in("name", names);
    stock = new Map(((meds ?? []) as { name: string; stock_qty: number }[]).map((m) => [m.name.toLowerCase(), m.stock_qty]));
  }
  const withStock = items.map((i) => ({ ...i, stock_qty: stock.get(i.medicine_name.toLowerCase()) ?? null }));

  const { data: meds } = await supabase
    .from("medicines")
    .select("id,name,stock_qty,unit")
    .order("name")
    .limit(200);

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="font-display text-lg font-semibold">To dispense</h2>
        <div className="mt-2">
          <PharmacyQueue initial={withStock} />
        </div>
      </section>
      <section>
        <h2 className="font-display text-lg font-semibold">Stock</h2>
        <div className="mt-2">
          <MedicineStock initial={(meds ?? []) as { id: string; name: string; stock_qty: number; unit: string }[]} />
        </div>
      </section>
    </div>
  );
}
