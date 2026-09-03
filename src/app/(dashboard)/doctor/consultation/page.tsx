import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { requireRole } from '@/features/auth/actions';
import { getVisitDetail, getPatientHistory } from '@/features/doctor/actions';
import { getMedications, getPrescriptionByVisit } from '@/features/prescriptions/actions';
import { ConsultationForm } from '@/features/doctor/components/consultation-form';
import { PatientSummary } from '@/features/doctor/components/patient-summary';
import { PrescriptionComposer } from '@/features/prescriptions/components/prescription-composer';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { VISIT_STATUS_LABELS, VISIT_STATUS_COLORS } from '@/lib/constants';
import type { VisitStatus } from '@/types/database';

export const metadata: Metadata = { title: 'Consultation' };
export const revalidate = 0;

interface Props {
  searchParams: Promise<{ visit?: string }>;
}

export default async function ConsultationPage({ searchParams }: Props) {
  await requireRole('doctor', 'admin');
  const { visit: visitId } = await searchParams;

  if (!visitId) redirect('/doctor/queue');

  const [visitDetail, medications, existingPrescription] = await Promise.all([
    getVisitDetail(visitId),
    getMedications(),
    getPrescriptionByVisit(visitId),
  ]);

  if (!visitDetail) redirect('/doctor/queue');

  const clinicProfileId = visitDetail.clinic_profiles?.id;
  const patientHistory = clinicProfileId
    ? await getPatientHistory(clinicProfileId)
    : [];

  const queueEntry = visitDetail.queue_entries?.[0];
  const medicalRecord = visitDetail.medical_records?.[0] ?? null;
  const student = visitDetail.students;
  const cp = visitDetail.clinic_profiles;

  // Map existing prescription items for the composer
  const existingItems = existingPrescription?.prescription_items?.map((item: any) => ({
    id: item.id,
    medication_name: item.medications?.name ?? '—',
    medication_unit: item.medications?.unit ?? 'units',
    dosage: item.dosage,
    frequency: item.frequency,
    duration: item.duration,
    instructions: item.instructions,
    quantity_prescribed: item.quantity_prescribed,
    quantity_dispensed: item.quantity_dispensed,
    status: item.status,
  })) ?? [];

  return (
    <div className="p-4 md:p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/doctor/queue">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to queue
            </Button>
          </Link>
          <div className="h-4 w-px bg-slate-200" />
          <StatusBadge
            label={VISIT_STATUS_LABELS[visitDetail.status as VisitStatus]}
            colorClass={VISIT_STATUS_COLORS[visitDetail.status as VisitStatus]}
          />
        </div>
      </div>

      {/* Three-column layout on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Patient summary */}
        <div className="lg:col-span-1 space-y-5">
          <PatientSummary
            patient={{
              full_name: student?.full_name ?? '—',
              registration_number: student?.registration_number ?? '—',
              department: student?.department ?? null,
              gender: student?.gender ?? null,
              date_of_birth: student?.date_of_birth ?? null,
              file_number: cp?.file_number ?? '—',
              blood_group: cp?.blood_group ?? null,
              genotype: cp?.genotype ?? null,
              allergies: cp?.allergies ?? null,
            }}
            history={patientHistory}
          />
        </div>

        {/* Right: Consultation + Prescription */}
        <div className="lg:col-span-2 space-y-5">
          {/* Consultation notes */}
          <Card>
            <h2 className="text-base font-semibold text-slate-800 mb-5">
              Consultation notes
            </h2>
            <ConsultationForm
              visitId={visitId}
              queueEntryId={queueEntry?.id ?? ''}
              existing={medicalRecord}
            />
          </Card>

          {/* Prescription composer */}
          <Card>
            <PrescriptionComposer
              visitId={visitId}
              clinicProfileId={clinicProfileId ?? ''}
              queueEntryId={queueEntry?.id ?? ''}
              medications={medications}
              existingPrescriptionId={existingPrescription?.id ?? null}
              existingItems={existingItems}
              existingStatus={existingPrescription?.status}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
