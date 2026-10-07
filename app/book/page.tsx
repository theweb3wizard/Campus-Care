import { Suspense } from "react";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { demoDoctors } from "@/lib/booking";
import { BookingForm } from "@/components/BookingForm";
import { SlotsSkeleton } from "@/components/motion/Skeletons";

export const instant = false;

export default async function BookPage() {
  const preview =
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-2xl font-bold">Book appointment</h1>
      {preview ? (
        <p role="note" className="rounded-2xl border border-dashed border-[var(--warning-fg)] bg-[var(--warning-bg)] p-4 text-sm font-medium text-[var(--warning-fg)]">
          Preview mode — sample doctors below. Connect the clinic database to book for real.
        </p>
      ) : null}
      <Suspense fallback={<SlotsSkeleton />}>
        <BookContent />
      </Suspense>
    </div>
  );
}

async function BookContent() {
  await connection();
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const user = await getSessionUser();

  if (!configured) {
    return (
      <>
        <p className="text-sm text-[var(--muted-foreground)]">
          Sample data only. Bookings save once Supabase is connected.
        </p>
        <BookingForm doctors={demoDoctors} patientId={null} demoMode />
      </>
    );
  }

  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("active_doctors");

  const doctors = ((rows ?? []) as unknown as { id: string; specialty: string; room: string; full_name: string }[]).map((r) => ({
    id: r.id as string,
    specialty: (r.specialty as string) ?? "General",
    room: (r.room as string) ?? "Clinic 1",
    bio: "",
    full_name: (r.full_name as string) ?? "Doctor",
  }));

  return (
    <>
      {!user ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          You can preview slots now. Log in to confirm a real booking.
        </p>
      ) : null}
      <BookingForm
        doctors={doctors.length > 0 ? doctors : demoDoctors}
        patientId={user?.id ?? null}
        demoMode={doctors.length === 0}
      />
    </>
  );
}
