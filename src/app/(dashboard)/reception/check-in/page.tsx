import type { Metadata } from 'next';
import { requireRole } from '@/features/auth/actions';
import { getStudentByRegNumber } from '@/features/reception/actions';
import { Card } from '@/components/ui/card';
import { CheckInPanel } from '@/features/reception/components/check-in-panel';
import { PatientSearchWrapper } from '@/features/reception/components/patient-search-wrapper';

export const metadata: Metadata = { title: 'Walk-in Check-in' };

interface Props {
  searchParams: Promise<{ student?: string }>;
}

export default async function WalkInCheckInPage({ searchParams }: Props) {
  await requireRole('receptionist', 'admin');
  const { student: regNumber } = await searchParams;

  // If a reg number was passed via URL, pre-load that student
  const preloaded = regNumber
    ? await getStudentByRegNumber(regNumber)
    : null;

  return (
    <div className="p-6 max-w-xl">
      <div className="mb-7">
        <h1 className="text-heading-2">Walk-in Check-in</h1>
        <p className="text-body mt-1">
          Search for a patient and check them into today&apos;s queue.
        </p>
      </div>

      <Card>
        {preloaded ? (
          <CheckInPanel
            result={preloaded}
            onReset={() => {}}
          />
        ) : (
          <PatientSearchWrapper />
        )}
      </Card>
    </div>
  );
}
