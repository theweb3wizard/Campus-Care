import type { Metadata } from 'next';
import Link from 'next/link';
import { requireRole } from '@/features/auth/actions';
import { getPendingPrescriptions } from '@/features/prescriptions/actions';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/empty-state';
import { QueueSubscriber } from '@/components/realtime/queue-subscriber';
import { PRESCRIPTION_STATUS_LABELS, PRESCRIPTION_STATUS_COLORS } from '@/lib/constants';
import { formatDateTime, formatQueueNumber } from '@/lib/utils';
import { Pill, ChevronRight } from 'lucide-react';
import type { PrescriptionStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Prescriptions' };
export const revalidate = 0;

export default async function PharmacyPrescriptionsPage() {
  await requireRole('pharmacist', 'admin');
  const prescriptions = await getPendingPrescriptions();

  return (
    <div className="p-4 sm:p-6">
      {/* Realtime — prescriptions appear as soon as doctor sends */}
      <QueueSubscriber channel="pharmacy-prescriptions" />

      <div className="mb-7">
        <h1 className="text-heading-2">Prescriptions</h1>
        <p className="text-body mt-1">
          {prescriptions.length} prescription{prescriptions.length !== 1 ? 's' : ''} pending dispensing.
        </p>
      </div>

      <Card padding="none">
        {prescriptions.length === 0 ? (
          <EmptyState
            icon={<Pill className="h-8 w-8" />}
            title="No pending prescriptions"
            description="Prescriptions will appear here as soon as a doctor sends them."
          />
        ) : (
          <div className="divide-y divide-slate-50">
            {prescriptions.map((rx) => (
              <Link
                key={rx.id}
                href={`/pharmacy/prescriptions/${rx.id}`}
                className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
              >
                {/* Patient info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">
                      {rx.patient.full_name}
                    </p>
                    <code className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                      {rx.patient.registration_number}
                    </code>
                    <code className="text-xs text-slate-500 font-mono">
                      {rx.patient.file_number}
                    </code>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Dr. {rx.doctor_name} · {formatDateTime(rx.created_at)} ·{' '}
                    {rx.items.length} item{rx.items.length !== 1 ? 's' : ''}
                  </p>
                  {/* Item names preview */}
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {rx.items.map((i) => i.medication_name).join(', ')}
                  </p>
                </div>

                {/* Status + chevron */}
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge
                    label={PRESCRIPTION_STATUS_LABELS[rx.status as PrescriptionStatus]}
                    colorClass={PRESCRIPTION_STATUS_COLORS[rx.status as PrescriptionStatus]}
                  />
                  <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
