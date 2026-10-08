import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { demoDoctors, services } from "@/lib/booking";
import { BookingForm } from "@/components/BookingForm";
import { BackButton } from "@/components/BackButton";
import { SlotsSkeleton } from "@/components/motion/Skeletons";
import { QueryError } from "@/components/QueryError";

export const instant = false;

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const preview =
    !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const sp = await searchParams;
  const initialService = typeof sp.service === "string" && (services as readonly string[]).includes(sp.service)
    ? sp.service
    : "General";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <BackButton fallback="/" label="Back" />
        <h1 className="font-display text-2xl font-bold">Book appointment</h1>
      </div>
      <p className="text-sm text-[var(--muted-foreground)]">Clinic hours Mon to Sat, 09:00 to 15:40. Closed Sundays. Pick any day up to 60 days ahead.</p>
      {preview ? (
        <p className="rounded-2xl border border-dashed border-[var(--warning-fg)] bg-[var(--warning-bg)] p-4 text-sm font-medium text-[var(--warning-fg)]">
          Preview mode — sample doctors below. Connect the clinic database to book for real.
        </p>
      ) : null}
      <Suspense fallback={<SlotsSkeleton />}>
        <BookContent initialService={initialService} />
      </Suspense>
    </div>
  );
}

async function BookContent({ initialService }: { initialService: string }) {
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
        <BookingForm doctors={demoDoctors} patientId={null} demoMode initialService={initialService} />
      </>
    );
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("active_doctors");
  if (error) return <QueryError />;

  const doctors = ((rows ?? []) as unknown as { id: string; specialty: string; room: string; full_name: string }[]).map((r) => ({
    id: r.id as string,
    specialty: (r.specialty as string) ?? "General",
    room: (r.room as string) ?? "Clinic 1",
    bio: "",
    full_name: (r.full_name as string) ?? "Doctor",
  }));

  const nextParam = encodeURIComponent(`/book?service=${encodeURIComponent(initialService)}`);
  return (
    <>
      {!user ? (
        <p className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
          You can preview slots now.{" "}
          <Link href={`/login?next=${nextParam}`} className="font-semibold underline">Log in</Link>
          {" or "}
          <Link href="/signup" className="font-semibold underline">create account</Link>
          {" to confirm a real booking."}
        </p>
      ) : null}
      <BookingForm
        doctors={doctors.length > 0 ? doctors : demoDoctors}
        patientId={user?.id ?? null}
        demoMode={doctors.length === 0}
        initialService={initialService}
      />
    </>
  );
}
