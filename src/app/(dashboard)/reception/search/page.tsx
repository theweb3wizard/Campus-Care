import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { Card } from '@/components/ui/card';
import { PatientSearchWrapper } from '@/features/reception/components/patient-search-wrapper';

export const metadata: Metadata = { title: 'Patient Search' };

export default async function ReceptionSearchPage() {
  await requireRole('receptionist', 'admin');

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-7">
        <h1 className="text-heading-2">Patient Search</h1>
        <p className="text-body mt-1">
          Search by name, registration number, or institutional email.
        </p>
      </div>

      <Card>
        <PatientSearchWrapper />
      </Card>
    </div>
  );
}
