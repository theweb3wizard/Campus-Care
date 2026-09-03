import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/features/auth/actions';
import { getPrescriptionDetail } from '@/features/prescriptions/actions';
import { DispensePanel } from '@/features/pharmacy/components/dispense-panel';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { PRESCRIPTION_STATUS_LABELS, PRESCRIPTION_STATUS_COLORS } from '@/lib/constants';
import { formatDateTime } from '@/lib/utils';
import type { PrescriptionStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Dispense Prescription' };
export const revalidate = 0;

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PrescriptionDetailPage({ params }: Props) {
  await requireRole('pharmacist', 'admin');
  const { id } = await params;

  const prescription = await getPrescriptionDetail(id);
  if (!prescription) redirect('/pharmacy/prescriptions');

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      {/* Back */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/pharmacy/prescriptions">
          <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
            All prescriptions
          </Button>
        </Link>
        <div className="h-4 w-px bg-slate-200" />
        <StatusBadge
          label={PRESCRIPTION_STATUS_LABELS[prescription.status as PrescriptionStatus]}
          colorClass={PRESCRIPTION_STATUS_COLORS[prescription.status as PrescriptionStatus]}
        />
      </div>

      {/* Patient header */}
      <Card className="mb-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              {prescription.patient.full_name}
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <code className="text-xs text-slate-500 font-mono">
                {prescription.patient.registration_number}
              </code>
              <span className="text-slate-300">·</span>
              <code className="text-xs text-slate-500 font-mono">
                {prescription.patient.file_number}
              </code>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Prescribed by Dr. {prescription.doctor_name} ·{' '}
              {formatDateTime(prescription.created_at)}
            </p>
            {prescription.notes && (
              <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  <strong>Note from doctor:</strong> {prescription.notes}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Dispensing */}
      <Card>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">
          Medications to dispense
        </h2>
        <DispensePanel prescription={prescription} />
      </Card>
    </div>
  );
}
