import type { Metadata } from 'next';
import { getMyPregnancy } from '@/features/maternity/actions';
import { PregnancyRegisterForm } from '@/features/maternity/components/pregnancy-register-form';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Pregnancy Record' };

export default async function StudentPregnancyPage() {
  const record = await getMyPregnancy();

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div>
        <h1 className="text-heading-2">Pregnancy Record</h1>
        <p className="text-body mt-1">Private antenatal record. Optional.</p>
      </div>

      <Card>
        {record ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-slate-800">Active record</p>
            <p className="text-sm text-slate-600">
              Expected delivery: <strong>{formatDate(record.edd)}</strong>
            </p>
            {record.notes && <p className="text-sm text-slate-500">{record.notes}</p>}
            <p className="text-xs text-slate-400 pt-1">
              Show this to the doctor at your visit. They will close it after delivery.
            </p>
          </div>
        ) : (
          <PregnancyRegisterForm />
        )}
      </Card>
    </div>
  );
}
