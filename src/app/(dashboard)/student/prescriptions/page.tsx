import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatusBadge } from '@/components/ui/badge';
import { Pill } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PRESCRIPTION_STATUS_LABELS, PRESCRIPTION_STATUS_COLORS } from '@/lib/constants';
import type { PrescriptionStatus } from '@/types/database';

export const metadata: Metadata = { title: 'My Prescriptions' };

export default async function StudentPrescriptionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get clinic profile to query prescriptions
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  const { data: clinicProfile } = student
    ? await supabase
        .from('clinic_profiles')
        .select('id')
        .eq('student_id', student.id)
        .single()
    : { data: null };

  const prescriptions = clinicProfile
    ? await supabase
        .from('prescriptions')
        .select(`
          id, status, created_at, notes,
          prescription_items (
            id, dosage, frequency, duration, quantity_prescribed, quantity_dispensed, status,
            medications ( name, unit )
          )
        `)
        .eq('clinic_profile_id', clinicProfile.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => data ?? [])
    : [];

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-heading-2">My Prescriptions</h1>
        <p className="text-body mt-1">Prescriptions from your clinic visits.</p>
      </div>

      {prescriptions.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Pill className="h-8 w-8" />}
            title="No prescriptions"
            description="Prescriptions from your doctor will appear here after your visits."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx: any) => (
            <Card key={rx.id}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Prescription
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(rx.created_at)}
                  </p>
                </div>
                <StatusBadge
                  label={PRESCRIPTION_STATUS_LABELS[rx.status as PrescriptionStatus]}
                  colorClass={PRESCRIPTION_STATUS_COLORS[rx.status as PrescriptionStatus]}
                />
              </div>

              {rx.prescription_items?.length > 0 && (
                <div className="space-y-2">
                  {rx.prescription_items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between py-2 border-t border-slate-50"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {item.medications?.name ?? 'Unknown medication'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {item.dosage} · {item.frequency}
                          {item.duration ? ` · ${item.duration}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-4">
                        <p className="text-xs text-slate-400">
                          {item.quantity_dispensed}/{item.quantity_prescribed}{' '}
                          {item.medications?.unit ?? ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
