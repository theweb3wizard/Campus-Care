"use client";

import { useRouter } from "next/navigation";
import type { PregnancyRecord } from "@/lib/special";
import { PregnancyForm } from "@/components/PregnancyForm";

export function PregnancyClient({ records, isStaff }: { records: PregnancyRecord[]; isStaff: boolean }) {
  const router = useRouter();
  return (
    <div className="flex flex-col gap-4">
      {isStaff ? <PregnancyForm onSaved={() => router.refresh()} /> : null}
      {records.length === 0 ? (
        <p className="text-[var(--muted-foreground)]">
          {isStaff ? "No maternity records yet." : "No maternity record yet. Ask for antenatal care at your next visit."}
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {records.map((r) => (
            <div key={r.id} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <strong>{r.patient_name ?? "My record"} · {r.risk_level} risk</strong>
                <span className="text-[var(--muted-foreground)]">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>
              <p className="mt-1 text-[var(--muted-foreground)]">
                {r.gestational_weeks != null ? `Week ${r.gestational_weeks} · ` : ""}
                {r.edd ? `Due ${r.edd} · ` : ""}
                {r.next_visit ? `Next visit ${r.next_visit}` : "No next visit set"}
              </p>
              {r.notes ? <p className="mt-1">{r.notes}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
