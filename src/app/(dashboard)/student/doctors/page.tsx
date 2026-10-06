import type { Metadata } from 'next';
import { requireAuth } from '@/features/auth/actions';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { Stethoscope } from 'lucide-react';

export const metadata: Metadata = { title: 'Find a Doctor' };

export default async function StudentDoctorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAuth();
  const { q } = await searchParams;
  const query = (q ?? '').trim().slice(0, 40).toLowerCase();
  const supabase = await createClient();

  const { data } = await supabase.from('doctor_directory').select('*');
  const all = (data ?? []) as { full_name: string; specialization: string | null; department: string | null }[];
  const doctors = query
    ? all.filter((d) =>
        `${d.full_name} ${d.specialization ?? ''} ${d.department ?? ''}`.toLowerCase().includes(query)
      )
    : all;

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-heading-2">Find a Doctor</h1>
        <p className="text-body mt-1">Search by name or specialty. Reception will book you in.</p>
      </div>

      <form action="/student/doctors" method="get">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="e.g. eye, skin, general…"
          autoComplete="off"
          className="input-base w-full py-2.5 text-sm"
        />
      </form>

      {doctors.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Stethoscope className="h-7 w-7" />}
            title="No doctors found"
            description={query ? 'Try a different search.' : 'No doctors listed yet. Ask reception.'}
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {doctors.map((d) => (
            <Card key={d.full_name} padding="sm">
              <p className="text-sm font-semibold text-slate-800">{d.full_name}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {[d.specialization, d.department].filter(Boolean).join(' · ') || 'General practice'}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
